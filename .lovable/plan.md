## Tornar o logo da Rhitmo clicável na página `/auth`

Em `src/components/Auth.tsx` o `RhitmoLogo` aparece em dois lugares:

- **Linha 175** — logo grande no painel split-screen (desktop, lado esquerdo com o RhythmWave).
- **Linha 186** — logo médio no topo do formulário (mobile / fallback).

Em ambos, envolver o `<RhitmoLogo />` num `<a href="https://rhitmo.co">` para que o clique leve o usuário para a landing page de marketing (domínio diferente da app, então usar `<a>` nativo, não `Link` do react-router).

```tsx
<a
  href="https://rhitmo.co"
  aria-label="Ir para a página inicial da Rhitmo"
  className="inline-block transition-opacity hover:opacity-80"
>
  <RhitmoLogo size="lg" className="text-primary mb-6" />
</a>
```

Mesma estrutura para a versão `size="md"` no header mobile.

Sem mudanças de business logic, apenas wrapper de link + microinteração de hover (opacity) consistente com o resto do projeto.
