---
paths:
  - "packages/db/**"
  - "**/*migration*"
  - "**/*schema*"
  - "**/drizzle*"
---

# Database — PostgreSQL + Drizzle ORM

## Schema Design

- Multi-tenant: TODA tabela tem coluna `clinic_id` (exceto tabela clinics)
- TODA query filtra por clinic_id — sem excecao
- Soft delete preferido: coluna `deleted_at` (timestamp nullable) em vez de DELETE fisico
- Timestamps obrigatorios: `created_at` (default now()), `updated_at` (trigger/app)

## Tabelas Core (referencia)

```
clinics              # Dados da clinica (nome, telefone, plano, config)
clinic_settings      # Config do bot (horarios, servicos, precos, prompt custom)
appointments         # Agendamentos (paciente, data, horario, status, servico)
patients             # Dados do paciente (nome, telefone, historico)
conversations        # Historico de conversas WhatsApp
messages             # Mensagens individuais (role, content, timestamp)
billing              # Faturas e status de pagamento
```

## Drizzle ORM

- Schemas definidos em packages/db/src/schema/ (1 arquivo por tabela ou dominio)
- Exportar tudo via packages/db/src/schema/index.ts
- Usar inferType do Drizzle pra tipos TypeScript (nao duplicar tipos)
- Relations definidas no schema (Drizzle relations API)

## Migrations

- SEMPRE gerar via `pnpm db:generate` apos alterar schema
- NUNCA editar migration gerada manualmente
- NUNCA deletar migration ja aplicada
- Testar migration em dev antes de aplicar em producao
- Nome descritivo: drizzle gera automatico, nao renomear

## Queries

- Usar Drizzle query builder (tipado) — NUNCA sql raw a menos que necessario
- SELECT: especificar colunas necessarias (nao SELECT *)
- WHERE clinic_id = ? em TODA query (middleware injeta)
- JOIN: preferir Drizzle relations API sobre joins manuais
- Paginacao: LIMIT + OFFSET com max 50 por pagina

## Atomicidade & Consistencia

- Operacoes que afetam multiplas tabelas: SEMPRE usar db.transaction()
- Exemplo: criar agendamento = inserir appointment + atualizar slot disponibilidade + enviar mensagem
- Se qualquer etapa falha, rollback completo
- Verificar conflito de horario DENTRO da transaction (SELECT FOR UPDATE)

## Indexes

Obrigatorios:
- `clinic_id` em TODA tabela (btree)
- `appointments(clinic_id, date, status)` — busca principal
- `patients(clinic_id, phone)` — lookup por telefone WhatsApp
- `conversations(clinic_id, patient_id, created_at)` — historico

## Performance

- Connection pool: max 10 conexoes em dev, 25 em producao
- Queries lentas (>500ms): investigar e adicionar index
- NUNCA fazer N+1 queries — usar joins ou batch
- Dados historicos (mensagens antigas): considerar archiving apos 6 meses
