# Pesquisa de Mercado — SecretarIA

> Pesquisa realizada em 16/03/2026 | Viabilidade do projeto

---

## 1. Tamanho do Mercado

| Indicador | Dado |
|-----------|------|
| Mercado saúde digital Brasil (2025) | USD 12,4 bilhões |
| Projeção 2034 | USD 44,6 bilhões (CAGR 15,3%) |
| Healthtechs ativas no Brasil | 1.200+ |
| Brasil na LatAm | 64,8% das healthtechs, ~80% dos investimentos |
| Investimentos em healthtechs BR (2024) | R$ 2,1 bilhões (+18% YoY) |
| Mercado global chatbots healthcare | USD 1,49B (2025) → USD 10,26B (2034), CAGR 23,92% |

---

## 2. Público-Alvo: Clínicas no Brasil

| Indicador | Dado |
|-----------|------|
| Clínicas médicas registradas | ~291.362 |
| Micro e pequenas empresas (MPEs) | 81% do total |
| Novas clínicas abertas (2022) | 42.717 |
| Médicos ativos (2025) | ~635 mil |
| Dentistas ativos | 370 mil+ (maior do mundo) |
| Maturidade digital do setor | Apenas 46,19% |

**Concentração geográfica:** SP (33.193), RJ (16.845), Salvador (6.328), Brasília (6.315), BH (6.146).

---

## 3. Dores Principais das Clínicas

### 3.1 No-Show (Faltas)
- Taxa média: **20-30%** dos agendamentos
- 31% das instituições com taxa > 11%
- Prejuízo: **15-30% do faturamento bruto**
- Clínica média: até **R$ 144 mil/ano** em perdas
- Solução: lembretes WhatsApp reduzem no-show em **até 60%**

### 3.2 Agendamento
- 42,2% das clínicas têm dificuldade em confirmar consultas
- 90% ainda usam telefone como canal principal
- 33% dos agendamentos acontecem fora do horário comercial (sem resposta)
- Clínicas perdem até R$ 144 mil/ano por problemas de agendamento

### 3.3 Atendimento
- Excesso de ligações telefônicas = problema operacional #1
- Pacientes não conseguem falar com atendente → frustração e desistência
- 68% dos gestores apontam gargalos operacionais como entraves críticos

### 3.4 Pós-Atendimento
- Quase nenhuma clínica faz follow-up sistemático
- Oportunidade comprovada: +30% de recorrência com follow-up automatizado
- NPS automatizado pós-consulta ainda é raro

---

## 4. WhatsApp no Brasil — O Canal

| Indicador | Dado |
|-----------|------|
| Usuários WhatsApp no Brasil | ~197 milhões |
| Smartphones com WhatsApp | 99% |
| Acesso diário | 97% dos usuários |
| Médicos que usam WhatsApp com pacientes | 90% |
| Clínicas que usam WhatsApp | 79% |
| PMEs no WhatsApp Business | 5 milhões |
| Preferência do consumidor | 92% preferem WhatsApp |

**Regulação importante (15/jan/2026):** Meta proibiu chatbots genéricos na API WhatsApp Business. Soluções precisam ser homologadas. Evolution API (nossa stack) é uma solução self-hosted compatível.

---

## 5. Concorrência

### 5.1 Concorrentes Diretos

#### Cloudia (líder) — cloudia.com.br
- **Base:** 1.000-1.500 clínicas, 86M+ atendimentos, 3.3M+ consultas agendadas
- **Preço:** R$ 449-1.039/mês + setup R$ 700 + fidelidade 3 meses
- **Forças:** IA madura, omnichannel, muitas integrações, maior base de dados
- **Fraquezas:** Setup leva 45 dias, pós-venda ruim (Reclame Aqui), difícil cancelar, preço crescente

#### Secretaria IA — usesecretariaia.com
- **Base:** 150+ clínicas
- **Preço:** R$ 597-997/mês (sem setup)
- **Forças:** Anti-alucinação, resposta <35s, sem taxa de setup
- **Fraquezas:** Muito caro, escala pequena, só WhatsApp

