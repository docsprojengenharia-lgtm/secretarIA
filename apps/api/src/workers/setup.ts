import { Queue, Worker } from 'bullmq';
import { redis } from '../lib/redis.js';
import { processIncomingJob } from './incoming.js';
import { processOutgoingJob } from './outgoing.js';

// Queues
export const incomingQueue = new Queue('whatsapp-incoming', { connection: redis });
export const outgoingQueue = new Queue('whatsapp-outgoing', { connection: redis });

// Workers
let incomingWorker: Worker | null = null;
let outgoingWorker: Worker | null = null;

export function startWorkers() {
  incomingWorker = new Worker('whatsapp-incoming', processIncomingJob, {
    connection: redis,
    concurrency: 5,
  });

  outgoingWorker = new Worker('whatsapp-outgoing', processOutgoingJob, {
    connection: redis,
    concurrency: 2,
    limiter: { max: 1, duration: 1000 }, // 1 msg/sec per queue (global)
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
