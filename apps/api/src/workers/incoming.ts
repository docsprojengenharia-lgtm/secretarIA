import type { Job } from 'bullmq';
import * as botService from '../services/bot.js';
import { downloadAudio } from '../services/audioDownloader.js';
import { transcribeAudio } from '../services/openai.js';
import { outgoingQueue } from './setup.js';

export interface IncomingJobData {
  clinicId: string;
  instanceName: string;
  phone: string;
  text: string;
  messageType: string;
  messageId?: string;
}

export async function processIncomingJob(job: Job<IncomingJobData>) {
  let { text } = job.data;
  const { clinicId, instanceName, phone, messageType, messageId } = job.data;

  console.log(`[Worker:incoming] Processing message from ${phone} for clinic ${clinicId} (type: ${messageType})`);

  // Transcribe audio messages via Whisper
  if (messageType === 'audio' && messageId) {
    const audioBuffer = await downloadAudio(instanceName, messageId);
    if (audioBuffer) {
      text = await transcribeAudio(audioBuffer);
      console.log(`[Worker:incoming] Transcribed audio: "${text.substring(0, 100)}..."`);
    } else {
      text = 'O cliente enviou um audio que nao foi possivel transcrever.';
    }
  }

  const response = await botService.processIncomingMessage(clinicId, phone, text, instanceName);

  if (response) {
    // Queue outgoing response
    await outgoingQueue.add('send', {
      instanceName,
      phone,
      text: response,
    });
  }
}
