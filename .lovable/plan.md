## Remover badge "AI-Native desde o dia 1" da Landing

A badge é um único bloco em `src/pages/Landing.tsx` (linhas 1012–1018) que usa `t.aiNativeBadge` — então some automaticamente nas 3 línguas (PT/EN/ES) ao remover o JSX. Não é o componente `AINativeBadge` (ele está importado mas não renderizado, e fica em outro contexto — não mexer agora pra manter o escopo mínimo).

### Mudança
- `src/pages/Landing.tsx`: remover o bloco `{/* AI-Native Badge */}` (div + span + Sparkles) das linhas 1012–1018.

Nenhuma outra página renderiza essa badge, então PT/EN/ES ficam cobertos com essa única edição.