import type { Job } from 'bullmq';
import * as botService from '../services/bot.js';
import { downloadAudio } from '../services/audioDownloader.js';
import { transcribeAudio } from '../services/openai.js';
import { addToOutgoingQueue } from './setup.js';

export interface IncomingJobData {
  clinicId: string;
  instanceName: string;
  phone: string;
  text: string;
  pushName?: string | null;
  messageType: string;
  messageId?: string;
}

export async function processIncomingJob(job: Job<IncomingJobData>) {
  let { text } = job.data;
  const { clinicId, instanceName, phone, pushName, messageType, messageId } = job.data;

  console.log(`[Worker:incoming] Processing message from ${phone} (${pushName ?? 'unknown'}) for clinic ${clinicId} (type: ${messageType})`);

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

  const response = await botService.processIncomingMessage(clinicId, phone, text, instanceName, pushName);

  if (response) {
    // Queue outgoing response
    await addToOutgoingQueue('send', {
      instanceName,
      phone,
      text: response,
    });
  }
}
