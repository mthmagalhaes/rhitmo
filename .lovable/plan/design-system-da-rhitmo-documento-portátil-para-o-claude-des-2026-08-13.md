# Design System da Rhitmo — documento portátil para o Claude Design

Objetivo: gerar um único arquivo autocontido que você copia/cola no Claude Design como briefing de marca, para ele criar logos, backgrounds, ilustrações e elementos visuais coerentes com a Rhitmo (landing page e produto).

## O que será entregue

Arquivo `docs/design-system.md` na raiz do projeto, escrito em português, com estas seções:

1. **Identidade e princípios**
   Estética "Creme / Bento": soft UI, tátil, editorial, high-end. Nada de cara de admin/Bootstrap. Anti-padrões explícitos (gradiente roxo sobre branco genérico, Inter em tudo sem hierarquia, ícones 3D).

2. **Paleta completa (light + dark)**
   Todos os tokens HSL atuais de `src/index.css`, com equivalente HEX ao lado para o Claude Design:
   fundo creme `#F5F3EE`, texto roxo-preto `#1A1035`, primária roxo `#7C3AED` com escala 50–900, muted, accent `#F3F0FF`, bordas quentes `#E8E5DF`, semânticas (success/warning/destructive/info) e as 5 cores de chart. Bloco dark equivalente.

3. **Tipografia**
   Lora (serif, títulos, `tracking-tight`, 400–700), Inter (corpo, 400–700), Space Mono (numeração/labels editoriais). Escala real do `tailwind.config.ts` (11px → 48px com line-heights e letter-spacings).

4. **Forma, sombra e movimento**
   Raios (12/16/20/24/32px), as 7 sombras difusas `--shadow-*` mais as duas sombras roxas de CTA, hover lift `-translate-y-1`, keyframes existentes (wave-pulse, fade-in, message-in, shimmer, highlight-grow).

5. **Assinaturas visuais da marca**
   - RhythmWave: 3 a 7 curvas senoidais sobrepostas com opacidade crescente — usada no logo, em divisores e fundos.
   - Logo Rhitmo: wordmark Lora bold + onda sob o texto; versão icon-only 40x40 com 3 ondas.
   - Eyebrow editorial: traço curto + label uppercase `tracking-[0.28em]` 11px.
   - Highlight marker: destaque roxo tipo caneta marca-texto sob o texto.
   - Bento grid, sidebar flutuante, glassmorphism da sidebar.

6. **Padrões de layout**
   `max-w-5xl` no app, master-detail nas páginas densas, split-screen no auth, seções full-bleed na landing.

7. **Briefing de pedidos ao Claude Design**
   Lista pronta do que pedir (variações de logo, favicon, backgrounds de seção, ilustrações de vazio, ícones de conectores, capa de OG) com as restrições de marca em cada item.

## Detalhes técnicos

Fonte da verdade: `src/index.css` (tokens `:root` e `.dark`), `tailwind.config.ts` (escala tipográfica, raios, sombras, animações), `src/components/RhitmoLogo.tsx` e `src/components/RhythmWave.tsx` (geometria das ondas, incluindo os paths SVG copiados literalmente), e os padrões de eyebrow/serif usados em `src/pages/Landing.tsx`.

Nenhum código de aplicação é alterado — só a criação do documento.
