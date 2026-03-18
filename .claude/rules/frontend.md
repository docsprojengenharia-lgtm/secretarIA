---
paths:
  - "apps/web/**"
---

# Frontend — Next.js 14 + React 18 + Tailwind CSS

## Arquitetura

- App Router (app/) — NUNCA usar Pages Router
- Server Components por padrao. Usar "use client" APENAS quando precisar de estado, eventos ou hooks de browser
- Layouts para estrutura compartilhada (sidebar, header)
- Loading.tsx e error.tsx em cada rota critica

## Componentes

- 1 componente por arquivo. Arquivo = nome do componente (PascalCase)
- Props tipadas com interface no mesmo arquivo (nao exportar types separados a menos que reutilize)
- Componentes pequenos (<80 linhas). Se passar, quebrar em subcomponentes
- Pasta components/ organizada por dominio, nao por tipo:
  ```
  components/
  ├── appointments/    # AppointmentCard, AppointmentList, AppointmentForm
  ├── clinic/          # ClinicSettings, ClinicDashboard
  ├── chat/            # ChatPreview, ChatHistory
  └── ui/              # Button, Input, Modal (genericos reutilizaveis)
  ```

## Estado

- Zustand para estado global (auth, clinic config, sidebar)
- React Hook Form + Zod para formularios (NUNCA useState pra forms complexos)
- SWR ou fetch nativo para dados do servidor (revalidacao automatica)
- NUNCA prop drilling mais que 2 niveis — usar Zustand ou Context

## Tailwind

- Usar classes utilitarias direto no JSX (padrao Tailwind)
- NUNCA usar CSS customizado a menos que Tailwind nao resolva
- Cores do projeto definidas em tailwind.config.ts (brand, success, warning, error)
- Responsivo: mobile-first (sm:, md:, lg:)
- Dark mode: nao implementar agora — foco no light

## Formularios

- React Hook Form + Zod resolver em todo formulario
- Schema Zod compartilhado com backend quando possivel (packages/shared)
- Feedback visual: loading state no botao, erro inline no campo, toast pra sucesso
- Desabilitar botao durante submit (evitar duplo clique)

## API Client

- Centralizar chamadas em lib/api.ts
- Wrapper com tratamento de erro padrao (401 = redirect login, 500 = toast erro)
- NUNCA chamar fetch diretamente nos componentes

## Auth

- JWT armazenado em httpOnly cookie (nao localStorage)
- Middleware Next.js para proteger rotas (/dashboard/*)
- Redirect para /login se token expirado
- Contexto de auth via Zustand (clinicId, clinicName, plan)

## Performance

- next/image para todas imagens (otimizacao automatica)
- next/link para navegacao interna (prefetch)
- Lazy load componentes pesados com dynamic(() => import(...))
- Evitar re-renders: React.memo so quando mensuravel, nao preventivo
