

# Finalizar S1.4 — Templates de Nota

## Problema

Build quebrado em `NewNoteDialog.tsx` (linhas 496, 507, 514): `t` é referenciado mas nunca destruturado. Além disso, faltam todas as chaves i18n usadas pelos templates em `src/lib/noteTemplates.ts`.

## Mudanças

### 1. `src/components/NewNoteDialog.tsx`
Adicionar `const { t } = useTranslation();` no topo do componente (logo após `useState` iniciais), aproveitando o import já existente de `react-i18next`.

### 2. `src/i18n/locales/pt-BR.json`, `en.json`, `es.json`
Adicionar bloco `newNote.templates` em cada arquivo (sem remover `feedback.newNote` que já existe — namespace diferente). Estrutura:

```json
"newNote": {
  "templates": {
    "blank": "Em branco",
    "blankDesc": "...",
    "oneOnOne": "1:1 semanal",
    "oneOnOneDesc": "...",
    "oneOnOneTitle": "1:1 — [data]",
    "postProject": "Pós-projeto",
    "postProjectDesc": "...",
    "postProjectTitle": "Retrospectiva de projeto",
    "difficultFeedback": "Feedback difícil",
    "difficultFeedbackDesc": "...",
    "difficultFeedbackTitle": "Conversa de alinhamento",
    "sections": {
      "howAreYou": "Como você está?",
      "progress": "Progresso desde o último 1:1",
      "blockers": "Bloqueios e dúvidas",
      "nextSteps": "Próximos passos",
      "context": "Contexto do projeto",
      "contribution": "Contribuição do(a) liderado(a)",
      "impact": "Impacto e resultados",
      "learning": "Aprendizados",
      "situation": "Situação observada",
      "behavior": "Comportamento específico",
      "impactObserved": "Impacto observado",
      "expectation": "Expectativa daqui pra frente"
    },
    "prompts": {
      "howAreYou": "Energia, carga de trabalho, vida pessoal...",
      "progress": "O que avançou? O que ficou para trás?",
      "blockers": "Algo travando? Como posso ajudar?",
      "nextSteps": "Compromissos para a próxima semana",
      "projectContext": "Qual era o objetivo? Prazo? Stakeholders?",
      "contribution": "O que essa pessoa fez especificamente?",
      "impact": "Resultado mensurável ou qualitativo",
      "learning": "O que foi aprendido para próximos ciclos",
      "situation": "Quando aconteceu? Em qual contexto?",
      "behavior": "O que essa pessoa fez ou disse exatamente?",
      "impactObserved": "Que efeito teve no time / projeto / cliente?",
      "expectation": "O que espero diferente da próxima vez?"
    }
  }
}
```

Versões EN/ES traduzidas em paralelo (mesmo schema, conteúdo localizado).

## Conflito de namespace

`pt-BR.json` linha 204 já tem `"newNote": "Nova Nota"` dentro de outro objeto pai (provavelmente `dashboard` ou similar). O novo bloco `"newNote": { "templates": {...} }` será no nível raiz — sem conflito porque é um sibling top-level.

## Validação

- Build TypeScript passa sem erros em `NewNoteDialog.tsx`.
- Abrir "Nova Nota" e clicar em cada um dos 4 templates: editor preenche com cabeçalhos+prompts traduzidos; "Em branco" limpa o editor.
- Trocar para EN/ES via `ThemeSelector` e reabrir o dialog: labels e conteúdo dos templates aparecem traduzidos.

## Arquivos modificados

1. `src/components/NewNoteDialog.tsx` — adicionar `const { t } = useTranslation();`
2. `src/i18n/locales/pt-BR.json` — adicionar bloco `newNote.templates`
3. `src/i18n/locales/en.json` — adicionar bloco `newNote.templates`
4. `src/i18n/locales/es.json` — adicionar bloco `newNote.templates`

