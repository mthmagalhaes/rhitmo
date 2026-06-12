## Diagnóstico

A Journey 3 atual ("Feedback no calor do momento") promete algo que a Rhitmo **não faz hoje**: um bot do Slack que detecta fim de projeto e pergunta proativamente a um par como a Ana mandou (peer feedback automático cross-member). Isso só existe parcialmente como `request-peer-feedback` no fluxo formal de 360°, não como nudge contínuo no Slack pós-projeto. Vender isso na landing é promessa furada.

O que a Rhitmo **realmente** entrega de valor nesse ato da jornada é o **Diário de Bordo**: o líder (Matheus / José) registra evidências privadas sobre cada liderado — anotações de 1:1, check-ins, feedbacks difíceis, melhorias, destaques, recortes do Slack — e a Rhitmo nunca esquece. Essa memória vira matéria-prima para 1:1, brief, recap mensal/trimestral e avaliação formal. É o "anti-recência" — o líder não precisa lembrar de tudo no Q-end porque está tudo lá, organizado por pessoa e por tag.

## Proposta para Journey 3 (PT + EN)

Mantém a imagem de fundo (`sunsetCliff` / pôr do sol no penhasco — metáfora de "fim de dia, momento de registrar"). Troca o mock e o copy.

**Tag:** `MEMÓRIA` (PT) / `MEMORY` (EN)
**Label do pager:** `Diário` / `Journal`
**Título:** `A memória que líder bom não tem tempo de manter` (PT) / `The memory great leaders don't have time to keep` (EN)
**Body (PT):** `Toda conversa de corredor, feedback difícil, destaque ou padrão preocupante vira uma nota privada no Diário de Bordo da Ana. Quando chegar a 1:1, a avaliação ou o recap trimestral, nada se perde — a Rhitmo lembra por você.`
**Body (EN):** `Every hallway chat, hard feedback, highlight or worrying pattern becomes a private note in Ana's journal. When the 1:1, review or quarterly recap comes around, nothing is lost — Rhitmo remembers for you.`

## Mock novo: `journal` (recorte do Diário de Bordo)

Substitui o mock `peerFeedback`. Card branco `rounded-2xl shadow-2xl` (mesma DNA dos outros mocks, ~320px). Recorte fiel do print enviado:

```text
┌──────────────────────────────────────────┐
│ 📓 Diário de Bordo            🔒 privado │
│ 6 registros · Gabriela Lucas             │
├──────────────────────────────────────────┤
│ [🎯 1:1] [✅ Check-in] [🔥 Difícil]      │
│ [⭐ Destaque]                            │
├──────────────────────────────────────────┤
│ ESTA SEMANA · 2                          │
│                                          │
│ 🔒 11/jun  🟠 Gabriela                   │
│    Apresentação Comfaster   📢 Reunião   │
│                                          │
│ 🔒 08/jun  🟠 Gabriela                   │
│    Alinhamento Operações    📢 Reunião   │
└──────────────────────────────────────────┘
```

- Header: ícone livro/notebook + "Diário de Bordo" + chip `🔒 privado` (reforça Zero Trust).
- Subtítulo: `6 registros · Gabriela Lucas` (mostra que é por pessoa).
- Linha de tag-chips: 1:1, Check-in, Difícil, Destaque (mostra taxonomia rica).
- Grupo "ESTA SEMANA · 2" + 2 linhas de nota com ícone de cadeado, data, avatar laranja, título e chip de origem ("Reunião"). Bate exatamente com a captura.
- EN: traduz títulos para `Captain's Log`/`Notes`, "THIS WEEK", "Hard feedback", "Highlight", "Meeting".

## Arquivos a tocar

1. **`src/components/landing/SarahJourneySection.tsx`**
   - `type MockKind`: adicionar `"journal"`, remover `"peerFeedback"` (não é usado em mais lugar nenhum — verificado).
   - `IMAGES`: trocar `peerFeedback: sunsetCliff` por `journal: sunsetCliff` (mantém a foto).
   - `JourneyMock`: substituir bloco `if (kind === "peerFeedback")` por novo bloco `if (kind === "journal")` renderizando o card acima. Usar `Lock`, `BookOpen`/`NotebookPen` do lucide, chips redondos `bg-slate-100`, avatar `bg-gradient-to-br from-orange-300 to-orange-400`, divisor `border-slate-100`. Sem dependências novas.

2. **`src/pages/Landing.tsx`**
   - Linha 69 (PT) e linha 280 (EN): trocar o ato 3.
     - PT: `{ tag: "MEMÓRIA", label: "Diário", title: "A memória que líder bom não tem tempo de manter", body: "Toda conversa de corredor, feedback difícil, destaque ou padrão preocupante vira uma nota privada no Diário de Bordo da Ana. Quando chegar a 1:1, a avaliação ou o recap trimestral, nada se perde — a Rhitmo lembra por você.", mock: "journal" as const }`
     - EN equivalente com `mock: "journal"`.

## O que NÃO muda

- Imagem de fundo (`journey-3-sunset.jpg`).
- Estrutura do `SarahJourneySection` (stage, pager, animação).
- Outros 3 atos (slackDM, oneOnOne, review) — só o ato 3 é refeito.
- Nenhum back-end, nenhuma rota, nenhuma migração.

## Validação

- `/` → scrollar até "Conheça a Ana" → clicar passo 3 → ver card Diário de Bordo sobre o pôr do sol.
- Toggle EN → confirmar copy traduzido + chips em inglês.
- Mobile: card aparece abaixo da foto (já é o padrão do componente).

## Reversão

Reverter os 3 blocos editados (tipo, mock, copy PT, copy EN). Sem efeito colateral.
