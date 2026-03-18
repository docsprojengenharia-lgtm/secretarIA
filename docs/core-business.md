# Core Business — SecretarIA

> Documento de regras de negocio. Guia toda decisao de implementacao.

---

## 1. Modelo de Negocio

### Proposta de Valor
"Sua secretaria nunca mais perde cliente fora do horario.
A SecretarIA atende no WhatsApp enquanto sua equipe descansa —
tira duvidas, agenda servicos e organiza tudo pra voce de manha."

### Publico-Alvo
Qualquer estabelecimento baseado em agendamento:
- Clinicas medicas e odontologicas
- Clinicas de estetica
- Saloes de beleza e barbearias
- Academias e studios (pilates, yoga, crossfit)
- Petshops e veterinarias
- Consultorios de psicologia, nutricao, fisioterapia

### Perfil do Cliente Ideal (ICP)
- 1 a 10 profissionais
- Faturamento R$ 20k-500k/mes
- Ja usa WhatsApp pra atender (mas de forma manual/desorganizada)
- Perde clientes fora do horario ou por demora na resposta
- Nao tem equipe de TI — precisa de solucao pronta

### Pricing

| Plano | Preco | Inclui |
|-------|-------|--------|
| Starter | R$ 349/mes | 1 numero WhatsApp, ate 3 profissionais, 1.000 conversas/mes, 5 PDFs na knowledge base |
| Pro | R$ 599/mes | 1 numero WhatsApp, ate 10 profissionais, conversas ilimitadas, 20 PDFs, relatorios avancados |
| Enterprise | Sob consulta | Multiplos numeros, API customizada, integracao com ERP proprio |

- Cobranca: mensal via Asaas (PIX ou boleto)
- Sem taxa de setup
- Sem fidelidade (cancela quando quiser)
- Trial: 7 dias gratis (sem cartao)
- Upgrade/downgrade a qualquer momento

---

## 2. Fluxo de Onboarding (Novo Tenant)

```
Passo 1: Cadastro
  → Proprietario acessa o site
  → Cria conta (nome, email, senha, telefone)
  → Escolhe segmento (clinica, salao, barbearia, academia, outro)
  → Sistema carrega templates pre-configurados do segmento

Passo 2: Configuracao do Estabelecimento
  → Nome do estabelecimento
  → Endereco e telefone
  → Horario de funcionamento
  → Horario da IA (padrao: fora do expediente)

Passo 3: Cadastro de Profissionais
  → Nome de cada profissional
  → Horarios de atendimento individuais
  → Servicos que cada um realiza

Passo 4: Cadastro de Servicos
  → Nome do servico (ex: "Corte Masculino")
  → Duracao (ex: 30min)
  → Preco (ex: R$ 45,00)
  → Categoria (ex: "Corte")
  → Vinculo com profissional(is)

Passo 5: Knowledge Base (opcional)
  → Upload de PDFs (tabela de precos, regras, FAQ)
  → Sistema processa embeddings automaticamente
  → Proprietario pode testar: "Pergunta: quanto custa X?" → ve a resposta da IA

Passo 6: Conexao WhatsApp
  → Dashboard exibe QR code
  → Proprietario escaneia com WhatsApp Business do estabelecimento
  → Conexao via Evolution API
  → Teste: sistema envia mensagem de confirmacao

Passo 7: Ativacao
  → Proprietario revisa configuracoes
  → Ativa a SecretarIA
  → IA comeca a responder no proximo horario configurado
```

**Meta: onboarding completo em menos de 15 minutos.**

---

## 3. Fluxo de Atendimento IA

### 3.1 Decisao: IA ou Humano?

```
Mensagem chega no WhatsApp
  │
  ├─ Horario da IA ativo?
  │   ├─ SIM → IA responde
  │   └─ NAO → Mensagem vai pro dashboard, secretaria humana ve e responde
  │
  ├─ IA esta ativa mas conversa foi marcada como "handoff"?
  │   ├─ SIM → IA nao responde, aguarda humano
  │   └─ NAO → IA responde normalmente
  │
  └─ Mensagem e de contato bloqueado?
      ├─ SIM → Ignora
      └─ NAO → Processa
```

