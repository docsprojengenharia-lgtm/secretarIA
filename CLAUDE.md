# SecretarIA

A IA que atende seu negocio enquanto voce descansa.
Atendimento inteligente via WhatsApp fora do horario comercial: tira duvidas, responde audios, agenda servicos e fideliza clientes — enquanto a equipe humana nao esta disponivel.

Foco: comercios locais e pequenas empresas baseadas em agendamento (clinicas, saloes, barbearias, academias, petshops, studios, etc.)

**Idioma: SEMPRE portugues (PT-BR).**

## Conceito

- **Horario da IA:** configuravel por estabelecimento (padrao: 18:01 as 07:59)
- **Horario humano:** equipe usa o dashboard normalmente durante o expediente
- **Transicao suave:** IA avisa "nosso atendente ja esta disponivel" quando horario humano inicia
- **A IA nao substitui, complementa:** cobre o turno que ninguem cobre
- **Publico-alvo:** MEI e pequenas empresas (1-10 profissionais, faturamento R$ 10k-500k/mes)

## Pricing

| Plano | Preco | Publico | Inclui |
|-------|-------|---------|--------|
| Essential | R$ 99/mes | MEI/ME (1-3 profissionais) | Bot WhatsApp + audio, agenda, lembretes, 500 conversas/mes, 3 PDFs, CRM basico |
| Professional | R$ 249/mes | Pequena empresa (4-10 prof.) | + fidelidade, relatorios avancados, upsell, reativacao, 2.000 conversas, 10 PDFs |
| Business | R$ 499/mes | Media empresa (10+ prof.) | + multi-unidade, conversas ilimitadas, 20 PDFs, API, suporte prioritario |

- Sem taxa de setup, sem fidelidade
- Trial: 7 dias gratis sem cartao
- Cobranca: Asaas (PIX ou boleto)

## Stack

| Camada | Tecnologia |
|--------|------------|
| Monorepo | pnpm workspaces |
| API | Hono + Node.js + TypeScript |
| Web (dashboard) | Next.js 14 + React 18 + Tailwind CSS |
| Database | PostgreSQL + Drizzle ORM + pgvector |
| Cache/Filas | Redis + BullMQ |
| WhatsApp | Evolution API (self-hosted, Fly.io) |
| IA | OpenAI GPT-4.1-mini (atendimento) + text-embedding-3-small (knowledge base) |
| Audio | OpenAI Whisper (transcrever audios do WhatsApp) |
| Auth | JWT + bcryptjs |
| Validacao | Zod (input/output) |
| Deploy | Fly.io (API + Evolution API) + Vercel (Web) |
| Pagamento | Asaas (PIX + boleto recorrente) |

## Arquitetura (implementada)

```
secretarIA/
├── apps/
│   ├── api/          # Hono backend (porta 3001)
│   │   └── src/
│   │       ├── routes/       # 12 routers REST (auth, clinics, professionals, services,
│   │       │                 #   appointments, availability, whatsapp, conversations,
│   │       │                 #   contacts, booking-requests, blocked-times, knowledge)
│   │       ├── services/     # 13 services (auth, clinic, professional, service, appointment,
│   │       │                 #   availability, bot, openai, whatsapp, conversation, contact,
│   │       │                 #   bookingRequest, knowledge, audioDownloader)
│   │       ├── workers/      # BullMQ workers (incoming, outgoing, setup)
│   │       ├── jobs/         # Cron jobs (reminderD1, reminderDayOf, dailySummary, nps, scheduler)
│   │       ├── middleware/   # Auth (JWT), rate-limit, error-handler
│   │       ├── prompts/      # System prompts do bot (attendant)
│   │       ├── validators/   # Zod schemas (auth, clinic, professional, service, appointment, availability)
│   │       ├── scripts/      # seed.ts
│   │       └── lib/          # env, errors, response, redis
│   └── web/          # Next.js 14 dashboard (porta 3000)
│       └── src/
│           ├── app/
│           │   ├── (auth)/login, register
│           │   └── dashboard/ (11 paginas: overview, agenda, blocked-times, requests,
│           │                    conversations, contacts, professionals, services,
│           │                    knowledge, settings)
│           ├── components/   # AuthGuard, Sidebar
│           ├── lib/          # api, auth, formatters
│           ├── store/        # Zustand auth
│           └── types/        # TypeScript interfaces
├── packages/
│   └── db/           # Drizzle schemas + migrations
│       └── src/schema/  # 15 tabelas
├── docs/             # Documentacao do projeto
├── docker-compose.yml # PostgreSQL pgvector + Redis 7
├── fly.toml          # Deploy API no Fly.io
└── vercel.json       # Deploy Web no Vercel
```

