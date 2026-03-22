import OpenAI from 'openai';
import { db, connection, knowledgeDocuments, knowledgeChunks } from '@secretaria/db';
import { eq, and, desc } from 'drizzle-orm';
import { env } from '../lib/env.js';
import { AppError } from '../lib/errors.js';
import { addToKnowledgeQueue } from '../workers/setup.js';

const openai = new OpenAI({ apiKey: env.OPENAI_API_KEY });

const CHUNK_MAX_CHARS = 2000;
const CHUNK_OVERLAP_CHARS = 200;
const EMBEDDING_BATCH_SIZE = 5;

// ---------------------------------------------------------------------------
// Embedding generation
// ---------------------------------------------------------------------------

async function generateEmbedding(text: string): Promise<number[]> {
  const response = await openai.embeddings.create({
    model: 'text-embedding-3-small',
    input: text.replace(/\n/g, ' ').trim(),
  });
  return response.data[0].embedding;
}

// ---------------------------------------------------------------------------
// Text chunking — split by paragraphs/sentences, max ~2000 chars with overlap
// ---------------------------------------------------------------------------

function chunkText(text: string): string[] {
  const paragraphs = text.split(/\n{2,}/);
  const chunks: string[] = [];
  let currentChunk = '';

  for (const paragraph of paragraphs) {
    const trimmed = paragraph.trim();
    if (!trimmed) continue;

    // Se um paragrafo excede o max, dividir por sentencas
    if (trimmed.length > CHUNK_MAX_CHARS) {
      // Flush chunk atual primeiro
      if (currentChunk.trim()) {
        chunks.push(currentChunk.trim());
        currentChunk = '';
      }

      const sentences = trimmed.split(/(?<=[.!?])\s+/);
      let sentenceChunk = '';
      for (const sentence of sentences) {
        if ((sentenceChunk + ' ' + sentence).length > CHUNK_MAX_CHARS && sentenceChunk) {
          chunks.push(sentenceChunk.trim());
          // Overlap: manter a porcao final
          const overlapStart = Math.max(0, sentenceChunk.length - CHUNK_OVERLAP_CHARS);
          sentenceChunk = sentenceChunk.slice(overlapStart).trim() + ' ' + sentence;
        } else {
          sentenceChunk = sentenceChunk ? sentenceChunk + ' ' + sentence : sentence;
        }
      }
      if (sentenceChunk.trim()) {
        currentChunk = sentenceChunk.trim();
      }
      continue;
    }

    // Se adicionar este paragrafo excede o max, flush
    if ((currentChunk + '\n\n' + trimmed).length > CHUNK_MAX_CHARS && currentChunk) {
      chunks.push(currentChunk.trim());
      // Overlap: manter a porcao final do chunk atual
      const overlapStart = Math.max(0, currentChunk.length - CHUNK_OVERLAP_CHARS);
      currentChunk = currentChunk.slice(overlapStart).trim() + '\n\n' + trimmed;
    } else {
      currentChunk = currentChunk ? currentChunk + '\n\n' + trimmed : trimmed;
    }
  }

  // Flush restante
  if (currentChunk.trim()) {
    chunks.push(currentChunk.trim());
  }

  return chunks;
}

// ---------------------------------------------------------------------------
// Upload document — cria registro e despacha processamento (async ou sincrono)
// ---------------------------------------------------------------------------

export async function uploadDocument(
  clinicId: string,
  fileName: string,
  fileSize: number,
  textContent: string,
) {
  if (!textContent.trim()) {
    throw new AppError('EMPTY_CONTENT', 'O conteudo do documento esta vazio', 400);
  }

  // Criar registro do documento com status "processing"
  const [doc] = await db.insert(knowledgeDocuments).values({
    clinicId,
    fileName,
    fileSize,
    status: 'processing',
  }).returning();

  // Tentar despachar para fila async (BullMQ via Redis)
  const queued = await addToKnowledgeQueue('process-embeddings', {
    clinicId,
    documentId: doc.id,
    textContent,
  });

  if (!queued) {
    // Fallback sincrono — Redis indisponivel, processa inline (mesmo comportamento anterior)
    console.log(`[Knowledge] Redis indisponivel — processando documento ${doc.id} de forma sincrona`);
    try {
      await processDocumentEmbeddings(clinicId, doc.id, textContent);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Erro desconhecido';
      throw new AppError('PROCESSING_ERROR', `Erro ao processar documento: ${errorMessage}`, 500);
    }
  }

  // Retornar documento imediatamente (status 'processing' se async, 'ready' se sincrono)
  const [current] = await db
    .select()
    .from(knowledgeDocuments)
    .where(and(
      eq(knowledgeDocuments.id, doc.id),
      eq(knowledgeDocuments.clinicId, clinicId),
    ))
    .limit(1);

  return current;
}

// ---------------------------------------------------------------------------
// Processamento de embeddings — chamado pelo worker (async) ou inline (fallback)
// ---------------------------------------------------------------------------