### 3.2 Fluxo da Conversa IA

```
ETAPA 1 — SAUDACAO
  IA: "Ola! Sou a assistente virtual da [Nome do Estabelecimento].
       Estou aqui pra te ajudar enquanto nossa equipe nao esta disponivel.
       Como posso te ajudar?"

  → Se cliente ja e conhecido (telefone no banco):
    "Ola [Nome]! Que bom te ver de novo. Como posso te ajudar?"

ETAPA 2 — ENTENDER NECESSIDADE
  A IA identifica a intencao:

  a) DUVIDA → Consulta knowledge base + dados dos servicos → Responde
  b) AGENDAMENTO → Vai pro fluxo de agendamento (3.3)
  c) CANCELAMENTO → Vai pro fluxo de cancelamento (3.4)
  d) REAGENDAMENTO → Cancela atual + novo agendamento
  e) RECLAMACAO → Registra e marca para handoff humano
  f) FORA DO ESCOPO → "Essa informacao eu nao tenho, mas amanha
     nossa equipe pode te ajudar a partir das [horario]."
  g) EMERGENCIA (saude) → "Em caso de emergencia, ligue para o SAMU (192)
     ou va ao pronto-socorro mais proximo."

ETAPA 3 — RESOLUCAO
  → Se resolveu: "Posso te ajudar com mais alguma coisa?"
  → Se nao resolveu: marca como pendente, avisa o cliente que
     a equipe vai retornar no proximo expediente

ETAPA 4 — ENCERRAMENTO
  → Agradece, deseja boa noite/bom dia
  → Registra conversa no historico com status e resumo
```

### 3.3 Fluxo de Agendamento

```
1. IA pergunta qual servico deseja
   → Se cliente diz "quero cortar cabelo":
     IA cruza com servicos cadastrados → "Temos Corte Masculino (R$ 45, 30min)
     e Corte Feminino (R$ 65, 45min). Qual voce prefere?"

2. IA pergunta preferencia de profissional (se houver mais de 1)
   → "Temos disponibilidade com [Prof A] e [Prof B].
      Tem preferencia?"
   → Se nao tem preferencia: IA escolhe o com mais disponibilidade

3. IA consulta agenda e oferece horarios
   → Busca slots livres nos proximos 7 dias
   → Apresenta ate 5 opcoes: "Temos esses horarios disponiveis:
      • Terca 19/03 as 14:00
      • Terca 19/03 as 15:30
      • Quarta 20/03 as 10:00
      Qual fica melhor pra voce?"
   → Se nenhum serve: oferece mais opcoes ou fila de espera

4. Cliente escolhe horario
   → IA confirma: "Perfeito! Agendei [Servico] com [Profissional]
      no dia [Data] as [Hora]. Valor: R$ [Preco].
      Endereco: [Endereco do estabelecimento].
      Precisa de mais alguma coisa?"

5. Sistema registra o agendamento
   → Status: confirmado
   → Envia notificacao pro proprietario/secretaria
   → Agenda lembrete automatico (D-1 e no dia)

6. Se nao tem horario disponivel
   → "Infelizmente nao temos horario disponivel pra esse periodo.
      Posso te colocar na lista de espera? Se abrir uma vaga,
      te aviso na hora!"
   → Se aceitar: registra na fila de espera
```

### 3.4 Fluxo de Cancelamento

```
1. Cliente pede pra cancelar
   → IA busca agendamentos futuros do cliente (pelo telefone)
   → Se tem 1: "Voce tem [Servico] agendado pra [Data] as [Hora].
      Deseja cancelar?"
   → Se tem varios: lista todos e pergunta qual

2. Cliente confirma
   → IA cancela o agendamento
   → "Cancelado! Quer reagendar pra outro dia?"
   → Se sim: vai pro fluxo de agendamento
   → Se nao: encerra

3. Sistema atualiza
   → Status do agendamento: cancelado
   → Horario volta a ficar disponivel
   → Notifica proprietario
   → Se tem alguem na fila de espera pra aquele horario: notifica
```

