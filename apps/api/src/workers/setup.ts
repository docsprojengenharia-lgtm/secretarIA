import { Queue, Worker, type ConnectionOptions } from 'bullmq';
import { redis } from '../lib/redis.js';
import { processIncomingJob } from './incoming.js';
import { processOutgoingJob } from './outgoing.js';
import type { IncomingJobData } from './incoming.js';
import type { OutgoingJobData } from './outgoing.js';
import { logger } from '../lib/logger.js';

// Tipo dos jobs da fila de knowledge
export interface KnowledgeJobData {
  clinicId: string;
  documentId: string;
  textContent: string;
}

// Cast once to avoid ioredis version mismatch between direct dep and bullmq's dep
const connection = redis as ConnectionOptions | null;

// Queues — criadas apenas se Redis estiver disponivel
let incomingQueue: Queue<IncomingJobData> | null = null;
let outgoingQueue: Queue<OutgoingJobData> | null = null;
let knowledgeQueue: Queue<KnowledgeJobData> | null = null;

// Workers
let incomingWorker: Worker | null = null;
let outgoingWorker: Worker | null = null;
let knowledgeWorker: Worker | null = null;

if (connection) {
  incomingQueue = new Queue<IncomingJobData>('whatsapp-incoming', { connection });
  outgoingQueue = new Queue<OutgoingJobData>('whatsapp-outgoing', { connection });
  knowledgeQueue = new Queue<KnowledgeJobData>('knowledge-processing', { connection });
}

export function startWorkers() {
  if (!connection) {
    logger.info('Redis indisponivel — workers desabilitados');
    return;
  }

  incomingWorker = new Worker('whatsapp-incoming', processIncomingJob, {
    connection,
    concurrency: 2,
    limiter: { max: 2, duration: 1000 }, // Max 2 jobs por segundo
  });

  outgoingWorker = new Worker('whatsapp-outgoing', processOutgoingJob, {
    connection,
    concurrency: 2,
    limiter: { max: 1, duration: 1000 },
  });

  // Worker de processamento de embeddings — concurrency 1 para nao sobrecarregar OpenAI
  // Import dinamico para evitar dependencia circular (knowledge.ts -> setup.ts -> knowledge.ts)
  knowledgeWorker = new Worker('knowledge-processing', async (job) => {
    const { clinicId, documentId, textContent } = job.data;
    const knowledgeService = await import('../services/knowledge.js');
    await knowledgeService.processDocumentEmbeddings(clinicId, documentId, textContent);
  }, { connection, concurrency: 1 });

  incomingWorker.on('failed', (job, err) => {
    logger.error({
      jobId: job?.id,
      queue: 'whatsapp-incoming',
      data: job?.data,
      attempts: job?.attemptsMade,
      err: err.message,
    }, 'Job incoming falhou permanentemente');
  });

  outgoingWorker.on('failed', (job, err) => {
    logger.error({
      jobId: job?.id,
      queue: 'whatsapp-outgoing',
      data: job?.data,
      attempts: job?.attemptsMade,
      err: err.message,
    }, 'Job outgoing falhou permanentemente');
  });

  knowledgeWorker.on('failed', (job, err) => {
    logger.error({
      jobId: job?.id,
      queue: 'knowledge-processing',
      data: job?.data,
      attempts: job?.attemptsMade,
      err: err.message,
    }, 'Job knowledge falhou permanentemente');
  });

  knowledgeWorker.on('completed', (job) => {
    logger.info({ jobId: job?.id }, 'Worker knowledge concluido');
  });

  logger.info('Workers iniciados: whatsapp:incoming, whatsapp:outgoing, knowledge-processing');
}

export async function stopWorkers() {
  await incomingWorker?.close();
  await outgoingWorker?.close();
  await knowledgeWorker?.close();
}

/**
 * Adiciona job na fila de mensagens recebidas.
 * Retorna false se Redis/fila indisponivel.
 */
export async function addToIncomingQueue(
  jobName: string,
  data: IncomingJobData
): Promise<boolean> {
  if (!incomingQueue) {
    logger.warn({ jobName }, 'Redis indisponivel — job incoming ignorado');
    return false;
  }
  await incomingQueue.add(jobName, data, {
    attempts: 3,
    backoff: { type: 'exponential', delay: 2000 },
    removeOnComplete: 100, // Manter ultimos 100 completos
    removeOnFail: false,   // Manter falhos para inspecao (DLQ)
  });
  return true;
}

/**
 * Adiciona job na fila de mensagens de saida.
 * Retorna false se Redis/fila indisponivel.
 */
export async function addToOutgoingQueue(
  jobName: string,
  data: OutgoingJobData
): Promise<boolean> {
  if (!outgoingQueue) {
    logger.warn({ jobName }, 'Redis indisponivel — job outgoing ignorado');
    return false;
  }
  await outgoingQueue.add(jobName, data, {
    attempts: 3,
    backoff: { type: 'exponential', delay: 2000 },
    removeOnComplete: 100, // Manter ultimos 100 completos
    removeOnFail: false,   // Manter falhos para inspecao (DLQ)
  });
  return true;
}

/**
 * Adiciona job na fila de processamento de knowledge base (embeddings).
 * Retorna false se Redis/fila indisponivel — o caller deve processar de forma sincrona.
 */
export async function addToKnowledgeQueue(
  jobName: string,
  data: KnowledgeJobData
): Promise<boolean> {
  if (!knowledgeQueue) {
    logger.warn({ jobName }, 'Redis indisponivel — job knowledge ignorado');
    return false;
  }
  await knowledgeQueue.add(jobName, data, {
    attempts: 2,
    backoff: { type: 'exponential', delay: 5000 },
  });
  return true;
}
