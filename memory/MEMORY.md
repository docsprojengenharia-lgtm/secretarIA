# SecretarIA — Memory

## Identidade
- **Produto:** SaaS de atendimento WhatsApp para comercios locais e pequenas empresas
- **Posicionamento:** "A IA que atende seu negocio enquanto voce descansa"
- **Modelo:** B2B, self-service, escala nacional
- **Foco:** MEI e PMEs baseadas em agendamento (saloes, barbearias, clinicas, academias, petshops, studios)
- **Conceito:** IA complementa equipe humana, cobrindo horario fora do expediente (configuravel, padrao 18:01-07:59)

## Pricing (revisado 16/03/2026)
- Essential: R$99/mes (1-3 profissionais, 500 conversas, 3 PDFs)
- Professional: R$249/mes (4-10 prof, 2.000 conversas, 10 PDFs, fidelidade, upsell)
- Business: R$499/mes (10+ prof, ilimitado, 20 PDFs, multi-unidade, API)
- Trial: 7 dias gratis sem cartao
- Sem fidelidade, sem taxa de setup

## Diferenciais Competitivos
- Responder audios do WhatsApp (Whisper) — implementado
- Knowledge base com PDF/texto (pgvector + embeddings) — implementado
- NPS pos-atendimento automatico (24h apos consulta) — implementado
- Dois modos de operacao: Modo 1 (agenda direto) e Modo 2 (captura + aprovacao do dono)
- Fila de espera inteligente com notificacao automatica
- Bloqueio de agenda visual (empresa inteira ou por profissional, calendario multi-selecao)
- Resumo diario detalhado pro owner + agenda individual por profissional via WhatsApp
- Micro-CRM com notas automaticas da IA

## Stack (implementada 16/03/2026)
- Monorepo pnpm workspaces
- API: Hono + Node.js + TypeScript (porta 3001)
- Web: Next.js 14 + React 18 + Tailwind CSS (porta 3000)
- Database: PostgreSQL + Drizzle ORM + pgvector
- Cache/Filas: Redis + BullMQ
- WhatsApp: Evolution API (self-hosted, Fly.io)
- IA: OpenAI GPT-4.1-mini (atendimento) + GPT-4.1-nano (classificacao) + text-embedding-3-small (knowledge base) + Whisper-1 (audio)
- Auth: JWT 7 dias + bcryptjs salt 12
- Validacao: Zod
- Deploy: Fly.io (API) + Vercel (Web)
- Dev: Docker Compose (PostgreSQL pgvector + Redis 7)

## Decisoes Arquiteturais
- Codigo base reutilizado de ClariHub (Hono, auth, Evolution API, whatsapp client) e DocSanitaria (frontend patterns, API client, AuthGuard, Zustand)
- n8n REMOVIDO → BullMQ + node-cron (menos complexidade, custo zero)
- Multi-tenant isolado por clinicId (toda query filtra, middleware injeta)
- Agendamento concorrente: SELECT FOR UPDATE SKIP LOCKED
- Soft delete com deletedAt em tabelas de entidade
- SEM integracao Instagram
- SEM app nativo — web + PWA futura e suficiente
- SSE para real-time futuro (nao WebSocket)

## Modos de Operacao (decisao estrategica 16/03/2026)
- **Modo 1 (Completo):** IA agenda direto na agenda do sistema. Ideal pra quem nao tem sistema
- **Modo 2 (Captura + Aprovacao):** IA captura o pedido, envia pro dono aprovar antes de confirmar. Ideal pra quem ja tem outro sistema
- Toggle `autoBook` no clinicSettings controla o modo
- Tabela `booking_requests` armazena pedidos pendentes no Modo 2

## Database (15 tabelas)
clinics, clinic_settings, users, professionals, services, professional_services,
working_hours, blocked_times, contacts, appointments, conversations, messages,
waitlist, booking_requests, knowledge_documents, knowledge_chunks

## Hierarquia de Acesso
- Owner: acesso total
- Admin: tudo exceto financeiro/billing
- Secretary: agenda, conversas, clientes

## Dashboard (11 paginas)
1. Overview (metricas do dia)
2. Agenda (calendario mensal visual com dots de status + lista do dia)
3. Bloqueios (calendario multi-selecao, empresa ou por profissional)
4. Solicitacoes (pedidos pendentes no Modo 2, aprovar/rejeitar)
5. Conversas (lista + chat view detalhado)
6. Contatos (lista com busca)
7. Profissionais (CRUD + horarios + servicos vinculados)
8. Servicos (CRUD com preco, duracao, categoria)
9. Conhecimento (base de conhecimento, upload texto, teste de busca)
10. Configuracoes (dados clinica + config bot + WhatsApp QR)
11. Login/Register

## Automacoes (cron jobs)
- Lembrete D-1: todo dia 18:00
- Lembrete no dia: a cada hora 6-20h (2h antes do horario)
- Resumo diario: 07:30 — agenda detalhada pro owner + agenda individual por profissional
- NPS: a cada hora — envia pesquisa 24h apos appointment completado

## Documentacao
- [Pesquisa de Mercado](project_market_research.md) — Viabilidade (16/03/2026)
- `docs/pesquisa-mercado.md` — Pesquisa completa com concorrentes e TAM
- `docs/core-business.md` — Regras de negocio, fluxos, pricing, compliance

## Fase Atual (16/03/2026)
- MVP IMPLEMENTADO e rodando localmente
- 80+ arquivos criados (44 backend, 21 frontend, 16 db)
- Seed funcional: Barbearia do Ze (ze@barbearia.com / senha123)
- Docker Compose: PostgreSQL + Redis rodando
- API testada: health, login, CRUD, appointments OK
- Dashboard testado: login, agenda calendario, servicos, profissionais, settings, bloqueios OK
- **Proximo passo: testar fluxo WhatsApp + IA (conectar numero, enviar mensagem, IA responder)**

## Pendente (pos-MVP)
- Testar fluxo WhatsApp end-to-end
- Programa de Fidelidade
- Motor de Engajamento (reativacao, aniversario)
- Upsell inteligente
- Analise de sentimento
- SSE real-time no dashboard
- Asaas billing integration
- Cache semantico
- Deploy producao (Fly.io + Vercel)
- PWA (manifest.json + service worker)