### 3.5 Regras da IA

```
DEVE:
  ✓ Responder em portugues informal e amigavel
  ✓ Usar o nome do cliente quando souber
  ✓ Consultar knowledge base antes de dizer "nao sei"
  ✓ Confirmar dados antes de agendar (servico, profissional, data, hora)
  ✓ Respeitar horarios de funcionamento do estabelecimento
  ✓ Respeitar duracao dos servicos (nao agendar corte de 30min em slot de 15min)
  ✓ Lidar com multiplas intencoes na mesma mensagem
  ✓ Manter contexto da conversa (nao perguntar de novo o que ja foi dito)

NAO DEVE:
  ✗ Dar diagnosticos medicos ou orientacao clinica
  ✗ Inventar precos, servicos ou horarios que nao existem no cadastro
  ✗ Agendar em horarios bloqueados ou ja ocupados
  ✗ Agendar servico com profissional que nao realiza aquele servico
  ✗ Pressionar o cliente a agendar
  ✗ Discutir politica, religiao ou assuntos fora do escopo
  ✗ Prometer coisas que o estabelecimento nao oferece
  ✗ Responder durante horario humano (a menos que configurado diferente)
```

---

## 4. Regras de Agendamento

### 4.1 Disponibilidade

```
Slot disponivel = TODOS os criterios:
  1. Dentro do horario de atendimento do profissional
  2. Nao esta bloqueado (ferias, almoco, imprevisto)
  3. Nao tem outro agendamento no mesmo horario
  4. Duracao do servico cabe no slot
  5. Existe intervalo minimo entre servicos (configuravel, padrao: 0min)
  6. Dia nao e feriado (lista de feriados configuravel)
```

### 4.2 Conflitos

```
Conflito = mesmo profissional, mesmo horario, servicos sobrepostos.

Resolucao:
  → Primeiro que agendar, leva o horario
  → Segundo recebe: "Esse horario acabou de ser preenchido.
     Posso te oferecer [proximo horario disponivel]?"
  → Race condition: protegido por lock no banco (SELECT FOR UPDATE)
```

### 4.3 Janela de Agendamento

```
- Minimo: nao permite agendar com menos de [X] horas de antecedencia
  (configuravel, padrao: 2 horas)
- Maximo: permite agendar ate [X] dias no futuro
  (configuravel, padrao: 30 dias)
```

### 4.4 Cancelamento

```
- Cliente pode cancelar a qualquer momento via WhatsApp ou telefone
- Politica de cancelamento configuravel pelo proprietario:
  → Livre: sem restricao
  → Com antecedencia: minimo de X horas antes (padrao: 2h)
  → Com taxa: proprietario define (nao cobramos, apenas informamos a regra)
- Horario cancelado volta a ficar disponivel imediatamente
- Se ha fila de espera: primeiro da fila e notificado
```

---

## 5. Handoff IA → Humano

### Quando acontece:

```
Automatico:
  1. IA nao encontrou resposta na knowledge base apos 2 tentativas
  2. Cliente pediu explicitamente pra falar com humano
  3. Cliente enviou mensagem com tom de irritacao/reclamacao detectado
  4. Assunto envolve pagamento/financeiro complexo
  5. Assunto envolve saude/emergencia

Manual:
  6. Proprietario marca conversa como "atender pessoalmente" no dashboard
```

### Como funciona:

