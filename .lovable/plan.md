# Fix — Hash scroll no link "Ver planos completos"

## Diagnóstico

- `PersonaSelector.tsx:153` usa `<Link to="/#pricing">`.
- A landing tem `<section id="pricing">` (`Landing.tsx:651`) — então o alvo existe.
- O React Router **não rola para o hash automaticamente** ao navegar entre rotas. Como `/auth/start` → `/` é uma troca de rota, o hash `#pricing` chega na URL mas o navegador não pula para o elemento (a página só renderiza no topo).
- Não há `ScrollToTop` global no projeto, então não é ele atrapalhando — é só a ausência de tratamento de hash.
- Outros links internos da própria landing (`Landing.tsx:873, 958, 1023`) funcionam porque já estão na mesma página (`/`), então o navegador rola normalmente.

## Solução (mínima, escopo único)

Adicionar tratamento de hash na `Landing.tsx`: um `useEffect` que, ao montar e a cada mudança de `location.hash`, encontra o elemento com aquele id e dá `scrollIntoView({ behavior: 'smooth' })`. Pequeno `setTimeout`/`requestAnimationFrame` para garantir que a seção já foi renderizada antes do scroll.

Trecho:

```tsx
import { useLocation } from 'react-router-dom';
// ...
const { hash } = useLocation();
useEffect(() => {
  if (!hash) return;
  const id = hash.replace('#', '');
  // espera o layout pintar (imagens/fonts podem empurrar offset)
  const t = window.setTimeout(() => {
    document.getElementById(id)?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }, 80);
  return () => window.clearTimeout(t);
}, [hash]);
```

Isso resolve `Ver planos completos` (`/#pricing`) e qualquer outro `/#algo` futuro vindo de fora da landing, sem mexer em comportamento de outras rotas.

## Fora de escopo

- Não criar `ScrollToTop` global (não há queixa de outras rotas e adicionar agora pode quebrar fluxos com hash, ex.: HelpCenter, ResetPassword, AuthEventProvider que já tratam hash manualmente).
- Não mexer em `PersonaSelector` — o link está correto.
- Não trocar `Link` por `<a href>` (perderíamos o roteamento SPA).

## Arquivos

- `src/pages/Landing.tsx` — adicionar `useLocation` + `useEffect` de hash scroll perto dos outros hooks no topo do componente.
