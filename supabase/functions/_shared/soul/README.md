---
id: readme
applies_to: [meta]
version: 1
---

# Rhitmo Soul

Esta pasta é a **fonte única da alma da Rhitmo**. Todo system prompt do produto (web Mentor Chat, Slack DM, /comandos, wizards) é montado a partir dos `.md` aqui.

## Regra de ouro

> Toda mudança de comportamento da Rhitmo (identidade, guard-rail, tom, modo, canal) começa por um `.md` desta pasta. Prompt inline em edge function = bug.

## Estrutura

```
soul/
  00-identity.md          Quem é a Rhitmo, missão, diferencial
  01-guardrails.md        Anti-alucinação, rastreabilidade, segurança, anti-jailbreak,
                          anti-prompt-injection
  02-analysis-matrix.md   Camada Fática + Comportamental + Síntese (detector de Melancia)
  03-tone-and-format.md   Tom HR Executive + diretrizes + "resposta proporcional ao input"
  04-drafting.md          Gerador de rascunhos calibrado por Rhitmo Sync
  05-citations.md         Protocolo [doc:UUID] e janela temporal
  06-identity-protocol.md Protagonista / filtro de ruído / apelidos
  07-memory.md            Memória de relacionamento (rhy_context_cache) + calibração por uso
  08-disc-calibration.md  Calibração de tom por perfil DISC / work_style_data
  modes/
    leader-member.md      Líder analisando liderado X (web + Slack via /mentor)
    leader-self.md        Coaching pessoal do líder (DM Slack + Mentor sem liderado)
    member-self.md        Liderado falando da própria carreira (Meu Rhitmo)
    pulse-survey.md       Pulse conversacional
    one-on-one-prep.md    Preparação de 1:1
    self-review.md        Wizard de autoavaliação
    monthly-recap.md      Rhitmo Mensal (3 blocos: Mandou bem / Atenção / Padrão)
    quarterly-recap.md    Rhitmo Trimestral (6 blocos: destaques → ação)
  channels/
    web.md                Markdown rico, H3 com emoji, blockquotes, pílulas [doc:UUID]
    slack.md              *negrito*, _itálico_, • bullets, sem H3, sem tabelas
    whatsapp.md           *negrito* simples, sem #, sem tabelas, brevidade máxima
```

## Como compor

```ts
import { composeSystemPrompt } from "./loader.ts";

const prompt = composeSystemPrompt({
  mode: "leader-member",       // qual conjunto de docs carrega
  channel: "web",              // formatação final
  vars: { memberName, firstName, ... },  // substitui {{var}}
  appendices: [contextLines],  // texto dinâmico (evidências, dados de RAG)
});
```

A ordem de concatenação é estável (definida em `loader.ts`) para que mudanças nos `.md` produzam diffs reproduzíveis no snapshot dos prompts finais.

## Arquivos adicionados (v2)

| Arquivo | Descrição |
|---|---|
| `07-memory.md` | Instruções sobre uso do `rhy_context_cache` e calibração por profundidade de uso |
| `08-disc-calibration.md` | Calibração de tom e abordagem por perfil DISC/work_style_data |
| `modes/monthly-recap.md` | Geração e confirmação do Resumo Mensal (Rhitmo Mensal) |
| `modes/quarterly-recap.md` | Geração e confirmação do Acompanhamento Trimestral |
| `channels/whatsapp.md` | Formatação para canal WhatsApp (futuro) |

## Variáveis novas (adicionar ao loader.ts)

| Variável | Tipo | Fonte |
|---|---|---|
| `{{sessionSummary}}` | string | `rhy_context_cache.summary` |
| `{{sessionCount}}` | number | `rhy_context_cache.session_count` |
| `{{pendingActions}}` | string[] | `rhy_context_cache.pending_actions` |
| `{{monthlyRecaps}}` | object[] | `monthly_recaps` confirmados do período |
| `{{previousQuarterSummary}}` | object | `quarterly_recaps` do trimestre anterior |
| `{{quarterLabel}}` | string | Ex.: "Q1 2026 (Jan–Mar)" |
| `{{monthlyRecapCount}}` | number | Quantidade de mensais confirmados no trimestre |
| `{{nextQuarterDate}}` | string | Data de início do próximo trimestre |
| `{{periodStart}}` / `{{periodEnd}}` | date | Início e fim do período de análise |
| `{{evidenceCount}}` | number | Quantidade de feedbacks no período |
| `{{nextMonth}}` | string | Nome do próximo mês |

Todas as novas vars são opcionais. Chamadas existentes sem essas chaves continuam funcionando — placeholders ausentes permanecem visíveis (`{{var}}`) para debug.

## Ordem de carregamento (loader.ts) — atualizada

```
Base disponível:
  00-identity → 01-guardrails → 02-analysis-matrix →
  03-tone-and-format → 04-drafting → 05-citations →
  06-identity-protocol → 07-memory → 08-disc-calibration

Modo (um por chamada):
  modes/leader-member | leader-self | member-self |
  monthly-recap | quarterly-recap |
  one-on-one-prep | pulse-survey | self-review

Canal (um por chamada):
  channels/web | slack | whatsapp
```

Nota: os modos só carregam os blocos que listam em `extends` — 07-memory e 08-disc-calibration são incluídos pelos modos `leader-self`, `monthly-recap` e `quarterly-recap`. Os demais modos permanecem inalterados para preservar snapshots existentes.
