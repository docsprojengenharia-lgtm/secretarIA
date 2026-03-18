import OpenAI from 'openai';
import { db, connection, knowledgeDocuments, knowledgeChunks } from '@secretaria/db';
import { eq, and, desc } from 'drizzle-orm';
import { env } from '../lib/env.js';
import { AppError } from '../lib/errors.js';

const openai = new OpenAI({ apiKey: env.OPENAI_API_KEY });

const CHUNK_MAX_CHARS = 2000;
const CHUNK_OVERLAP_CHARS = 200;

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

    // If a single paragraph exceeds the max, split it by sentences
    if (trimmed.length > CHUNK_MAX_CHARS) {
      // Flush current chunk first
      if (currentChunk.trim()) {
        chunks.push(currentChunk.trim());
        currentChunk = '';
      }

      const sentences = trimmed.split(/(?<=[.!?])\s+/);
      let sentenceChunk = '';
      for (const sentence of sentences) {
        if ((sentenceChunk + ' ' + sentence).length > CHUNK_MAX_CHARS && sentenceChunk) {
          chunks.push(sentenceChunk.trim());
          // Overlap: keep the last portion
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

    // If adding this paragraph would exceed the max, flush
    if ((currentChunk + '\n\n' + trimmed).length > CHUNK_MAX_CHARS && currentChunk) {
      chunks.push(currentChunk.trim());
      // Overlap: keep the last portion of the current chunk
      const overlapStart = Math.max(0, currentChunk.length - CHUNK_OVERLAP_CHARS);
      currentChunk = currentChunk.slice(overlapStart).trim() + '\n\n' + trimmed;
    } else {
      currentChunk = currentChunk ? currentChunk + '\n\n' + trimmed : trimmed;
    }
  }

  // Flush remaining
  if (currentChunk.trim()) {
    chunks.push(currentChunk.trim());
  }

  return chunks;
}

// ---------------------------------------------------------------------------
// Upload document — create record, chunk text, generate embeddings, store
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

  // Create document record with status "processing"
  const [doc] = await db.insert(knowledgeDocuments).values({
    clinicId,
    fileName,
    fileSize,
    status: 'processing',
  }).returning();

  try {
    // Chunk the text
    const chunks = chunkText(textContent);

    if (chunks.length === 0) {
      throw new Error('Nenhum trecho extraido do documento');
    }

    // Generate embeddings and insert chunks
    for (let i = 0; i < chunks.length; i++) {
      const embedding = await generateEmbedding(chunks[i]);

      await db.insert(knowledgeChunks).values({
        clinicId,
        documentId: doc.id,
        content: chunks[i],
        chunkIndex: i,
        embedding,
      });
    }

    // Update document status to ready
    const [updated] = await db
      .update(knowledgeDocuments)
      .set({
        status: 'ready',
        chunkCount: chunks.length,
        updatedAt: new Date(),
      })
      .where(and(
        eq(knowledgeDocuments.id, doc.id),
        eq(knowledgeDocuments.clinicId, clinicId),
      ))
      .returning();

    return updated;
  } catch (err) {
    // Mark document as error
    const errorMessage = err instanceof Error ? err.message : 'Erro desconhecido';
    await db
      .update(knowledgeDocuments)
      .set({
        status: 'error',
        errorMessage,
        updatedAt: new Date(),
      })
      .where(and(
        eq(knowledgeDocuments.id, doc.id),
        eq(knowledgeDocuments.clinicId, clinicId),
      ));

    throw new AppError('PROCESSING_ERROR', `Erro ao processar documento: ${errorMessage}`, 500);
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