```
1. IA responde: "Entendi sua situacao. Vou deixar anotado pra nossa equipe.
   Amanha a partir das [horario] alguem vai te responder, tudo bem?"

2. Conversa muda status para "pendente_humano"

3. Notificacao enviada pro proprietario/secretaria:
   "Nova conversa pendente: [Nome/Telefone] — [Resumo do assunto]"

4. No dia seguinte, secretaria ve no dashboard:
   → Lista de "Pendentes" com resumo da conversa
   → Pode responder direto pelo dashboard (mensagem vai pro WhatsApp)
   → Ou responder pelo WhatsApp normal e marcar como resolvido no dashboard

5. Enquanto pendente, se cliente mandar nova mensagem:
   → IA responde: "Sua solicitacao ja esta com nossa equipe.
      Assim que possivel vamos te responder!"
```

---

## 6. Knowledge Base

### Upload e Processamento

```
1. Proprietario faz upload de PDF no dashboard
   → Tipos aceitos: PDF (max 10MB por arquivo)
   → Limite por plano: Starter (5 PDFs), Pro (20 PDFs)

2. Sistema processa o PDF:
   → Extrai texto
   → Divide em chunks (max 500 tokens por chunk)
   → Gera embeddings via text-embedding-3-small
   → Armazena no PostgreSQL com pgvector
   → Vincula ao tenant_id

3. Quando IA precisa responder duvida:
   → Gera embedding da pergunta
   → Busca top 3 chunks mais similares (cosine similarity > 0.7)
   → Inclui no contexto do prompt da IA
   → IA formula resposta baseada no conteudo encontrado

4. Se nenhum chunk relevante encontrado (similarity < 0.7):
   → IA tenta responder com dados dos servicos cadastrados
   → Se ainda nao sabe: "Nao tenho essa informacao no momento,
      mas nossa equipe pode te ajudar amanha."
```

### Atualizacao

```
- Proprietario pode substituir PDF existente
- Ao substituir: embeddings antigos sao deletados, novos sao gerados
- Proprietario pode testar no dashboard:
  "Pergunte algo" → ve a resposta que a IA daria
```

---

## 7. Fila de Espera

```
1. Sem horario disponivel para o servico/profissional desejado

2. IA oferece fila de espera:
   "Posso te colocar na lista de espera. Se abrir uma vaga,
   te aviso pelo WhatsApp. Quer entrar na fila?"

3. Cliente aceita → registra no banco:
   → tenant_id, contact_id, service_id, professional_id (opcional)
   → Preferencias: dias/horarios que prefere
   → Posicao na fila (FIFO)

4. Quando um horario e cancelado:
   → Sistema verifica se alguem na fila se encaixa
   → Envia mensagem: "Boa noticia! Abriu uma vaga pra [Servico]
      no dia [Data] as [Hora] com [Profissional]. Quer agendar?"
   → Cliente tem 2 horas pra responder
   → Se nao responder: proximo da fila e notificado
   → Se responder "sim": agendamento criado automaticamente
   → Se responder "nao": proximo da fila

5. Cliente pode sair da fila a qualquer momento
```

---

## 8. Notificacoes e Lembretes

### Para o Cliente (via WhatsApp)

```
Confirmacao de Agendamento (imediato):
  "Agendamento confirmado! ✓
   Servico: [Servico]
   Profissional: [Nome]
   Data: [Data] as [Hora]
   Local: [Endereco]
   Valor: R$ [Preco]

   Pra cancelar ou reagendar, e so me chamar aqui."

Lembrete D-1 (dia anterior, 18:00):
  "Oi [Nome]! Lembrando que amanha voce tem [Servico]
   as [Hora] com [Profissional]. Te esperamos!
   Precisa reagendar? E so responder aqui."

Lembrete no Dia (2 horas antes):
  "Oi [Nome]! Seu [Servico] e daqui a 2 horas, as [Hora].
   Ate logo!"

Pos-Atendimento (24 horas depois):
  "Oi [Nome]! Como foi seu [Servico] com [Profissional]?
   De 1 a 5, qual sua nota? Seu feedback nos ajuda muito!"

Fila de Espera (quando abre vaga):
  "Boa noticia! Abriu uma vaga pra [Servico] no dia [Data]
   as [Hora]. Quer agendar? Responda SIM ou NAO."
```

