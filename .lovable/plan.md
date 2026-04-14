

## Plano: Avatares Custom estilo Dribbble (SVG puro)

Os avatares da referência são: círculos com fundo gradiente suave (2 cores) + rostos minimalistas desenhados com traços simples (stroke paths). São simples o suficiente para criar como SVG puro em React, sem depender de APIs externas.

### Abordagem: Componentes SVG inline

Criar ~24 avatares como dados SVG puros definidos em um array. Cada avatar tem:
- **Gradiente de fundo** (2 cores, diagonal ou radial)
- **Rosto** com traços curvos: olhos (pontos ou vírgulas), boca (curva), sobrancelha opcional (onda)
- Cada combinação é única (expressão + paleta)

### Paletas (inspiradas na referência)

| # | Gradiente | Vibe |
|---|-----------|------|
| 1 | Laranja → Coral | Energético |
| 2 | Rosa → Pêssego | Acolhedor |
| 3 | Lilás → Azul | Sereno |
| 4 | Azul → Ciano | Confiante |
| 5 | Verde → Limão | Fresco |
| 6 | Amarelo → Dourado | Otimista |
| 7 | Turquesa → Menta | Calmo |
| 8 | Vermelho → Azul | Ousado |
| 9 | Rosa → Violeta | Criativo |
| 10 | Ciano → Verde | Natural |
| 11 | Lavanda → Rosa | Suave |
| 12 | Azul → Índigo | Profundo |

### Expressões faciais (variações de paths SVG)

- Sorriso aberto, sorriso fechado, sorriso de lado
- Olhos redondos, olhos de vírgula, olhos fechados (feliz)
- Com/sem sobrancelhas onduladas
- ~8 combinações de expressão × 12 paletas = selecionar 24 melhores

### Arquivos modificados

| Arquivo | Mudança |
|---------|---------|
| `src/components/avatar/avatarData.ts` | **Novo** — Array com 24 definições (gradiente + paths do rosto) |
| `src/components/avatar/CustomAvatar.tsx` | **Novo** — Componente SVG que renderiza um avatar a partir dos dados |
| `src/components/avatar/AvatarLibrary.tsx` | Substituir DiceBear por avatares custom SVG |
| `src/components/MemberAvatar.tsx` | Remover DiceBear fallback, usar CustomAvatar |

### Vantagens vs DiceBear

- Zero dependência externa (sem chamadas HTTP)
- Carregamento instantâneo (SVG inline)
- Visual premium e coeso com a marca Rhitmo
- Controle total sobre o estilo

### O que NÃO muda
- Fluxo de seleção na AvatarLibrary (grid de opções → salvar no DB)
- Campo `avatar` no banco continua sendo string (agora será um ID como `"avatar-1"` em vez de URL)
- Upload de foto custom (se existir) continua funcionando

