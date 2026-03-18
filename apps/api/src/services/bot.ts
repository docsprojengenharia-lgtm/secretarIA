import * as openaiService from './openai.js';
import * as conversationService from './conversation.js';
import * as contactService from './contact.js';
import * as appointmentService from './appointment.js';
import * as availabilityService from './availability.js';
import * as bookingRequestService from './bookingRequest.js';
import * as knowledgeService from './knowledge.js';
import { buildSystemPrompt } from '../prompts/attendant.js';
import { db } from '@secretaria/db';
import {
  clinics, clinicSettings, services, professionals,
  professionalServices, appointments,
} from '@secretaria/db';
import { eq, and, isNull, isNotNull, gte } from 'drizzle-orm';
import type { ClinicSettings } from '@secretaria/db';

const FALLBACK_MESSAGE = 'Desculpe, tive um problema tecnico. Um atendente vai te ajudar em breve.';

/**
 * Handle NPS response: if the contact has a pending NPS (sent but not responded),
 * and the message is a number 1-5, save the score and return a thank-you message.
 * Returns null if this is not an NPS response.
 */
async function handleNpsResponse(clinicId: string, contactId: string, text: string): Promise<string | null> {
  const score = parseInt(text.trim());
  if (isNaN(score) || score < 1 || score > 5) return null;

  // Find appointment with NPS sent but not responded for this contact
  const [appt] = await db
    .select({ id: appointments.id })
    .from(appointments)
    .where(and(
      eq(appointments.clinicId, clinicId),
      eq(appointments.contactId, contactId),
      eq(appointments.status, 'completed'),
      isNotNull(appointments.npsSentAt),
      isNull(appointments.npsRespondedAt),
    ))
    .limit(1);

  if (!appt) return null;

  // Save NPS score
  await db.update(appointments)
    .set({
      npsScore: score,
      npsRespondedAt: new Date(),
    })
    .where(eq(appointments.id, appt.id));

  console.log(`[Bot] NPS score ${score} saved for appointment ${appt.id}`);

  const responses: Record<number, string> = {
    1: 'Poxa, lamentamos muito. Vamos trabalhar para melhorar! Obrigado pelo feedback.',
    2: 'Obrigado pelo feedback. Vamos nos esforcar para melhorar sua experiencia!',
    3: 'Obrigado pela avaliacao! Sempre buscando melhorar.',
    4: 'Que bom que gostou! Obrigado pelo feedback.',
    5: 'Maravilha! Ficamos muito felizes! Obrigado pela avaliacao.',
  };

  return responses[score] || 'Obrigado pelo feedback!';
}

/**
 * Check if AI is currently active based on clinic settings.
 * Handles time ranges that cross midnight (e.g., 18:01 to 07:59).
 */
export function isAiActive(settings: ClinicSettings): boolean {
  // Manual override: AI is off
  if (settings.aiManualOverride) return false;

  // Always on: skip time/day checks
  if (settings.aiAlwaysOn) return true;

  // Get current time in clinic timezone
  const now = new Date();
  const formatter = new Intl.DateTimeFormat('en-US', {
    timeZone: settings.timezone,
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
    weekday: 'short',
  });

  const parts = formatter.formatToParts(now);
  const hour = parts.find(p => p.type === 'hour')?.value ?? '00';
  const minute = parts.find(p => p.type === 'minute')?.value ?? '00';
  const currentMinutes = parseInt(hour) * 60 + parseInt(minute);

  // Check day of week
  const dayFormatter = new Intl.DateTimeFormat('en-US', {
    timeZone: settings.timezone,
    weekday: 'short',
  });
  const dayStr = dayFormatter.format(now);
  const dayMap: Record<string, number> = {
    'Sun': 0, 'Mon': 1, 'Tue': 2, 'Wed': 3, 'Thu': 4, 'Fri': 5, 'Sat': 6,
  };
  const currentDay = dayMap[dayStr] ?? 0;
  const enabledDays = (settings.aiEnabledDays as number[]) ?? [0, 1, 2, 3, 4, 5, 6];

  if (!enabledDays.includes(currentDay)) return false;

  // Parse start/end times
  const [startH, startM] = settings.aiStartTime.split(':').map(Number);
  const [endH, endM] = settings.aiEndTime.split(':').map(Number);
  const startMinutes = startH * 60 + startM;
  const endMinutes = endH * 60 + endM;

  // Handle time ranges that cross midnight (e.g., 18:01 to 07:59)
  if (startMinutes <= endMinutes) {
    // Same-day range (e.g., 08:00 to 18:00)
    return currentMinutes >= startMinutes && currentMinutes <= endMinutes;
  } else {
    // Crosses midnight (e.g., 18:01 to 07:59)
    return currentMinutes >= startMinutes || currentMinutes <= endMinutes;
  }
}

