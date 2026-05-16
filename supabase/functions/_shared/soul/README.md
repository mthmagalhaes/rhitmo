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