export async function processDocumentEmbeddings(
  clinicId: string,
  documentId: string,
  textContent: string,
) {
  try {
    // Dividir texto em chunks
    const chunks = chunkText(textContent);

    if (chunks.length === 0) {
      throw new Error('Nenhum trecho extraido do documento');
    }

    // Gerar embeddings em lotes de EMBEDDING_BATCH_SIZE para paralelizar chamadas OpenAI
    for (let i = 0; i < chunks.length; i += EMBEDDING_BATCH_SIZE) {
      const batch = chunks.slice(i, i + EMBEDDING_BATCH_SIZE);
      const embeddings = await Promise.all(batch.map((chunk) => generateEmbedding(chunk)));

      // Inserir chunks do lote no banco
      for (let j = 0; j < batch.length; j++) {
        await db.insert(knowledgeChunks).values({
          clinicId,
          documentId,
          content: batch[j],
          chunkIndex: i + j,
          embedding: embeddings[j],
        });
      }
    }

    // Atualizar status do documento para 'ready'
    await db
      .update(knowledgeDocuments)
      .set({
        status: 'ready',
        chunkCount: chunks.length,
        updatedAt: new Date(),
      })
      .where(and(
        eq(knowledgeDocuments.id, documentId),
        eq(knowledgeDocuments.clinicId, clinicId),
      ));

    console.log(`[Knowledge] Documento ${documentId} processado: ${chunks.length} chunks`);
  } catch (err) {
    // Marcar documento como erro
    const errorMessage = err instanceof Error ? err.message : 'Erro desconhecido';
    await db
      .update(knowledgeDocuments)
      .set({
        status: 'error',
        errorMessage,
        updatedAt: new Date(),
      })
      .where(and(
        eq(knowledgeDocuments.id, documentId),
        eq(knowledgeDocuments.clinicId, clinicId),
      ));

    console.error(`[Knowledge] Erro ao processar documento ${documentId}:`, errorMessage);
    throw err;
  }
}

// ---------------------------------------------------------------------------
// Delete document and all its chunks (cascade handled by FK, but explicit)
// ---------------------------------------------------------------------------

export async function deleteDocument(clinicId: string, documentId: string) {
  // Verify ownership
  const [doc] = await db
    .select()
    .from(knowledgeDocuments)
    .where(and(
      eq(knowledgeDocuments.id, documentId),
      eq(knowledgeDocuments.clinicId, clinicId),
    ))
    .limit(1);

  if (!doc) {
    throw new AppError('NOT_FOUND', 'Documento nao encontrado', 404);
  }

  // Delete chunks first, then document
  await db
    .delete(knowledgeChunks)
    .where(and(
      eq(knowledgeChunks.documentId, documentId),
      eq(knowledgeChunks.clinicId, clinicId),
    ));

  await db
    .delete(knowledgeDocuments)
    .where(and(
      eq(knowledgeDocuments.id, documentId),
      eq(knowledgeDocuments.clinicId, clinicId),
    ));

  return { deleted: true };
}

// ---------------------------------------------------------------------------
// List documents for a clinic
// ---------------------------------------------------------------------------

export async function listDocuments(clinicId: string) {
  return db
    .select({
      id: knowledgeDocuments.id,
      fileName: knowledgeDocuments.fileName,
      fileSize: knowledgeDocuments.fileSize,
      pageCount: knowledgeDocuments.pageCount,
      chunkCount: knowledgeDocuments.chunkCount,
      status: knowledgeDocuments.status,
      errorMessage: knowledgeDocuments.errorMessage,
      createdAt: knowledgeDocuments.createdAt,
      updatedAt: knowledgeDocuments.updatedAt,
    })
    .from(knowledgeDocuments)
    .where(eq(knowledgeDocuments.clinicId, clinicId))
    .orderBy(desc(knowledgeDocuments.createdAt));
}

// ---------------------------------------------------------------------------
// Search knowledge base — cosine similarity via pgvector
// ---------------------------------------------------------------------------

export async function searchKnowledge(
  clinicId: string,
  query: string,
  limit: number = 3,
): Promise<Array<{ content: string; similarity: number; documentName: string }>> {
  if (!query.trim()) return [];

  const queryEmbedding = await generateEmbedding(query);
  const embeddingStr = `[${queryEmbedding.join(',')}]`;

  const results = await connection.unsafe(
    `SELECT
      kc.content,
      1 - (kc.embedding <=> $1::vector) as similarity,
      kd.file_name as document_name
    FROM knowledge_chunks kc
    JOIN knowledge_documents kd ON kd.id = kc.document_id
    WHERE kc.clinic_id = $2
      AND kc.embedding IS NOT NULL
      AND 1 - (kc.embedding <=> $1::vector) > 0.7
    ORDER BY similarity DESC
    LIMIT $3`,
    [embeddingStr, clinicId, limit],
  );

  return results.map((row: Record<string, unknown>) => ({
    content: row.content as string,
    similarity: parseFloat(String(row.similarity)),
    documentName: row.document_name as string,
  }));
}