## Modos de Operacao

### Modo 1 — Completo (autoBook = true)
IA agenda direto na agenda do sistema. Ideal pra quem NAO tem outro sistema.
Fluxo: Cliente pede → IA confirma → Appointment criado automaticamente.

### Modo 2 — Captura + Aprovacao (autoBook = false)
IA captura o pedido mas NAO agenda. Envia pro dono aprovar.
Fluxo: Cliente pede → IA registra pedido → BookingRequest criado → Dono aprova/rejeita no dashboard → Cliente notificado.
Ideal pra quem JA tem sistema proprio e quer usar SecretarIA so como atendente noturno.

## Componentes do Sistema

### 1. Dashboard Principal
- Visao geral: contatos do dia, agendamentos, taxa de conversao
- Contatos: lista de todos que entraram em contato (status: novo, em atendimento, agendado, desistiu)
- Metricas: quantos desistiram, quantos confirmaram, tempo medio de resposta
- Notificacoes: alertas de novos agendamentos feitos pela IA, conversas pendentes (handoff)
- Relatorio simplificado: "quanto faturou hoje/semana/mes" (3 numeros, nao 130 relatorios)

### 2. Agenda
- Calendario visual por profissional/recurso
- Horarios livres e preenchidos (marcacao manual pela secretaria ou automatica pela IA)
- Suporte multi-profissional (ex: 5 medicos, 3 cabeleireiros — cada um com agenda propria)
- Cancelamento e reagendamento (via dashboard e via WhatsApp)
- Fila de espera: sem horario disponivel → cliente entra na fila, notificado quando abrir vaga
- Bloqueio de horarios (ferias, almoco, imprevistos)

### 3. Cadastro de Servicos
- Nome, descricao, duracao, preco de cada servico
- Foto do servico (cardapio visual compartilhavel por link)
- Vinculo servico ↔ profissional (quem faz o que)
- Categorias (ex: "Corte", "Coloracao", "Consulta", "Exame")
- Combos/pacotes (ex: "Corte + Barba por R$ X")
- A IA usa esses dados para responder sobre precos, duracao, disponibilidade e fazer upsell

### 4. Base de Conhecimento (Knowledge Base)
- Upload de PDFs pelo proprietario (tabela de precos, regras, politicas, protocolos)
- Processamento via embeddings (text-embedding-3-small + pgvector + indice HNSW)
- IA consulta essa base para responder duvidas especificas do estabelecimento
- Versionamento: proprietario atualiza PDF, embeddings sao reprocessados

### 5. Atendimento IA (WhatsApp)
- Conversa natural via GPT-4.1-mini com contexto do estabelecimento
- Suporte a audios: transcreve via Whisper e responde normalmente
- Horario configuravel (padrao 18:01-07:59, ajustavel pelo dono)
- Fluxo: saudacao → entender necessidade → tirar duvidas → agendar → confirmar
- Upsell inteligente: sugere combos e servicos complementares durante agendamento
- Analise de sentimento: detecta irritacao, muda tom, escala para humano se necessario
- Handoff para humano: se IA nao sabe responder, marca conversa como "pendente"
- Cancelamento e reagendamento via conversa
- Mensagem de transicao quando horario humano inicia

