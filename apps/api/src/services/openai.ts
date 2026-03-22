import OpenAI from 'openai';
import { env } from '../lib/env.js';

const openai = new OpenAI({ apiKey: env.OPENAI_API_KEY });

/**
 * Retry com backoff exponencial para chamadas transientes da OpenAI.
 * Retenta apenas em erros 429 (rate limit) e 5xx (server error).
 */
async function withRetry<T>(fn: () => Promise<T>, maxRetries = 3): Promise<T> {
  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      return await fn();
    } catch (err: unknown) {
      if (attempt === maxRetries) throw err;
      // So retentar em erros transientes (rate limit ou server error)
      const status =
        (err as { status?: number })?.status ||
        (err as { response?: { status?: number } })?.response?.status;
      if (status && status < 500 && status !== 429) throw err;
      const delay = Math.pow(2, attempt) * 1000; // 2s, 4s, 8s
      console.warn(`[OpenAI] Tentativa ${attempt}/${maxRetries} falhou (status ${status}), retentando em ${delay}ms...`);
      await new Promise(r => setTimeout(r, delay));
    }
  }
  throw new Error('Retry exhausted');
}

export const INTENTS = [
  'SAUDACAO', 'AGENDAR', 'CANCELAR', 'REAGENDAR', 'CONFIRMAR',
  'DUVIDA_SERVICO', 'DUVIDA_HORARIO', 'FALAR_HUMANO', 'EMERGENCIA', 'OUTRO',
] as const;

export type Intent = typeof INTENTS[number];

export async function classifyIntent(message: string, history: string[]): Promise<Intent> {
  try {
    const response = await withRetry(() =>
      openai.chat.completions.create({
        model: 'gpt-4.1-nano',
        response_format: { type: 'json_object' },
        max_tokens: 50,
        messages: [
          {
            role: 'system',
            content: `Classifique a intencao da mensagem do cliente. Responda APENAS com JSON: {"intent":"<INTENT>"}
Intencoes validas: ${INTENTS.join(', ')}
Historico recente da conversa para contexto: ${history.slice(-3).join(' | ')}`,
          },
          { role: 'user', content: message },
        ],
      }),
    );

    const content = response.choices[0]?.message?.content || '{}';
    const parsed = JSON.parse(content);
    const intent = parsed.intent?.toUpperCase();
    if (INTENTS.includes(intent as Intent)) return intent as Intent;
    return 'OUTRO';
  } catch (err) {
    console.error('[OpenAI] Classification error:', err);
    return 'OUTRO';
  }
}

export async function transcribeAudio(audioBuffer: Buffer, mimeType: string = 'audio/ogg'): Promise<string> {
  try {
    const file = new File([audioBuffer], 'audio.ogg', { type: mimeType });
    const response = await openai.audio.transcriptions.create({
      model: 'whisper-1',
      file,
      language: 'pt',
    });
    return response.text;
  } catch (err) {
    console.error('[OpenAI] Whisper transcription error:', err);
    return '[audio nao transcrito]';
  }
}

// Tools para function calling
const BOOKING_TOOLS: OpenAI.Chat.Completions.ChatCompletionTool[] = [
  {
    type: 'function',
    function: {
      name: 'create_appointment',
      description: 'Cria um agendamento quando o cliente confirma que quer agendar. Use SOMENTE quando o cliente disser "sim", "pode confirmar", "fecha", "quero esse horario" ou similar.',
      parameters: {
        type: 'object',
        properties: {
          serviceId: { type: 'string', description: 'ID do servico (sid)' },
          professionalId: { type: 'string', description: 'ID do profissional (pid)' },
          startAt: { type: 'string', description: 'Data/hora ISO8601 do agendamento (ts)' },
        },
        required: ['serviceId', 'professionalId', 'startAt'],
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'cancel_appointment',
      description: 'Cancela um agendamento quando o cliente confirma o cancelamento.',
      parameters: {
        type: 'object',
        properties: {
          appointmentId: { type: 'string', description: 'ID do agendamento (aid)' },
        },
        required: ['appointmentId'],
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'check_availability',
      description: 'Consulta horarios disponiveis para um servico com um profissional especifico em uma data. Use quando o cliente perguntar sobre disponibilidade ou quiser saber horarios livres.',
      parameters: {
        type: 'object',
        properties: {
          serviceId: { type: 'string', description: 'ID do servico (formato [sid:xxx])' },
          professionalId: { type: 'string', description: 'ID do profissional (formato [pid:xxx]). Opcional — se nao informado, retorna horarios de todos os profissionais.' },
          date: { type: 'string', description: 'Data no formato YYYY-MM-DD' },
        },
        required: ['serviceId', 'date'],
      },
    },
  },
];

export interface ToolCall {
  name: string;
  arguments: Record<string, string>;
}

export interface ChatResult {
  text: string;
  toolCalls: ToolCall[];
}

export async function chatCompletion(
  systemPrompt: string,
  messages: Array<{ role: 'user' | 'assistant'; content: string }>,
  forceToolUse: boolean = false,
): Promise<ChatResult> {
  try {
    const response = await withRetry(() =>
      openai.chat.completions.create({
        model: 'gpt-4.1-mini',
        max_tokens: 500,
        tools: BOOKING_TOOLS,
        tool_choice: forceToolUse ? 'required' : 'auto',
        messages: [
          { role: 'system', content: systemPrompt },
          ...messages,
        ],
      }),
    );

    const choice = response.choices[0];
    const text = choice?.message?.content || '';
    const toolCalls: ToolCall[] = [];

    console.log('[OpenAI] finish_reason:', choice?.finish_reason, 'tool_calls:', choice?.message?.tool_calls?.length || 0);

    if (choice?.message?.tool_calls) {
      for (const tc of choice.message.tool_calls) {
        try {
          toolCalls.push({
            name: tc.function.name,
            arguments: JSON.parse(tc.function.arguments),
          });
        } catch {
          console.error('[OpenAI] Failed to parse tool call:', tc.function.arguments);
        }
      }
    }

    // If only tool calls and no text, generate a confirmation message
    if (!text && toolCalls.length > 0) {
      return { text: '', toolCalls };
    }

    return { text, toolCalls };
  } catch (err) {
    console.error('[OpenAI] Chat completion error:', err);
    return {
      text: 'Desculpe, tive um problema tecnico. Um atendente vai te ajudar em breve.',
      toolCalls: [],
    };
  }
}
