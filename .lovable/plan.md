

## Refinamento Visual do Bias Detection Panel

### Estado Atual

O Bias Detection ja esta implementado e funcional:
- Edge Functions (`analyze-feedback` e `analyze-feedback-background`) ja usam schema estruturado com `detected`, `summary`, `flags`
- `BiasDetectionPanel.tsx` ja existe com logica de parse, fallback legado, e layout colapsavel
- `FeedbackTimeline.tsx` ja integra o painel com verificacao de 50+ palavras

### Alteracoes Necessarias (apenas refinamentos visuais)

**1. BiasDetectionPanel.tsx -- Ajustes de estilo e props**

- Adicionar prop `wordCount?: number` e usar para filtrar (retornar null se < 50)
- Header: mudar de `rounded-xl` para `rounded-2xl`, ajustar cores para `bg-amber-50 border border-amber-200`
- Badge: usar `bg-amber-100 text-amber-700 rounded-full px-2 py-0.5` (mais especifico)
- Flags: mudar `rounded-r-lg` para `rounded-r-xl`, usar `bg-white` para container do flag
- Sugestao: mudar de `text-green-800 bg-green-50` para `text-emerald-700 bg-emerald-50 rounded-xl`
- Footer: adicionar `italic text-center` ao disclaimer
- Remover opacity/dark variants excessivos para simplificar

**2. FeedbackTimeline.tsx -- Simplificar chamada**

- Passar `wordCount` como prop em vez de calcular inline
- Remover a condicional de 50+ palavras do FeedbackTimeline (mover para dentro do componente)

### Detalhes Tecnicos

Componentes afetados:
- `src/components/BiasDetectionPanel.tsx` -- refinamento de CSS classes e adição de prop wordCount
- `src/components/FeedbackTimeline.tsx` -- simplificar chamada do BiasDetectionPanel

Nenhuma alteracao em:
- Edge Functions (ja estao corretas)
- Schema do banco
- Logica de RLS
- Fluxo de criacao de notas
