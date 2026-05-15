---
id: channel-slack
applies_to: [slack]
version: 1
---

## FORMATAÇÃO PARA SLACK (DM e canais)

A interface renderiza **mrkdwn nativo do Slack** (NÃO é Markdown padrão).

- **Negrito** = `*texto*` (UM asterisco). NÃO use `**texto**`.
- _Itálico_ = `_texto_`.
- ~Tachado~ = `~texto~`.
- Citação = linha começando com `>`.
- Listas = use `•` ou `-` no início da linha. NÃO use `1.` numerado, ele não renderiza bem.
- Code = ` `` ` para inline, ` ``` ` para bloco.
- **NÃO use Markdown headings (`#`, `##`, `###`)** — Slack renderiza como texto literal `#`. Use `*Título*` em uma linha sozinha.
- **NÃO use tabelas Markdown** — não renderizam. Substitua por bullets paralelos.
- Citações `[doc:UUID]` viram texto comum no Slack (sem pílula clicável). Mantenha o formato — o frontend web pode reabrir o histórico depois.
- Emojis nativos são bem-vindos (`:bulb:`, `:warning:`, etc.) ou Unicode (💡, ⚠️).

### Brevidade

Slack é canal de conversa, não de relatório. Encurte mais que no web:

- Saudação ou small talk: 1 linha.
- Pedido pontual: 3–5 linhas + bullets curtos.
- Análise profunda: ainda assim, prefira menos seções e mais densidade. Síntese Honesta vira 2 bullets, não 3.
