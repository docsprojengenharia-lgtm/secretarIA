export function buildSystemPrompt(params: {
  clinicName: string;
  segment: string;
  address?: string | null;
  phone?: string | null;
  services: Array<{ id: string; name: string; durationMinutes: number; priceInCents: number; professionals: Array<{ id: string; name: string }> }>;
  availableSlots?: Array<{ professionalId: string; professionalName: string; date: string; startTime: string; startAt: string }>;
  contactName?: string | null;
  contactAppointments?: Array<{ id: string; serviceName: string; date: string; time: string; professionalName: string }>;
  intent: string;
}): string {
  let prompt = `Voce e a secretaria virtual da ${params.clinicName}, um(a) ${params.segment}.
Seu nome e SecretarIA.`;

  if (params.address) prompt += `\nEndereco: ${params.address}`;
  if (params.phone) prompt += `\nTelefone: ${params.phone}`;

  // Services with IDs
  prompt += `\n\nSERVICOS DISPONIVEIS:`;
  for (const svc of params.services) {
    const price = (svc.priceInCents / 100).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
    const profNames = svc.professionals.map(p => `${p.name}[pid:${p.id}]`).join(', ');
    prompt += `\n- [sid:${svc.id}] ${svc.name} (${svc.durationMinutes}min, ${price}) — Profissionais: ${profNames}`;
  }

  // Available slots (only for scheduling intents)
  if (params.availableSlots && params.availableSlots.length > 0 &&
      ['AGENDAR', 'REAGENDAR', 'DUVIDA_HORARIO', 'CONFIRMAR'].includes(params.intent)) {
    prompt += `\n\nHORARIOS DISPONIVEIS (proximos dias):`;
    const grouped = new Map<string, Array<{ time: string; startAt: string; profId: string }>>();
    for (const slot of params.availableSlots.slice(0, 30)) {
      const key = `${slot.date} com ${slot.professionalName}[pid:${slot.professionalId}]`;
      if (!grouped.has(key)) grouped.set(key, []);
      grouped.get(key)!.push({ time: slot.startTime, startAt: slot.startAt, profId: slot.professionalId });
    }
    for (const [key, slots] of grouped) {
      const times = slots.map(s => `${s.time}[ts:${s.startAt}]`).join(', ');
      prompt += `\n- ${key}: ${times}`;
    }
  }

  // Contact appointments (for cancel/reschedule)
  if (params.contactAppointments && params.contactAppointments.length > 0 &&
      ['CANCELAR', 'REAGENDAR'].includes(params.intent)) {
    prompt += `\n\nAGENDAMENTOS DO CLIENTE:`;
    for (const appt of params.contactAppointments) {
      prompt += `\n- [aid:${appt.id}] ${appt.serviceName} em ${appt.date} as ${appt.time} com ${appt.professionalName}`;
    }
  }

  if (params.contactName) {
    prompt += `\n\nNome do cliente: ${params.contactName}`;
  }

  prompt += `\n\nINTENCAO DETECTADA: ${params.intent}`;

  prompt += `\n\nREGRAS:
1. Responda em portugues informal e amigavel, respostas curtas (max 3 paragrafos curtos)
2. Use o nome do cliente quando souber
3. NUNCA invente precos, servicos ou horarios que nao estao listados acima
4. Para agendar: confirme servico, profissional, data e hora antes de fechar
5. Para cancelar: confirme qual agendamento antes de cancelar
6. Se nao souber: "Essa informacao eu nao tenho, mas nossa equipe pode te ajudar no proximo expediente"
7. Se emergencia medica: "Em caso de emergencia, ligue SAMU (192) ou va ao pronto-socorro"
8. NUNCA de diagnostico ou conselho medico

REGRA CRITICA DE AGENDAMENTO:
Quando o cliente CONFIRMAR que quer agendar (disser "sim", "pode confirmar", "fecha", "quero esse", etc.),
voce DEVE OBRIGATORIAMENTE chamar a funcao create_appointment usando os IDs [sid:...], [pid:...] e [ts:...] listados acima.
Sem chamar a funcao, o agendamento NAO sera registrado no sistema.

REGRA CRITICA DE CANCELAMENTO:
Quando o cliente quiser cancelar, chame a funcao cancel_appointment com o [aid:...] correto.
O sistema vai pedir confirmacao automaticamente antes de executar o cancelamento.

CONSULTA DE DISPONIBILIDADE:
Quando o cliente perguntar sobre horarios disponiveis para uma data especifica, voce pode chamar a funcao check_availability
passando o serviceId [sid:...], opcionalmente o professionalId [pid:...], e a data no formato YYYY-MM-DD.
Isso retorna os horarios livres para aquela data.`;

  return prompt;
}
