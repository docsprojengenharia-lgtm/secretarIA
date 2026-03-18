---
paths:
  - "**/whatsapp**"
  - "**/evolution**"
  - "**/bot**"
  - "**/chat**"
---

# WhatsApp — Evolution API

## Arquitetura

- Evolution API self-hosted no Fly.io (gerencia conexoes WhatsApp)
- Cada clinica conecta SEU numero via QR code no dashboard
- Webhook recebe mensagens → API processa → responde via Evolution API
- Fluxo: Paciente envia msg → Evolution webhook → API /whatsapp/webhook → service bot → resposta via Evolution API

## Conexao

- Cada clinica = 1 instancia na Evolution API
- Criar instancia via API quando clinica se cadastra
- QR code exibido no dashboard para clinica escanear
- Monitorar status da conexao (connected/disconnected)
- Se desconectar: notificar clinica por email + dashboard

## Mensagens Recebidas

- Webhook recebe JSON com: instanceId, sender (telefone), message (texto/audio/imagem)
- Identificar clinica pelo instanceId (mapear no banco)
- Identificar paciente pelo telefone (criar se nao existe)
- Salvar mensagem no historico (conversations + messages)
- Classificar intencao com IA antes de responder

## Mensagens Enviadas

- NUNCA enviar mensagem sem contexto (spam = ban do WhatsApp)
- Respeitar rate limits: max 1 mensagem/segundo por numero
- Templates de mensagem para acoes automaticas:
  - Lembrete: 24h antes da consulta
  - Confirmacao: apos agendar
  - Pos-atendimento: 24h apos consulta
  - Reagendamento: quando horario cancelado

## Fluxo do Bot

```
1. Paciente envia mensagem
2. API recebe via webhook
3. Carregar contexto: clinica_settings + historico recente (ultimas 10 msgs)
4. Classificar intencao:
   - AGENDAR → verificar disponibilidade → confirmar horario
   - DUVIDA → responder com base no contexto da clinica
   - CANCELAR → cancelar agendamento → oferecer reagendamento
   - FALAR_HUMANO → encaminhar pra clinica com notificacao
   - OUTRO → responder educadamente, tentar direcionar
5. Salvar resposta no historico
6. Enviar resposta via Evolution API
```

## Seguranca

- Webhook deve validar token de autenticacao da Evolution API
- NUNCA expor dados de paciente de uma clinica para outra
- Telefone do paciente: armazenar sem formatacao (apenas numeros, com DDI)
- LGPD: paciente pode pedir exclusao dos dados — implementar endpoint

## Limites

- WhatsApp bane numeros que enviam muitas mensagens nao solicitadas
- Manter conversas naturais (nao parecer bot generico)
- Se paciente nao responde apos 2 mensagens, parar de enviar
- Horario de envio automatico: 8h-20h (respeitar horario comercial)
- Janela de 24h: WhatsApp permite responder ate 24h apos ultima msg do paciente

## Fallback

- Se IA nao entende: "Desculpe, nao entendi. Posso te ajudar com agendamento, informacoes sobre nossos servicos ou falar com um atendente."
- Se IA falha (erro API): "Tivemos um problema tecnico. Um atendente vai te responder em breve." + notificar clinica
- Se fora do horario configurado: "Nosso horario de atendimento e [X]. Sua mensagem foi registrada e responderemos assim que possivel."