#### WorkAI — workai.com.br
- **Funding:** R$ 5,5M captados, crescimento 40%/mês
- **Forças:** IA avançada (Claude, OpenAI), LGPD compliant
- **Fraquezas:** Marca nova, preço opaco

#### Botdesigner — botdesigner.io
- **Resultados:** 60% agendamentos via bot, -30% absenteísmo
- **Fraquezas:** Preço opaco, foco em empresas maiores

### 5.2 Concorrentes Indiretos (gestão com chatbot)

| Solução | Preço/mês | Reclame Aqui | Análise |
|---------|-----------|--------------|---------|
| Doctoralia | R$ 200-600 | 6.9/10 | Marketplace, NÃO faz WhatsApp do médico |
| Feegow | R$ 0-149/prof | 7.1/10 | Chatbot básico, potencial integração |
| iClinic (Afya) | R$ 89-299/prof | Suporte ruim | Chatbot não é foco |
| Clinicorp | R$ 149-1.000+ | — | Usa Cloudia, foco odontológico |
| Clínica nas Nuvens | R$ 499+ | — | Chatbot integrado, preço alto |

### 5.3 Referência Internacional

| Solução | Preço/mês | Avaliação | Foco |
|---------|-----------|-----------|------|
| Hyro | $10.000+ | 4.9/5 G2 | Enterprise |
| Luma Health | ~$250/usuário | 4.7/5 | Patient engagement |
| Phreesia | $300-800+ | 83% satisf. | Intake + pagamentos |
| DeepCura | $129/provider | 4.6/5 | All-in-one |

### 5.4 Comparativo de Preços

| Solução | Preço/mês | Setup |
|---------|-----------|-------|
| **SecretarIA (nós)** | **R$ 349** | **Gratuito (QR code)** |
| Cloudia | R$ 449-1.039 | R$ 700 |
| Secretaria IA | R$ 597-997 | Gratuito |
| Clínica nas Nuvens | R$ 499+ | ? |
| WorkAI | Não divulga | ? |

---

## 6. O Que Está Saturado

1. **Agendamento online básico** — dezenas de soluções já fazem (commodity)
2. **Lembretes simples** de consulta por SMS/WhatsApp — commodity
3. **Chatbots baseados em menu/árvore de decisão** — pacientes já frustrados
4. **Software de gestão clínica (ERP/PEP)** — mercado fragmentado com muitos players

---

## 7. Onde Estão as Oportunidades

### 7.1 IA Conversacional Real (LLM)
Bot que entende linguagem natural, tem contexto da clínica, responde como secretária humana. **Pouquíssimos fazem isso no Brasil.** A maioria usa fluxos rígidos/menus.

### 7.2 Pós-Atendimento Automatizado Inteligente
Follow-up personalizado, NPS, reativação de pacientes inativos. Quase ninguém faz bem. Comprovado: +30% recorrência.

### 7.3 Cobrança Integrada ao Fluxo de Atendimento
PIX automático + boleto recorrente dentro do WhatsApp. Pix Automático lançado em jun/2025 abre caminho. Poucos concorrentes unificam atendimento + agendamento + cobrança.

### 7.4 Clínicas Populares e Pequenas
81% são MPEs. Mercado subatendido por tecnologia. Crescimento expressivo no Nordeste e Centro-Oeste.

### 7.5 Triagem Pré-Consulta via WhatsApp
Qualificar paciente antes do agendamento (sintomas, urgência, especialidade). Pouco explorado.

### 7.6 Análise Preditiva de No-Show
IA para prever quais pacientes têm maior probabilidade de faltar e intervir proativamente.

### 7.7 Setup Instantâneo (Self-Service)
Cloudia leva 45 dias para implantar. Oportunidade para onboarding em minutos via QR code.

---

## 8. Casos de Sucesso com Números

