import * as openaiService from './openai.js';
import * as conversationService from './conversation.js';
import * as contactService from './contact.js';
import * as appointmentService from './appointment.js';
import * as availabilityService from './availability.js';
import * as bookingRequestService from './bookingRequest.js';
import * as knowledgeService from './knowledge.js';
import { buildSystemPrompt } from '../prompts/attendant.js';
import { getCached } from '../lib/cache.js';
import { db } from '@secretaria/db';
import {
  clinics, clinicSettings, services, professionals,
  professionalServices, appointments,
} from '@secretaria/db';
import { eq, and, isNull, isNotNull, gte, desc } from 'drizzle-orm';
import type { ClinicSettings } from '@secretaria/db';

const FALLBACK_MESSAGE = 'Desculpe, tive um problema tecnico. Um atendente vai te ajudar em breve.';

/**
 * Trata resposta NPS: se o contato tem um NPS pendente (enviado mas nao respondido),
 * ou um appointment completed nas ultimas 48h sem NPS, e a mensagem e um numero 1-5,
 * salva o score e retorna mensagem de agradecimento.
 * Retorna null se nao for uma resposta NPS.
 */
async function handleNpsResponse(clinicId: string, contactId: string, text: string): Promise<string | null> {
  const npsMatch = text.trim().match(/^([1-5])$/);
  if (!npsMatch) return null;

  const score = parseInt(npsMatch[1]);

  // Prioridade 1: appointment com NPS enviado mas nao respondido
  const [pendingNps] = await db
    .select({ id: appointments.id })
    .from(appointments)
    .where(and(
      eq(appointments.clinicId, clinicId),
      eq(appointments.contactId, contactId),
      eq(appointments.status, 'completed'),
      isNotNull(appointments.npsSentAt),
      isNull(appointments.npsRespondedAt),
    ))
    .orderBy(desc(appointments.endAt))
    .limit(1);

  // Prioridade 2: appointment completed nas ultimas 48h sem nenhum NPS score
  const fortyEightHoursAgo = new Date(Date.now() - 48 * 60 * 60 * 1000);
  const [recentCompleted] = !pendingNps ? await db
    .select({ id: appointments.id })
    .from(appointments)
    .where(and(
      eq(appointments.clinicId, clinicId),
      eq(appointments.contactId, contactId),
      eq(appointments.status, 'completed'),
      isNull(appointments.npsScore),
      gte(appointments.endAt, fortyEightHoursAgo),
    ))
    .orderBy(desc(appointments.endAt))
    .limit(1) : [undefined];

  const appt = pendingNps || recentCompleted;
  if (!appt) return null;

  // Salvar NPS score
  await db.update(appointments)
    .set({
      npsScore: score,
      npsRespondedAt: new Date(),
    })
    .where(eq(appointments.id, appt.id));

  console.log(`[Bot] NPS score ${score} salvo para appointment ${appt.id}`);

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

    // 3. Se conversa esta pending_human, verificar se o handoff expirou (30 min sem resposta humana)
    if (conversation.status === 'pending_human') {
      const HANDOFF_TIMEOUT_MS = 30 * 60 * 1000; // 30 minutos
      const lastDashboardReply = await conversationService.getLastDashboardReply(conversation.id);

      if (lastDashboardReply) {
        // Humano respondeu — verificar se faz mais de 30 min desde a ultima resposta
        const timeSinceReply = Date.now() - lastDashboardReply.getTime();
        if (timeSinceReply > HANDOFF_TIMEOUT_MS) {
          // Timeout: retomar bot automaticamente
          await conversationService.resumeConversation(clinicId, conversation.id);
          console.log(`[Bot] Handoff expirado para conversa ${conversation.id}, bot reassumindo`);
          // Continua o fluxo normal abaixo (bot processa a mensagem)
        } else {
          // Humano respondeu recentemente — manter pending, salvar mensagem do usuario
          await conversationService.addMessage(clinicId, conversation.id, 'user', text);
          const pendingMsg = 'Sua mensagem foi encaminhada para nosso atendente. Aguarde a resposta!';
          await conversationService.addMessage(clinicId, conversation.id, 'assistant', pendingMsg);
          return pendingMsg;
        }
      } else {
        // Nenhum humano respondeu ainda — verificar tempo desde o handoff
        const handoffAt = (conversation.metadata as Record<string, unknown>)?.handoffAt;
        const handoffTime = handoffAt ? new Date(handoffAt as string).getTime() : conversation.updatedAt.getTime();
        const timeSinceHandoff = Date.now() - handoffTime;

        if (timeSinceHandoff > HANDOFF_TIMEOUT_MS) {
          // Timeout sem nenhuma resposta humana: retomar bot
          await conversationService.resumeConversation(clinicId, conversation.id);
          console.log(`[Bot] Handoff expirado (sem resposta humana) para conversa ${conversation.id}, bot reassumindo`);
          // Continua o fluxo normal abaixo
        } else {
          // Ainda dentro do prazo — manter pending
          await conversationService.addMessage(clinicId, conversation.id, 'user', text);
          const pendingMsg = 'Sua solicitacao ja esta com nossa equipe. Em breve alguem vai te atender!';
          await conversationService.addMessage(clinicId, conversation.id, 'assistant', pendingMsg);
          return pendingMsg;
        }
      }
    }

    // 4. Save user message
    await conversationService.addMessage(clinicId, conversation.id, 'user', text);

    // 4.5. Verificar se ha cancelamento pendente de confirmacao
    const recentMsgsForCancel = await conversationService.getRecentMessages(conversation.id, 5);
    const lastBotMsg = [...recentMsgsForCancel].reverse().find(
      m => m.role === 'assistant' && (m.metadata as Record<string, unknown>)?.pendingCancellation,
    );

    if (lastBotMsg) {
      const pendingApptId = (lastBotMsg.metadata as Record<string, unknown>).pendingCancellation as string;
      const normalizedText = text.trim().toLowerCase();
      const isConfirmation = ['sim', 'si', 's', 'confirma', 'confirmar', 'pode cancelar', 'quero cancelar', 'isso'].includes(normalizedText);
      const isDenial = ['nao', 'não', 'n', 'nope', 'desisto', 'deixa', 'esquece'].includes(normalizedText);

      if (isConfirmation) {
        try {
          await appointmentService.cancelAppointment(clinicId, pendingApptId, 'Cancelado pelo cliente via WhatsApp');
          console.info(`[Bot] Appointment ${pendingApptId} cancelado (confirmacao 2-step) na clinica ${clinicId}`);
          const cancelMsg = 'Agendamento cancelado com sucesso! Quer reagendar para outro dia?';
          await conversationService.addMessage(clinicId, conversation.id, 'assistant', cancelMsg, 'CANCELAR', { model: 'gpt-4.1-mini' });
          return cancelMsg;
        } catch (err) {
          console.error('[Bot] Erro ao cancelar appointment (2-step):', err);
          const errorMsg = 'Tive um problema ao cancelar. Tente novamente ou entre em contato no proximo expediente.';
          await conversationService.addMessage(clinicId, conversation.id, 'assistant', errorMsg, 'CANCELAR', { model: 'gpt-4.1-mini' });
          return errorMsg;
        }
      } else if (isDenial) {
        const keepMsg = 'Tudo certo, seu agendamento continua confirmado! Posso ajudar com mais alguma coisa?';
        await conversationService.addMessage(clinicId, conversation.id, 'assistant', keepMsg, 'CANCELAR', { model: 'gpt-4.1-mini' });
        return keepMsg;
      }
      // Se nao e confirmacao nem negacao, continua o fluxo normal (a IA vai interpretar)
    }

    // 5. Check if AI is active (cache 5 min para evitar query repetida)
    const settings = await getCached<ClinicSettings | undefined>(
      `clinic-settings:${clinicId}`,
      300,
      () => db.select().from(clinicSettings).where(eq(clinicSettings.clinicId, clinicId)).limit(1).then(r => r[0]),
    );

    if (!settings || !isAiActive(settings)) {
      // AI not active — save message but don't respond
      return null;
    }

    // 6. Get recent messages for context (30 mensagens pra manter contexto mais rico)
    const recentMessages = await conversationService.getRecentMessages(conversation.id, 30);
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

    // 9. Format conversation history for OpenAI — truncar mensagens longas pra economizar tokens
    const chatMessages = recentMessages
      .filter(m => m.role === 'user' || m.role === 'assistant')
      .map(m => ({
        role: m.role as 'user' | 'assistant',
        content: m.content.length > 500 ? m.content.substring(0, 500) + '...' : m.content,
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
    // Fallback para check_availability via tag <!--CHECK:...-->
    const checkTagMatch = responseText.match(/<!--CHECK:(.*?)-->/);
    if (checkTagMatch && !chatResult.toolCalls.some(tc => tc.name === 'check_availability')) {
      try {
        const parsed = JSON.parse(checkTagMatch[1]);
        chatResult.toolCalls.push({ name: 'check_availability', arguments: parsed });
      } catch { /* ignore parse errors */ }
      responseText = responseText.replace(/<!--CHECK:.*?-->/g, '').trim();
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
        // Confirmacao em 2 passos: perguntar antes de cancelar
        const apptId = toolCall.arguments.appointmentId;
        try {
          // Buscar detalhes do agendamento para mostrar ao cliente
          const [apptDetail] = await db
            .select({
              startAt: appointments.startAt,
              serviceName: services.name,
              professionalName: professionals.name,
            })
            .from(appointments)
            .leftJoin(services, eq(appointments.serviceId, services.id))
            .leftJoin(professionals, eq(appointments.professionalId, professionals.id))
            .where(and(
              eq(appointments.id, apptId),
              eq(appointments.clinicId, clinicId),
            ))
            .limit(1);

          if (apptDetail) {
            const dateStr = new Date(apptDetail.startAt).toLocaleDateString('pt-BR');
            const timeStr = new Date(apptDetail.startAt).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
            responseText = `Voce tem certeza que deseja cancelar o agendamento de ${apptDetail.serviceName || 'servico'} em ${dateStr} as ${timeStr} com ${apptDetail.professionalName || 'o profissional'}? Responda "sim" para confirmar.`;
          } else {
            responseText = 'Voce tem certeza que deseja cancelar esse agendamento? Responda "sim" para confirmar.';
          }

          // Salvar mensagem com metadata pendingCancellation para o proximo passo
          await conversationService.addMessage(
            clinicId,
            conversation.id,
            'assistant',
            responseText,
            'CANCELAR',
            { model: 'gpt-4.1-mini', pendingCancellation: apptId },
          );
          return responseText;
        } catch (err) {
          console.error('[Bot] Erro ao buscar detalhes do agendamento para cancelamento:', err);
          responseText = 'Voce tem certeza que deseja cancelar esse agendamento? Responda "sim" para confirmar.';
          await conversationService.addMessage(
            clinicId,
            conversation.id,
            'assistant',
            responseText,
            'CANCELAR',
            { model: 'gpt-4.1-mini', pendingCancellation: apptId },
          );
          return responseText;
        }
      }

      if (toolCall.name === 'check_availability') {
        try {
          const { serviceId, professionalId: profId, date } = toolCall.arguments;
          // Buscar slots para a data especifica (date ate date)
          const slots = await availabilityService.getAvailableSlots(
            clinicId,
            serviceId,
            profId || undefined,
            date,
            date,
          );

          // Limitar a 10 slots para nao sobrecarregar a resposta
          const limitedSlots = slots.slice(0, 10).map(s => ({
            profissional: s.professionalName,
            horario: s.startTime,
            data: s.date,
          }));

          if (limitedSlots.length === 0) {
            // Sem horarios — informar ao modelo para que responda adequadamente
            chatResult.toolCalls = chatResult.toolCalls.filter(tc => tc.name !== 'check_availability');
            responseText = responseText || `Infelizmente nao temos horarios disponiveis para essa data (${date}). Quer que eu verifique outro dia?`;
          } else {
            // Injetar resultado na resposta para a IA formatar
            const slotsText = limitedSlots.map(s => `${s.horario} com ${s.profissional}`).join(', ');
            if (!responseText) {
              responseText = `Horarios disponiveis em ${date}: ${slotsText}. Qual horario prefere?`;
            }
          }
          console.info(`[Bot] check_availability: ${limitedSlots.length} slots encontrados para ${date}`);
        } catch (err) {
          console.error('[Bot] Erro ao consultar disponibilidade:', err);
          if (!responseText) {
            responseText = 'Tive um problema ao verificar os horarios. Pode tentar novamente?';
          }
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
