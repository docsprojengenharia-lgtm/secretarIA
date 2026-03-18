---
paths:
  - "**/prompts**"
  - "**/services/bot*"
  - "**/services/ai*"
  - "**/*openai*"
---

# IA — OpenAI Integration

## Modelos

| Uso | Modelo | Por que |
|-----|--------|---------|
| Atendimento (chat) | gpt-4.1-mini | Melhor custo/beneficio pra conversacao |
| Classificacao de intencao | gpt-4.1-nano | Rapido e barato pra classificar |
| Embeddings (futuro) | text-embedding-3-small | Se precisar busca semantica |

- NUNCA usar gpt-4.1 (caro) sem justificativa clara
- NUNCA usar modelo deprecated — manter atualizado

## System Prompt do Bot

O prompt e o coracao do produto. Estrutura:

```
1. PAPEL: Voce e a secretaria virtual da [nome_clinica]
2. CONTEXTO: Informacoes da clinica (servicos, precos, horarios, endereco)
3. REGRAS: O que pode e nao pode fazer
4. FORMATO: Como responder (curto, educado, objetivo)
5. ESCALACAO: Quando encaminhar pra humano
```

- Prompt customizado por clinica (clinic_settings.system_prompt)
- Base compartilhada + override por clinica
- NUNCA inventar informacoes — se nao sabe, perguntar ou encaminhar
- NUNCA dar conselho medico — sempre direcionar pra consulta

## Classificacao de Intencao

Antes de gerar resposta, classificar:
```typescript
const intents = [
  'AGENDAR',        // Quer marcar consulta
  'CANCELAR',       // Quer cancelar/remarcar
  'DUVIDA_SERVICO', // Pergunta sobre servicos/precos
  'DUVIDA_HORARIO', // Pergunta sobre horarios/disponibilidade
  'FALAR_HUMANO',   // Quer falar com atendente
  'SAUDACAO',       // Oi, bom dia, etc.
  'OUTRO'           // Nao relacionado
] as const
```

- Classificacao via gpt-4.1-nano (rapido, barato)
- Output estruturado (JSON mode) — NUNCA confiar em texto livre pra classificacao

## Contexto da Conversa

- Enviar ultimas 10 mensagens como historico (nao o historico inteiro)
- Incluir dados do paciente se existir (nome, ultimo agendamento)
- Incluir configuracao da clinica (servicos, horarios, regras)
- Token budget: max 2000 tokens de contexto + 500 de resposta

## Custos

- Monitorar custo por clinica por mes
- Alerta se clinica exceder limite de tokens (possivel abuso)
- gpt-4.1-mini: ~$0.40/1M input, ~$1.60/1M output
- Estimativa: ~50-100 conversas/dia por clinica = ~R$5-15/mes em API
- Se custo subir: considerar cache de respostas comuns

## Guardrails

- Max tokens por resposta: 300 (respostas curtas e objetivas)
- Se paciente pedir algo fora do escopo: "Sou a secretaria virtual e posso ajudar com agendamentos e informacoes sobre a clinica."
- Se detectar emergencia medica: "Em caso de emergencia, ligue para o SAMU (192) ou va ao pronto-socorro mais proximo."
- Se detectar conteudo ofensivo: responder educadamente e nao engajar
- NUNCA gerar conteudo que possa ser interpretado como diagnostico medico

## Testes

- Testar prompts com cenarios reais antes de deploy
- Cenarios minimos: agendar, cancelar, duvida, fora do escopo, emergencia, ofensivo
- Manter log de conversas pra melhorar prompts (anonimizado)