| Caso | Resultado |
|------|-----------|
| Complexo médico (Cloudia) | 117.407 agendamentos/ano via chatbot; IA faz 3x mais que melhor atendente |
| Hospital em SP (omnichannel) | -33% no-show; 98,8% cancelamentos registrados antecipadamente |
| Clínica com automação completa | Faturamento de R$ 1,5M → R$ 2,15M (+43%) |
| Clínica oftalmológica | Follow-up automático: +30% recorrência |
| Clínicas odontológicas | No-show reduzido de ~30% para 2,7% |
| Abramed (geral) | No-show reduzido para 13,5% com lembretes integrados |

---

## 9. Regulamentações Relevantes

### LGPD (Lei 13.709/2018)
- Dados de saúde = **dados sensíveis** (proteção reforçada)
- Multas: 2% do faturamento até R$ 50 milhões por infração
- DPO obrigatório

### Resolução CFM 2.454/2026 — IA na Medicina (NOVA)
- Publicada em fev/2026, entra em vigor ago/2026
- IA = ferramenta de apoio, médico é responsável final
- **PROIBIDO:** comunicar diagnósticos ou decisões terapêuticas por sistemas automatizados
- **SecretarIA está alinhado:** apenas funções administrativas (agendamento, lembretes, pós-atendimento)

### WhatsApp Business API
- Meta proibiu chatbots genéricos em 15/jan/2026
- Necessário usar API oficial ou plataformas homologadas
- Evolution API (nossa stack) é self-hosted e compatível

---

## 10. Diferenciais Competitivos do SecretarIA

| # | Diferencial | Por quê |
|---|------------|---------|
| 1 | **IA generativa real (GPT-4.1-mini)** | Maioria dos concorrentes usa menu/árvore de decisão |
| 2 | **Preço 22-42% menor** (R$ 349 vs R$ 449-997) | Clínicas pequenas são sensíveis a preço |
| 3 | **Setup instantâneo** (QR code, minutos) | Cloudia leva 45 dias |
| 4 | **Sem fidelidade longa** (mensal) | Concorrentes exigem 3-12 meses |
| 5 | **Pós-atendimento automatizado** | Quase ninguém faz bem |
| 6 | **Cobrança integrada** (Asaas: PIX + boleto) | Poucos unificam atendimento + cobrança |
| 7 | **WhatsApp self-hosted** (Evolution API) | Custo baixo, sem dependência de terceiros |
| 8 | **n8n para automações** | Workflows customizáveis sem código |
| 9 | **Multi-tenant SaaS** | Acessível para clínicas populares |
| 10 | **Preço transparente** | Vários concorrentes escondem preço |

---

## 11. Riscos a Monitorar

1. **Cloudia** com IA madura e 86M+ atendimentos de dados de treino
2. **WorkAI** com R$ 5,5M de funding e crescimento 40%/mês
3. Softwares de gestão podem embutir chatbot IA como feature nativa
4. Churn alto no setor — clínicas trocam de ferramenta com frequência
5. Regulação CFM pode se tornar mais restritiva
6. Dependência de API da OpenAI (custo e disponibilidade)

---

## 12. Conclusão — Viabilidade

### O cenário é ALTAMENTE FAVORÁVEL:

- **Mercado enorme:** 291 mil clínicas, 81% MPEs, baixa maturidade digital (46%)
- **Dor real e mensurável:** no-show custa até R$ 144 mil/ano por clínica
- **Canal dominante:** 197M de brasileiros no WhatsApp, 90% dos médicos já usam
- **Gap competitivo claro:** muitos fazem agendamento básico (saturado), poucos fazem IA conversacional real + pós-atendimento + cobrança integrada
- **Timing perfeito:** Pix Automático (jun/2025), regulação IA na medicina (fev/2026), Meta exigindo APIs homologadas (jan/2026)
- **TAM estimado:** 291 mil clínicas × R$ 349/mês = R$ 1,2 bilhão/ano de TAM
- **SAM realista (MPEs):** 235 mil clínicas × R$ 349/mês = R$ 984 milhões/ano
- **Meta 1º ano:** 100 clínicas × R$ 349 = R$ 418.800/ano

**O SecretarIA não é "mais um chatbot". É uma secretária virtual completa com IA real, cobrança integrada e pós-atendimento — numa faixa de preço acessível para clínicas que hoje perdem dinheiro com no-show e atendimento manual.**