/**
 * Main bot orchestrator: processes an incoming WhatsApp message.
 */
export async function processIncomingMessage(
  clinicId: string,
  phone: string,
  text: string,
  instanceName: string,
  pushName?: string | null,
): Promise<string | null> {
  try {
    // 1. Get or create contact (use pushName from WhatsApp as name)
    const contact = await contactService.getOrCreateContact(clinicId, phone, pushName ?? undefined);

    // 2. Get or create active conversation
    const conversation = await conversationService.getOrCreateConversation(clinicId, contact.id);

    // 2.5. Check for pending NPS response (before normal AI flow)
    const npsResult = await handleNpsResponse(clinicId, contact.id, text);
    if (npsResult) {
      await conversationService.addMessage(clinicId, conversation.id, 'user', text);
      await conversationService.addMessage(clinicId, conversation.id, 'assistant', npsResult);
      return npsResult;
    }

    // 3. If conversation is pending_human, reply with status message
    if (conversation.status === 'pending_human') {
      const pendingMsg = 'Sua solicitacao ja esta com nossa equipe. Em breve alguem vai te atender!';
      await conversationService.addMessage(clinicId, conversation.id, 'assistant', pendingMsg);
      return pendingMsg;
    }

    // 4. Save user message
    await conversationService.addMessage(clinicId, conversation.id, 'user', text);

    // 5. Check if AI is active
    const [settings] = await db
      .select()
      .from(clinicSettings)
      .where(eq(clinicSettings.clinicId, clinicId))
      .limit(1);

    if (!settings || !isAiActive(settings)) {
      // AI not active — save message but don't respond
      return null;
    }

    // 6. Get recent messages for context
    const recentMessages = await conversationService.getRecentMessages(conversation.id, 10);
    const historyTexts = recentMessages
      .filter(m => m.role === 'user')
      .map(m => m.content);

    // 7. Classify intent
    const intent = await openaiService.classifyIntent(text, historyTexts);

    // 8. Build system prompt with relevant data

    // Fetch clinic data
    const [clinic] = await db
      .select()
      .from(clinics)
      .where(eq(clinics.id, clinicId))
      .limit(1);

    if (!clinic) {
      console.error(`[Bot] Clinic not found: ${clinicId}`);
      return FALLBACK_MESSAGE;
    }

    // Fetch services with professionals
    const svcRows = await db
      .select({
        serviceId: services.id,
        serviceName: services.name,
        durationMinutes: services.durationMinutes,
        priceInCents: services.priceInCents,
        professionalId: professionals.id,
        professionalName: professionals.name,
      })
      .from(services)
      .leftJoin(
        professionalServices,
        eq(professionalServices.serviceId, services.id),
      )
      .leftJoin(
        professionals,
        and(
          eq(professionals.id, professionalServices.professionalId),
          isNull(professionals.deletedAt),
        ),
      )
      .where(
        and(
          eq(services.clinicId, clinicId),
          isNull(services.deletedAt),
        ),
      );

    // Group services with their professionals (including IDs)
    const serviceMap = new Map<string, {
      id: string;
      name: string;
      durationMinutes: number;
      priceInCents: number;
      professionals: Array<{ id: string; name: string }>;
    }>();

    for (const row of svcRows) {
      if (!serviceMap.has(row.serviceId)) {
        serviceMap.set(row.serviceId, {
          id: row.serviceId,
          name: row.serviceName,
          durationMinutes: row.durationMinutes,
          priceInCents: row.priceInCents,
          professionals: [],
        });
      }
      if (row.professionalName && row.professionalId) {
        const svc = serviceMap.get(row.serviceId)!;
        if (!svc.professionals.find(p => p.id === row.professionalId)) {
          svc.professionals.push({ id: row.professionalId, name: row.professionalName });
        }
      }
    }

    const servicesList = Array.from(serviceMap.values());

    // Fetch available slots for scheduling intents (including IDs for booking)
    let availableSlots: Array<{ professionalId: string; professionalName: string; date: string; startTime: string; startAt: string }> = [];
    if (['AGENDAR', 'REAGENDAR', 'DUVIDA_HORARIO', 'CONFIRMAR'].includes(intent)) {
      const now = new Date();
      const dateFrom = now.toISOString().split('T')[0];
      const dateTo = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];

      const firstServiceId = svcRows[0]?.serviceId;
      if (firstServiceId) {
        try {
          const slots = await availabilityService.getAvailableSlots(
            clinicId,
            firstServiceId,
            undefined,
            dateFrom,
            dateTo,
          );
          availableSlots = slots.map(s => ({
            professionalId: s.professionalId,
            professionalName: s.professionalName,
            date: s.date,
            startTime: s.startTime,
            startAt: s.startAt,
          }));
        } catch (err) {
          console.error('[Bot] Error fetching availability:', err);
        }
      }
    }

    // Fetch contact's upcoming appointments for cancel/reschedule intents
    let contactAppointments: Array<{
      id: string;
      serviceName: string;
      date: string;
      time: string;
      professionalName: string;
    }> = [];
    if (['CANCELAR', 'REAGENDAR'].includes(intent)) {
      try {
        const apptResult = await appointmentService.listAppointments(clinicId, {
          contactId: contact.id,
          status: 'confirmed',
          page: 1,
          limit: 10,
        });

        // Filter only future appointments
        const now = new Date();
        contactAppointments = apptResult.data
          .filter(a => a.startAt && new Date(a.startAt) > now)
          .map(a => ({
            id: a.id,
            serviceName: a.serviceName ?? 'Servico',
            date: new Date(a.startAt!).toLocaleDateString('pt-BR'),
            time: new Date(a.startAt!).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' }),
            professionalName: a.professionalName ?? 'Profissional',
          }));
      } catch (err) {
        console.error('[Bot] Error fetching contact appointments:', err);
      }
    }

    let systemPrompt = buildSystemPrompt({
      clinicName: clinic.name,
      segment: clinic.segment,
      address: clinic.address,
      phone: clinic.phone,
      services: servicesList,
      availableSlots,
      contactName: contact.name,
      contactAppointments,
      intent,
    });

    // 8.5. Enrich with knowledge base context for relevant intents
    if (['DUVIDA_SERVICO', 'OUTRO'].includes(intent)) {
      try {
        const knowledgeResults = await knowledgeService.searchKnowledge(clinicId, text);
        if (knowledgeResults.length > 0) {
          systemPrompt += '\n\nINFORMACOES DA BASE DE CONHECIMENTO:';
          for (const result of knowledgeResults) {
            systemPrompt += `\n[Fonte: ${result.documentName} | Relevancia: ${(result.similarity * 100).toFixed(0)}%]\n${result.content}`;
          }
          systemPrompt += '\n\nUse essas informacoes para responder duvidas do cliente. Se a informacao estiver na base de conhecimento, responda com base nela.';
        }
      } catch (err) {
        console.error('[Bot] Error searching knowledge base:', err);
      }
    }

    // 9. Format conversation history for OpenAI
    const chatMessages = recentMessages
      .filter(m => m.role === 'user' || m.role === 'assistant')
      .map(m => ({
        role: m.role as 'user' | 'assistant',
        content: m.content,
      }));

    // 10. Call OpenAI chat completion (with function calling)
    // Force tool use when intent is CONFIRMAR (client said "sim", we MUST call create_appointment)
    const forceToolUse = intent === 'CONFIRMAR';
    const chatResult = await openaiService.chatCompletion(systemPrompt, chatMessages, forceToolUse);
    let responseText = chatResult.text;

    // 10.5. Fallback: parse <!--BOOK:...--> and <!--CANCEL:...--> tags from text
    // Some models include the data in text instead of using tool calls
    const bookTagMatch = responseText.match(/<!--BOOK:(.*?)-->/);
    const cancelTagMatch = responseText.match(/<!--CANCEL:(.*?)-->/);
    if (bookTagMatch && chatResult.toolCalls.length === 0) {
      try {
        const parsed = JSON.parse(bookTagMatch[1]);
        chatResult.toolCalls.push({ name: 'create_appointment', arguments: parsed });
      } catch { /* ignore parse errors */ }
      responseText = responseText.replace(/<!--BOOK:.*?-->/g, '').trim();
    }
    if (cancelTagMatch && chatResult.toolCalls.length === 0) {
      try {
        const parsed = JSON.parse(cancelTagMatch[1]);
        chatResult.toolCalls.push({ name: 'cancel_appointment', arguments: parsed });
      } catch { /* ignore parse errors */ }
      responseText = responseText.replace(/<!--CANCEL:.*?-->/g, '').trim();
    }

    // 11. Handle tool calls (create_appointment, cancel_appointment)
    for (const toolCall of chatResult.toolCalls) {
      if (toolCall.name === 'create_appointment') {
        try {
          const { serviceId, professionalId: profId, startAt } = toolCall.arguments;

          if (settings.autoBook) {
            // Modo 1: agenda direto
            await appointmentService.createAppointment(clinicId, {
              contactId: contact.id,
              serviceId,
              professionalId: profId,
              startAt,
              source: 'ai',
            });
            console.info(`[Bot] Appointment created for contact ${contact.id} at clinic ${clinicId}`);
            if (!responseText) {
              responseText = 'Pronto! Seu agendamento esta confirmado. Qualquer coisa, e so me chamar!';
            }
          } else {
            // Modo 2: cria solicitacao pendente
            await bookingRequestService.createBookingRequest(clinicId, {
              contactId: contact.id,
              serviceId,
              professionalId: profId,
              requestedStartAt: startAt,
            });
            console.info(`[Bot] Booking request created for contact ${contact.id} at clinic ${clinicId} (pending approval)`);
            if (!responseText) {
              responseText = 'Seu pedido de agendamento foi registrado! A equipe vai confirmar em breve.';
            } else {
              responseText += '\n\nSeu pedido sera confirmado pela equipe assim que possivel!';
            }
          }
        } catch (err) {
          console.error('[Bot] Error creating appointment/request:', err);
          if (!responseText) {
            responseText = 'Tive um problema ao registrar o agendamento. Tente novamente ou entre em contato no proximo expediente.';
          }
        }
      }

      if (toolCall.name === 'cancel_appointment') {
        try {
          await appointmentService.cancelAppointment(
            clinicId,
            toolCall.arguments.appointmentId,
            'Cancelado pelo cliente via WhatsApp',
          );
          console.info(`[Bot] Appointment ${toolCall.arguments.appointmentId} cancelled at clinic ${clinicId}`);
          if (!responseText) {
            responseText = 'Agendamento cancelado! Quer reagendar para outro dia?';
          }
        } catch (err) {
          console.error('[Bot] Error cancelling appointment:', err);
        }
      }
    }

    // 12. If intent is FALAR_HUMANO or EMERGENCIA, mark conversation as handoff
    if (intent === 'FALAR_HUMANO' || intent === 'EMERGENCIA') {
      try {
        await conversationService.markHandoff(clinicId, conversation.id);
      } catch (err) {
        console.error('[Bot] Error marking handoff:', err);
      }
    }

    // Fallback if no text
    if (!responseText) {
      responseText = 'Posso te ajudar com mais alguma coisa?';
    }

    // 13. Save assistant message
    await conversationService.addMessage(
      clinicId,
      conversation.id,
      'assistant',
      responseText,
      intent,
      { model: 'gpt-4.1-mini' },
    );

    // 14. Return the response text
    return responseText;
  } catch (err) {
    console.error('[Bot] Error processing message:', err);
    return FALLBACK_MESSAGE;
  }
}
