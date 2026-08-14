# Acessibilidade de contraste no Brand Kit v1

Auditei os tokens atuais de `src/index.css` calculando a razão de contraste (WCAG 2.1) de cada par usado em botões, cards, badges, tabelas e modais, nos temas claro e escuro. A identidade (creme, roxo, ondas) não muda: os ajustes ficam nas cores semânticas e em alguns textos esmaecidos.

## O que está reprovado hoje

| Uso | Contraste | Situação |
| --- | --- | --- |
| Texto branco sobre Warning `#F59E0B` (botão/badge) | 2,12:1 | Reprova (mínimo 4,5) |
| Texto Warning sobre branco (chip "Upload", alertas) | 2,12:1 | Reprova |
| Texto branco sobre Info `#0E9AE8` | 3,17:1 | Reprova |
| Texto branco sobre Success `#179268` | 3,94:1 | Reprova |
| Texto Success/Info sobre card branco | 3,17–3,94:1 | Reprova |
| Texto secundário sobre superfície `muted` | 4,43:1 | Reprova por pouco |
| Borda de input sobre fundo creme | 1,31:1 | Reprova (mínimo 3 para controle de formulário) |
| Destrutivo no tema escuro sobre card | 3,89:1 | Reprova |
| `text-slate-400` na landing (32 ocorrências) | ~2,9:1 sobre branco | Reprova |
| `text-muted-foreground/40–/60` (14 lugares no app) | 2,4–3,8:1 | Reprova |

Aprovados e mantidos como estão: corpo de texto (15,7:1), botão primário roxo com texto branco (5,67:1), links roxos, destrutivo claro, accent, e praticamente todo o tema escuro.

## Ajustes propostos

**1. Cores semânticas ganham duas faces**
Cada cor semântica passa a ter a versão "superfície" (fundo cheio) e a versão "forte" (texto e ícone sobre fundo claro):

- Warning: superfície continua o âmbar `#F59E0B`, mas o texto em cima vira tinta escura em vez de branco (8,2:1). Texto/ícone âmbar sobre branco passa a usar `warning-strong` `#A45904` (5,2:1).
- Info: superfície e texto passam a `#0972AE` (5,2:1 com branco e 5,2:1 sobre card).
- Success: superfície e texto passam a `#117E59` (5,1:1 nos dois sentidos).
- Destrutivo no escuro clareia para `#EF6C6C` (5,3:1).

**2. Texto secundário**
`--muted-foreground` escurece de `#6B6784` para `#655E78`, garantindo 5,1:1 mesmo sobre a superfície creme mais escura.

**3. Controles de formulário**
Separa `--input` de `--border`: a borda decorativa dos cards continua suave (`#DCD7CD`), enquanto inputs, selects e textareas ganham `#9C9285` para atingir os 3:1 exigidos de componentes de interface. O anel de foco roxo permanece.

**4. Limpeza de opacidades e cinzas fixos**
- Trocar `text-muted-foreground/40|50|60` por `text-muted-foreground` (14 arquivos: Diário, Pessoas, Mentor, ExecutiveBrief, WorkspaceSwitcher, ThreadsList, FormalReviewSheet e outros).
- Na landing e no SarahJourneySection, `text-slate-400` vira `text-slate-500` (metadados) ou `text-slate-600` (texto corrido); `text-gray-300/400` em HRTeams e MemberDetails vira `text-muted-foreground`.

**5. Chips de origem do diário e badges**
Os chips criados no brand kit (Bot, Upload, Transcrição, Granola, Slack, Nota) passam a usar a face "forte" de cada cor sobre o tint 10%, mantendo o visual suave com contraste ≥ 4,5:1.

**6. Estado desabilitado e foco**
Botões desabilitados hoje usam `opacity-50`, o que derruba o contraste do rótulo. Passam a usar superfície `muted` com texto `muted-foreground` (5,1:1), preservando a aparência de inativo. Confirmar que o anel de foco fica visível também sobre superfícies roxas e escuras.

## Verificação

Recalculo todos os pares após a mudança e capturo telas de login, landing, diário, avaliações e um modal nos temas claro e escuro para conferir que nada quebrou visualmente.

## Detalhes técnicos

- Fonte da verdade: blocos `:root` e `.dark` em `src/index.css`; novos tokens `--warning-strong`, `--info-strong`, `--success-strong` expostos em `tailwind.config.ts` como `warning.strong` etc.
- `src/lib/diarySource.ts`: classes dos badges apontam para as novas faces fortes.
- `src/components/ui/button.tsx` e `input.tsx`: variante desabilitada e borda de input.
- Nenhuma alteração de lógica, dados ou backend.
