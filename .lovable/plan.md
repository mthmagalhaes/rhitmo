

# Refazer GoogleCalendarIcon com a estrutura oficial correta

## O que está errado hoje

A versão atual desenha 4 "chips" pequenos nos cantos de um quadrado branco — isso **não é** o logo do Google Calendar. O logo oficial (anexo) é construído de outra forma:

- Um **quadrado branco central** com o "31" em azul `#1A73E8`
- **4 bandas coloridas** ao redor formando uma moldura:
  - Topo: faixa azul `#4285F4`
  - Direita: faixa amarela `#FBBC04`
  - Base: faixa verde `#34A853`
  - "Page fold" (dobra de página) vermelha `#EA4335` no canto inferior-direito sobreposta
- O "31" ocupa a maior parte do quadrado branco — bem grosso e legível

## Mudança

**Arquivo único:** `src/components/icons/GoogleCalendarIcon.tsx`

Substituir o SVG por uma reconstrução fiel do logo oficial 2020+:

1. **viewBox `0 0 48 48`** mantido (drop-in)
2. **Bandas coloridas externas** desenhadas como `<path>` (não 4 quadradinhos):
   - Banda superior azul (largura total, altura ~6)
   - Banda direita amarela
   - Banda inferior verde
   - "Page fold" vermelha como triângulo sobreposto no canto inf-dir, com sombra sutil
3. **Quadrado branco central** (`~6,12 → 36,36`) com `rx=1`
4. **"31"** em `font-weight: 800`, `font-size ~14`, fill `#1A73E8`, centralizado, font-family Google Sans / Product Sans / Roboto fallback
5. Remover qualquer path com `opacity=0` ou geometria redundante
6. Manter assinatura `({ className })` — nenhum outro arquivo muda

## Validação visual (skill de design)

Após editar o componente, vou:
1. Renderizar o ícone isolado num PNG (24px, 48px e 96px) usando um pequeno script
2. Comparar lado-a-lado com o `user-uploads://google_calendar.png`
3. Iterar até as proporções (banda azul, page-fold vermelha, tamanho do "31") baterem com o oficial
4. Confirmar legibilidade no tamanho `h-5 w-5` (20px) do sidebar

## Critério de aceite

- Ícone tem a moldura azul/amarela/verde + page-fold vermelha (não 4 chips iguais)
- "31" azul ocupa a maior parte do quadrado branco e é legível em 20px
- Visualmente indistinguível do logo oficial em tamanhos de UI
- Drop-in: nenhum outro arquivo alterado

