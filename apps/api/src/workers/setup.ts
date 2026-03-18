import { Queue, Worker, type ConnectionOptions } from 'bullmq';
import { redis } from '../lib/redis.js';
import { processIncomingJob } from './incoming.js';
import { processOutgoingJob } from './outgoing.js';
import type { IncomingJobData } from './incoming.js';
import type { OutgoingJobData } from './outgoing.js';

// Cast once to avoid ioredis version mismatch between direct dep and bullmq's dep
const connection = redis as ConnectionOptions | null;

// Queues — only created if Redis is available
let incomingQueue: Queue<IncomingJobData> | null = null;
let outgoingQueue: Queue<OutgoingJobData> | null = null;

// Workers
let incomingWorker: Worker | null = null;
let outgoingWorker: Worker | null = null;

if (connection) {
  incomingQueue = new Queue<IncomingJobData>('whatsapp-incoming', { connection });
  outgoingQueue = new Queue<OutgoingJobData>('whatsapp-outgoing', { connection });
}

export function startWorkers() {
  if (!connection) {
    console.log('[Workers] Redis not available — WhatsApp workers disabled');
    return;
  }

  incomingWorker = new Worker('whatsapp-incoming', processIncomingJob, {
    connection,
    concurrency: 5,
  });

  outgoingWorker = new Worker('whatsapp-outgoing', processOutgoingJob, {
    connection,
    concurrency: 2,
    limiter: { max: 1, duration: 1000 },
  });

  incomingWorker.on('failed', (job, err) => {
    console.error(`[Worker:incoming] Job ${job?.id} failed:`, err.message);
  });

  outgoingWorker.on('failed', (job, err) => {
    console.error(`[Worker:outgoing] Job ${job?.id} failed:`, err.message);
  });

  console.log('[Workers] Started: whatsapp:incoming, whatsapp:outgoing');
}

export async function stopWorkers() {
  await incomingWorker?.close();
  await outgoingWorker?.close();
}

/**
 * Helper to add a job to the incoming queue.
 * Returns false if Redis/queue is unavailable (noop).
 */
export async function addToIncomingQueue(
  jobName: string,
  data: IncomingJobData
): Promise<boolean> {
  if (!incomingQueue) {
    console.warn('[Queue] Redis unavailable — incoming job skipped:', jobName);
    return false;
  }
  await incomingQueue.add(jobName, data);
  return true;
}

/**
 * Helper to add a job to the outgoing queue.
 * Returns false if Redis/queue is unavailable (noop).
 */
export async function addToOutgoingQueue(
  jobName: string,
  data: OutgoingJobData
): Promise<boolean> {
  if (!outgoingQueue) {
    console.warn('[Queue] Redis unavailable — outgoing job skipped:', jobName);
    return false;
  }
  await outgoingQueue.add(jobName, data);
  return true;
}