### Para o Proprietario/Secretaria

```
Resumo Diario (enviado as 07:30 via WhatsApp ou email):
  "Bom dia! Resumo da noite:
   • [X] contatos recebidos
   • [Y] agendamentos realizados pela IA
   • [Z] conversas pendentes (precisam de voce)
   • [W] cancelamentos
   Acesse o dashboard: [link]"

Alerta Imediato (push no dashboard):
  → Novo agendamento feito pela IA
  → Conversa marcada como handoff
  → Cancelamento realizado
  → Cliente na fila de espera ha mais de 48h sem vaga
```

---

## 9. Transicao IA ↔ Humano

### Inicio do Turno da IA

```
Horario configurado chega (ex: 18:01):
  → Sistema ativa modo IA
  → Proxima mensagem recebida: IA responde
  → Nao envia mensagem proativa "agora e a IA" (seria estranho)
```

### Fim do Turno da IA

```
Horario configurado chega (ex: 08:00):
  → Sistema desativa modo IA
  → Se ha conversas em andamento:
    → IA envia: "Nosso time ja esta disponivel!
       A partir de agora voce sera atendido pela nossa equipe. Bom dia!"
  → Proximas mensagens: secretaria ve no dashboard e responde
  → Conversas pendentes (handoff) ficam destacadas no dashboard
```

### Modo Hibrido (secretaria + IA no mesmo dia)

```
- Se secretaria sair pra almoco: pode ativar IA manualmente no dashboard
  (botao "Ativar IA agora")
- Se secretaria precisar sair mais cedo: ativa IA antes do horario programado
- Se proprietario quiser IA 24h: configura horario como 00:00-23:59
- Se proprietario quiser IA apenas em feriados/fins de semana: configura dias
```

---

## 10. Metricas e Relatorios

### Metricas Rastreadas

```
Atendimento:
  - Total de contatos por periodo
  - Contatos por horario (mapa de calor: quando mais procuram)
  - Tempo medio de primeira resposta (IA)
  - Conversas resolvidas pela IA vs handoff para humano
  - Taxa de satisfacao (NPS pos-atendimento)

Agendamento:
  - Total de agendamentos por periodo
  - Taxa de conversao: contatos → agendamentos
  - Taxa de no-show: agendados → nao compareceram
  - Taxa de cancelamento
  - Horarios mais procurados
  - Servicos mais procurados
  - Profissionais mais procurados
  - Fila de espera: tamanho medio, tempo medio de espera

Financeiro:
  - Receita estimada (agendamentos x preco do servico)
  - Receita perdida estimada (no-shows x preco do servico)
  - Receita recuperada (fila de espera que converteu)

Comparativo:
  - Periodo atual vs anterior (semana, mes)
  - Desempenho por profissional
  - Desempenho IA vs horario humano
```

### Relatorios Automaticos

```
- Semanal: resumo de performance enviado por email/WhatsApp (segunda de manha)
- Mensal: relatorio completo com graficos (disponivel no dashboard)
```

---

## 11. Multi-Tenancy e Isolamento

```
Regra de ouro: um tenant NUNCA ve dados de outro.

Implementacao:
  - Toda tabela tem coluna tenant_id (NOT NULL, indexed)
  - Toda query tem WHERE tenant_id = ? (sem excecao)
  - Middleware extrai tenant_id do JWT e injeta automaticamente
  - Logs incluem tenant_id pra debug
  - Embeddings da knowledge base sao filtrados por tenant_id
  - Conversas do WhatsApp sao vinculadas ao tenant_id do numero conectado

Hierarquia de acesso:
  → Owner: acesso total (config, financeiro, relatorios, tudo)
  → Admin: tudo exceto financeiro/billing
  → Secretary: agenda, conversas, clientes (nao ve config nem billing)
```

---

## 12. Ciclo de Vida do Cliente (Contato)