### 6. Historico de Conversas
- Todas as conversas da IA ficam registradas e visiveis no dashboard
- Filtros: por data, por status, por cliente
- Proprietario pode revisar o que a IA falou e corrigir comportamento via base de conhecimento

### 7. Clientes (Micro-CRM)
- Lista de todos os clientes que ja entraram em contato
- Historico de agendamentos por cliente
- Status: ativo, inativo, na fila de espera
- Dados basicos: nome, telefone, ultimo contato
- Notas automaticas geradas pela IA a partir das conversas
- Tags automaticas baseadas em comportamento (frequencia, recencia, gasto)
- Preferencias do cliente (profissional favorito, horario preferido, servico recorrente)

### 8. Motor de Engajamento
- Reativacao inteligente: "faz X dias que voce nao vem" (cron configuravel por tenant)
- Aniversario automatico: mensagem com desconto no dia do aniversario
- IA preditiva: aprende padrao do cliente e sugere agendamento proativamente
  ("Oi Joao! Faz 28 dias do seu ultimo corte. Sabado as 10h esta livre, quer agendar?")
- Pos-atendimento: NPS 24h apos servico ("De 1 a 5, como foi?")

### 9. Programa de Fidelidade (plano Professional+)
- Visitas acumuladas ("10a visita gratis!")
- Niveis de fidelidade (Bronze, Prata, Ouro) com beneficios progressivos
- Indicacao premiada ("indique um amigo e ganhe desconto")
- Gerenciado automaticamente pelo bot via WhatsApp

### 10. Configuracoes do Estabelecimento
- Dados do negocio: nome, segmento, endereco, telefone
- Horario de funcionamento e horario da IA
- Profissionais e seus horarios individuais
- Mensagens personalizaveis (boas-vindas, confirmacao, lembrete)
- Segmento: clinica, salao, barbearia, academia, etc. (carrega templates pre-configurados)

### 11. Notificacoes e Resumos
- Resumo diario para o dono: "Ontem a noite: X contatos, Y agendamentos, Z pendentes"
- Alerta imediato para agendamentos criticos ou conversas que precisam de humano
- Lembretes automaticos para clientes (D-1 e no dia do agendamento)

### 12. Relatorios
- Agendamentos por periodo
- Taxa de conversao (contatos → agendamentos)
- Taxa de no-show
- Horarios de pico de contato
- Desempenho por profissional
- Faturamento estimado (agendamentos x preco)

## Filas BullMQ (implementadas)

```
whatsapp-incoming    → Processar mensagens recebidas (classifica, IA, responde)
whatsapp-outgoing    → Enviar mensagens via Evolution API (rate limited 1/s)
```

## Cron Jobs (implementados)

```
0 18 * * *      → Lembrete D-1 (18:00 todo dia)
0 6-20 * * *    → Lembrete no dia (2h antes, a cada hora 6-20h)
30 7 * * *      → Resumo diario (owner + profissionais, agenda detalhada)
0 * * * *       → NPS pos-atendimento (24h apos conclusao)
```

## Comandos

```bash
pnpm dev              # API + Web simultaneo
pnpm dev:api          # So backend (porta 3001)
pnpm dev:web          # So frontend (porta 3000)
pnpm build            # Build producao
pnpm db:generate      # Gerar migration apos alterar schema
pnpm db:migrate       # Aplicar migrations pendentes
pnpm db:push          # Push direto (dev only)
pnpm db:studio        # Drizzle Studio (GUI do banco)
pnpm seed             # Popular banco com dados de demo (Barbearia do Ze)
docker compose up -d  # Subir PostgreSQL + Redis
```

## Seed (dados de teste)

Login: `ze@barbearia.com` / `senha123`
- Clinica: Barbearia do Ze (segmento: barbearia)
- 3 profissionais: Ze, Carlos, Maria (com horarios e servicos vinculados)
- 5 servicos: Corte Masculino (R$45/30min), Barba (R$30/20min), Corte+Barba (R$65/45min), Coloracao (R$80/60min), Hidratacao (R$50/30min)
- 10 contatos, 15 agendamentos nos proximos 7 dias

