# Brand kit Rhitmo v1 — aplicar na plataforma e na landing

O kit enviado veio como galeria HTML (índice), sem os arquivos da pasta `assets`. Vou recriar cada elemento em código, como componentes SVG do projeto, seguindo exatamente a especificação do kit (geometria das três ondas, paleta, tipografia, raios e sombras). Nada de funcionalidade muda: só camada visual e de apresentação.

## 1. Tokens de cor

Alinhar `src/index.css` aos valores do kit (o essencial da paleta já bate; os ajustes são nas semânticas e nas superfícies quentes):

- success `#179268`, warning `#F59E0B`, info `#0E9AE8`, destructive `#DE2C2C`
- borda `#DCD7CD`, superfície muted `#EDEAE3`, link/hover roxo `#5B21C4` / `#4F20B6`
- manter creme `#F5F3EE`, foreground `#1A1035`, primary `#7C3AED`, accent `#F3F0FF`, muted-foreground `#6B6784`
- revisar equivalentes no bloco `.dark` (`#F0EFF4`, `#9898AA`)

Tudo continua em HSL e semântico. Nenhum componente ganha cor fixa.

## 2. Sistema de logo

Reescrever `src/components/RhitmoLogo.tsx` como sistema completo do kit:

- variantes: `wordmark` (sm/md/lg), `stacked`, `icon`
- tons: `primary` (sobre creme), `on-dark`, `mono` (cor única, herda `currentColor`)
- proporção das três ondas travada; só cor e opacidade mudam

A API atual (`size`, `iconOnly`, `className`) segue funcionando para não quebrar os ~15 pontos de uso (sidebar, auth, admin, e-mails, páginas legais, 404, convite).

## 3. Favicon e app icon

Gerar o ícone das três ondas em `public/favicon.svg` (novo desenho do kit) e apontar o `index.html` para ele, removendo o `favicon.ico` legado. App icon 120px do OAuth mantém o mesmo desenho.

## 4. Ondas, divisores e fundos

- `RhythmWave.tsx`: ajustar a geometria e as opacidades (0.04–0.08) para as texturas `wave-hero` e `wave-full` do kit, nas versões light e dark
- `WaveDivider.tsx`: divisor de 48px com a linha fina derivada da onda

## 5. Estados vazios

`EmptyState.tsx` e `EmptyStateHero.tsx` passam a usar ilustrações de onda do kit (sem notas, sem pessoas, sem resultados) no lugar do círculo cinza com ícone Lucide. Props inalteradas.

## 6. Conectores e badges de origem

- molduras padronizadas para os ícones de integração (Slack, Google Calendar, Chrome, Granola, Recall), mantendo os ícones oficiais de marca já existentes
- badges de origem do diário (Bot, Upload, Transcrição, Slack, Nota, Granola) no padrão do kit: tint semântico a 10% com texto na cor plena — apenas estilo, a lógica de `src/lib/diarySource.ts` fica intacta

## 7. Landing

Aplicar os fundos de seção, divisores de onda e o padrão de eyebrow (traço + Space Mono 11px, tracking 0.25em) já usado no kit. Atualizar a capa Open Graph 1200×630 (`public/og-image.png`) com o novo wordmark sobre creme.

## Detalhes técnicos

Arquivos tocados: `src/index.css`, `tailwind.config.ts` (se algum token novo precisar de classe), `src/components/RhitmoLogo.tsx`, `RhythmWave.tsx`, `WaveDivider.tsx`, `EmptyState.tsx`, `EmptyStateHero.tsx`, os cards de conector em `src/components/settings/`, os chips de origem do diário, `src/pages/Landing.tsx`, `index.html`, `public/favicon.svg`, `public/og-image.png` e `docs/design-system.md` (atualizado para v1 do kit).

Nenhuma alteração em banco, edge functions, rotas, RLS ou lógica de negócio.
