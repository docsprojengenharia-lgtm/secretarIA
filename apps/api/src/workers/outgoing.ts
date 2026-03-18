import type { Job } from 'bullmq';
import * as whatsappService from '../services/whatsapp.js';

export interface OutgoingJobData {
  instanceName: string;
  phone: string;
  text: string;
}

export async function processOutgoingJob(job: Job<OutgoingJobData>) {
  const { instanceName, phone, text } = job.data;

  console.log(`[Worker:outgoing] Sending message to ${phone} via ${instanceName}`);

  try {
    await whatsappService.sendTextMessage(instanceName, phone, text);
  } catch (err) {
    console.error(`[Worker:outgoing] Failed to send to ${phone}:`, err);
    throw err; // BullMQ will retry
  }
}
