# Logos reais na Central de Conectores

Pouco trabalho, dá para fazer antes da gravação. Muda só a aparência, nada no funcionamento.

## O que muda
- Os círculos com letras (G, Sl, Ff, tl, Fa, Me, Ag, Zm, Ms) dão lugar aos logos oficiais de cada empresa: Granola, Slack, Fireflies, tl;dv, Fathom, Google Meet, Google Agenda, Zoom e Microsoft Teams.
- Cada logo fica numa moldura quadrada arredondada, com fundo claro e sombra suave, no estilo Creme/Bento. Os logos ficam um pouco maiores que os ícones de hoje, para ganhar presença no cartão.
- Os cartões "Em breve" (Zoom e Teams) mostram o logo levemente esmaecido, para ficar claro que ainda não estão disponíveis.
- O painel lateral que abre ao clicar no cartão também passa a mostrar o logo real.
- No modo escuro, a moldura continua clara para os logos ficarem legíveis.

## Detalhes técnicos
- Novo `src/components/brand/ConnectorLogo.tsx`: mapa `id -> SVG inline` (logos oficiais simplificados, cores de marca dentro do SVG, que é permitido por ser arte de marca). Reaproveita o `SlackIcon` que já existe.
- `connectorsCatalog.ts` mantém `mono` como reserva caso algum logo não exista.
- `src/pages/v2/Conectores.tsx`: troca o monograma no tile e no sheet por `ConnectorFrame` + `ConnectorLogo` (tamanho `lg`), com `opacity-60 grayscale` em `coming_soon`.
- Sem chamadas externas (sem Logo.dev): os logos ficam no próprio código, carregam na hora e não quebram durante a gravação.
- Conferência visual com captura da página antes de entregar.
