## Nova seção cinematográfica na landing

Adicionar uma nova seção full-bleed logo após a seção de hero em `src/pages/Landing.tsx` (e antes da próxima seção atual), inspirada no banner da Windmill.

### Imagem
- Gerar uma foto profissional via `imagegen` (premium, 1920x1080, salva em `src/assets/landing-cinematic-office.jpg`).
- Prompt: escritório corporativo charmoso ao entardecer/noite, janelas amplas com cidade desfocada ao fundo, luz âmbar quente, figuras humanas levemente desfocadas em movimento, mesa de madeira, plantas, lâmpadas pontuais, atmosfera íntima e convidativa, estilo cinematográfico fotográfico realista (sem texto, sem logos).

### Componente
- Criar `src/components/landing/CinematicQuoteSection.tsx`:
  - `section` full-bleed `w-full` (sem `max-w-5xl`), com `px-4 md:px-8 py-12 md:py-20`.
  - Wrapper interno `rounded-3xl overflow-hidden relative` com `aspect-[21/9]` (desktop) / `aspect-[4/5]` (mobile).
  - `<img>` da foto cobrindo o container (`object-cover w-full h-full`), `loading="lazy"`, `alt` descritivo.
  - Overlay escuro gradiente (`bg-gradient-to-t from-black/70 via-black/40 to-black/30`) para legibilidade.
  - Conteúdo centralizado: H2 em Lora serif, branco, `text-4xl md:text-6xl lg:text-7xl tracking-tight font-semibold`: **"Toda história merece ser lembrada."**
  - Botão secundário abaixo: "Veja como funciona" linkando para a próxima seção (ou para `#como-funciona` se existir; senão, scroll suave para a próxima seção via id).
  - Texto em PT-BR; versão EN do i18n também atualizada (`"Every story deserves to be remembered."`).

### Integração
- Importar e renderizar `<CinematicQuoteSection />` em `Landing.tsx` imediatamente após o bloco do hero (logo abaixo do CTA + mockup) e antes da próxima seção existente.
- Adicionar strings i18n no mesmo dicionário `pt` / `en` usado pela landing (`cinematicQuote` + `cinematicCta`) e consumi-las no componente.

### Guardrails
- Sem em-dashes (memória de tom).
- Sem cores hardcoded fora do necessário (uso pontual de `text-white` aceitável apenas dentro do overlay sobre foto, conforme padrão de hero photos; mas darei preferência a `text-background` invertido se já existir token). Vou usar classes Tailwind padrão `text-white`/`bg-black/X` somente para o overlay sobre imagem, já que é caso de mídia.
- Não alterar nenhuma outra seção.