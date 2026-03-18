---
paths:
  - "apps/api/**"
---

# Backend — Hono + Node.js + TypeScript

## Arquitetura

- Hono como framework HTTP (leve, tipado, rapido)
- Estrutura por dominio, nao por tipo:
  ```
  src/
  ├── routes/
  │   ├── auth.ts           # Login, registro, refresh token
  │   ├── clinics.ts        # CRUD clinica, configuracoes
  │   ├── appointments.ts   # CRUD agendamentos
  │   ├── whatsapp.ts       # Webhooks Evolution API
  │   ├── billing.ts        # Asaas webhooks, faturas
  │   └── dashboard.ts      # Metricas, relatorios
  ├── services/
  │   ├── appointment.ts    # Logica de agendamento
  │   ├── bot.ts            # Logica do atendente IA
  │   ├── whatsapp.ts       # Envio/recebimento mensagens
  │   └── billing.ts        # Integracao Asaas
  ├── middleware/
  │   ├── auth.ts           # Verificacao JWT + clinicId
  │   ├── rateLimit.ts      # Rate limiting por IP/clinicId
  │   └── errorHandler.ts   # Catch-all de erros
  └── prompts/
      ├── attendant.ts      # System prompt do bot atendente
      └── templates.ts      # Templates de mensagem (lembrete, pos-consulta)
  ```

## Rotas

- Prefixo /api/ em todas as rotas
- Verbos REST corretos: GET (ler), POST (criar), PUT (atualizar completo), PATCH (atualizar parcial), DELETE (remover)
- Validacao de input com Zod em TODA rota (req.body, req.params, req.query)
- Resposta padrao: `{ success: true, data: T }` ou `{ success: false, error: { code, message } }`
- Status codes corretos: 200 (ok), 201 (criado), 400 (input invalido), 401 (nao autenticado), 403 (sem permissao), 404 (nao encontrado), 409 (conflito), 500 (erro interno)

## Services

- Toda logica de negocio fica em services/, NUNCA nas rotas
- Rotas sao finas: validam input → chamam service → retornam resposta
- Services recebem dados ja validados (tipados)
- Services lancam erros tipados (AppError com code + message + status)

## Auth

- JWT com expiracao de 7 dias
- Payload: { clinicId, email, plan }
- Middleware auth extrai clinicId e injeta no contexto Hono (c.set('clinicId', ...))
- Rotas publicas: POST /auth/login, POST /auth/register, POST /whatsapp/webhook
- Todas as outras rotas: autenticadas

## Webhooks

- WhatsApp (Evolution API): POST /api/whatsapp/webhook — recebe mensagens
- Asaas: POST /api/billing/webhook — recebe eventos de pagamento
- Validar assinatura/token dos webhooks SEMPRE
- Responder 200 imediatamente, processar async (fila)

## Error Handling

```typescript
// Padrao de erro
class AppError extends Error {
  constructor(
    public code: string,
    public message: string,
    public status: number = 400
  ) { super(message) }
}

// Uso no service
throw new AppError('APPOINTMENT_CONFLICT', 'Horario ja ocupado', 409)

// Middleware catch-all converte pra resposta padrao
```

## Rate Limiting

- Webhook WhatsApp: 100 req/min por clinicId
- API dashboard: 60 req/min por clinicId
- Login: 5 tentativas/min por IP
- Usar memoria local (Map) pro MVP, Redis depois se precisar

## Logs

- Formato: [timestamp] [level] [clinicId] message
- INFO: requisicoes, agendamentos criados, mensagens enviadas
- WARN: rate limit atingido, tentativa de acesso negada
- ERROR: falhas de API externa, erros de banco
- NUNCA logar dados sensiveis (senhas, tokens, dados de paciente)
