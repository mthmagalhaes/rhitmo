

# Trocar ícone do Google Calendar no sidebar

## Problema

Olhando a screenshot, o ícone atual do `GoogleCalendarIcon` renderiza mal no `h-5 w-5` do sidebar:
- o "31" central fica diminuto e ilegível
- os "chips" coloridos nos cantos (azul/vermelho/verde/amarelo) saem desproporcionais
- o SVG tem paths com `opacity="0"` (lixo) e geometria com pequenas distorções

A logo oficial 2020+ do Google Calendar tem desenho mais simples: **moldura branca + canto inferior-direito azul (page fold) + número "31" centralizado em azul Google**. Os chips coloridos só aparecem em tamanhos grandes (>48px) — em tamanhos de UI/sidebar a versão oficial do Google omite os chips e mantém só folha + 31.

## O que muda

### Substituir `src/components/icons/GoogleCalendarIcon.tsx`

Trocar o SVG por uma versão otimizada da logo oficial Google Calendar (Material/Workspace 2020+), no formato que o próprio Google usa em favicons e barras laterais:

- **Base:** quadrado branco com sombra sutil (folha de calendário)
- **Cantos:** os 4 chips coloridos oficiais (azul `#4285F4`, vermelho `#EA4335`, verde `#34A853`, amarelo `#FBBC04`) — mas redesenhados com proporções corretas para que fiquem visíveis em 20px
- **Centro:** "31" em Google Sans azul `#1A73E8`, peso bold, ocupando ~50% do viewBox (vs ~30% atual)
- **viewBox:** manter `0 0 200 200` para não quebrar nenhum consumidor
- **API:** mesma assinatura `({ className }: { className?: string })` — drop-in replacement, nenhum outro arquivo precisa mudar

### Fonte da arte

Vou usar a versão SVG oficial publicada pelo Google em Wikimedia Commons (Google_Calendar_icon_(2020).svg), que é a referência canônica usada por documentação técnica e está em domínio público de uso de marca. É o mesmo desenho que aparece no Google Workspace, Material Icons brand assets e no favicon de calendar.google.com.

## Arquivos editados

- `src/components/icons/GoogleCalendarIcon.tsx` — substituir conteúdo do SVG (1 arquivo)

Sem mudanças em `AppSidebar.tsx`, sem i18n, sem migration.

## Critério de aceite

- O ícone do Google Calendar no sidebar mostra claramente os 4 chips coloridos + "31" legível em `h-5 w-5`
- Mantém alinhamento com o ícone do Slack ao lado (ambos brand-colored, mesma altura óptica)
- Continua escalando bem se algum dia for usado em tamanho maior (ex: dialog de integrações)