## Regras Inviolaveis

### Seguranca
- NUNCA commitar .env, API keys ou credentials
- NUNCA expor dados de um estabelecimento para outro (multi-tenant isolado por tenantId)
- NUNCA confiar em input do usuario — validar TUDO com Zod
- NUNCA armazenar senha em texto plano — bcryptjs com salt 12
- NUNCA usar `any` em TypeScript — tipar tudo
- Toda rota autenticada passa por middleware de auth + verificacao de tenantId

### Banco de Dados
- NUNCA rodar DROP TABLE, TRUNCATE ou DELETE sem WHERE
- NUNCA alterar schema sem gerar migration (pnpm db:generate)
- Toda operacao que afeta multiplas tabelas usa transaction
- Indexes obrigatorios em: tenant_id (toda tabela), status, created_at
- Agendamento concorrente: SELECT FOR UPDATE SKIP LOCKED
- Embeddings: indice HNSW (nao IVFFlat)

### Git
- Commits em portugues, formato: "tipo: descricao curta"
- Tipos: feat, fix, refactor, docs, chore
- NUNCA force push em main
- Branch por feature: feat/nome-da-feature
- Commit = atualizar memory se houve aprendizado

### Multi-tenancy
- TODA query deve filtrar por tenantId — sem excecao
- NUNCA fazer SELECT sem WHERE tenant_id = ?
- Middleware extrai tenantId do JWT e injeta no contexto
- Logs incluem tenantId para debug
- Rate limiting por tenant (Redis sliding window)

## Naming Conventions

| Contexto | Padrao | Exemplo |
|----------|--------|---------|
| Variaveis/funcoes | camelCase | `getTenantById` |
| Tipos/Interfaces | PascalCase | `TenantSettings` |
| Tabelas (Drizzle) | snake_case plural | `appointments`, `tenant_settings` |
| Colunas | snake_case | `created_at`, `tenant_id` |
| Rotas API | kebab-case | `/api/tenant-settings` |
| Componentes React | PascalCase | `AppointmentCard.tsx` |
| Arquivos utils | camelCase | `formatPhone.ts` |
| Env vars | SCREAMING_SNAKE | `DATABASE_URL` |

## Terminologia

| Termo no codigo | Significado |
|-----------------|-------------|
| tenant | Estabelecimento (clinica, salao, barbearia, etc.) |
| professional | Profissional que atende (medico, cabeleireiro, personal, etc.) |
| service | Servico oferecido (consulta, corte, aula, etc.) |
| appointment | Agendamento |
| contact | Cliente/paciente que entrou em contato |
| conversation | Conversa no WhatsApp |
| knowledge_base | PDFs e documentos de referencia do estabelecimento |
| engagement | Acoes automaticas de reativacao, aniversario, fidelidade |

## Error Handling

- API retorna SEMPRE: `{ success: boolean, data?: T, error?: { code: string, message: string } }`
- Codigos de erro padronizados: AUTH_INVALID, TENANT_NOT_FOUND, APPOINTMENT_CONFLICT, etc.
- Erros inesperados logam stack trace mas retornam mensagem generica ao cliente
- Bot WhatsApp: se IA falha, responde "Desculpe, tive um problema. Um atendente vai te ajudar em breve." e notifica o estabelecimento

## Performance

- Queries com LIMIT/OFFSET para listas (max 50 por pagina)
- Cache de configuracoes do tenant em Redis (TTL 5min)
- Mensagens do WhatsApp processadas via fila BullMQ (nao sincrono)
- Cache semantico: perguntas frequentes cacheadas via pgvector (similarity >= 0.92)
- OpenAI: usar gpt-4.1-mini (custo/beneficio), gpt-4.1 so se necessario
- Embeddings: reprocessar apenas quando PDF e atualizado (nao a cada consulta)
- Dashboard real-time via SSE (Server-Sent Events), nao WebSockets

## Detalhes por stack: @.claude/rules/