```
                    ┌─────────────┐
                    │   NOVO      │ ← Primeiro contato via WhatsApp
                    └──────┬──────┘
                           │
                    ┌──────▼──────┐
                    │ EM CONVERSA │ ← IA ou humano interagindo
                    └──────┬──────┘
                           │
              ┌────────────┼────────────┐
              │            │            │
       ┌──────▼──────┐ ┌──▼───┐ ┌──────▼──────┐
       │  AGENDADO   │ │ FILA │ │  DESISTIU   │
       └──────┬──────┘ └──┬───┘ └─────────────┘
              │           │
       ┌──────▼──────┐    │
       │ CONFIRMADO  │◄───┘ (quando abre vaga)
       └──────┬──────┘
              │
    ┌─────────┼─────────┐
    │         │         │
┌───▼───┐ ┌──▼────┐ ┌──▼──────┐
│ATENDIDO│ │NO-SHOW│ │CANCELADO│
└───┬───┘ └───────┘ └─────────┘
    │
┌───▼────────┐
│POS-ATENDIDO│ ← NPS coletado, feedback registrado
└────────────┘
```

---

## 13. Seguranca e Compliance

```
LGPD:
  - Dados minimos: nome, telefone (coletados via WhatsApp)
  - Consentimento implicito: ao iniciar conversa, cliente aceita atendimento
  - Direito ao esquecimento: proprietario pode deletar dados do cliente
  - Dados de saude (se clinica): tratados como dados sensiveis
  - Retencao: conversas mantidas por 12 meses, depois anonimizadas

CFM (se clinica de saude):
  - IA NUNCA da diagnostico ou orientacao clinica
  - IA funciona APENAS como secretaria (agendamento, duvidas administrativas)
  - Alinhado com Resolucao CFM 2.454/2026

WhatsApp/Meta:
  - Uso exclusivo via API oficial (Evolution API)
  - Sem spam: IA so responde, nunca envia mensagem nao solicitada
  - Excecao: lembretes de agendamento confirmado e fila de espera (opt-in)
  - Templates de mensagem seguem politicas da Meta

Dados:
  - Senhas: bcryptjs salt 12
  - JWT: expira em 24h, refresh token em 7 dias
  - API keys: nunca expostas no frontend
  - PDFs: armazenados com acesso restrito por tenant_id
  - Embeddings: isolados por tenant_id
  - Backups: diarios automaticos do banco
```

---

## 14. Limites e Fair Use

```
| Recurso | Starter | Pro |
|---------|---------|-----|
| Profissionais | 3 | 10 |
| Conversas/mes | 1.000 | Ilimitado |
| PDFs knowledge base | 5 | 20 |
| Tamanho max PDF | 10MB | 10MB |
| Historico conversas | 6 meses | 12 meses |
| Relatorios | Basico | Avancado |
| Fila de espera | Sim | Sim |
| Suporte | Email | Email + WhatsApp prioritario |

Conversas = troca de mensagens com um contato unico em um dia.
Ex: cliente manda 10 msgs em uma conversa = 1 conversa.

Se atingir limite de conversas (Starter):
  → IA responde: "No momento nosso atendimento automatico esta indisponivel.
     Por favor entre em contato amanha a partir das [horario]."
  → Notifica proprietario: "Voce atingiu o limite de conversas do plano Starter.
     Faca upgrade para o plano Pro para conversas ilimitadas."
```

---

## 15. Monetizacao Futura (Roadmap Comercial)

```
Fase 1 (Lancamento):
  - Planos Starter e Pro
  - Cobranca via Asaas (PIX + boleto)

Fase 2 (6 meses):
  - Marketplace de integracoes (Google Calendar, Calendly, ERPs)
  - Cobranca do cliente final via WhatsApp (Asaas integrado)
  - Plano anual com desconto (10 meses pelo preco de 12)

Fase 3 (12 meses):
  - White-label (estabelecimento usa com sua propria marca)
  - API publica para desenvolvedores
  - Programa de afiliados/revendedores
```
