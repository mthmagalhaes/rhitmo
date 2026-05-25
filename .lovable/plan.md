# Plano: deixar a navegação entre rotas mais rápida (sem mexer em Cloud/IA)

A lentidão que você sente não vem do banco — vem de **como o frontend troca de rota**. Hoje, cada clique no menu:

1. Desmonta a sidebar + layout (porque o `<Suspense>` global está no topo).
2. Mostra um spinner de tela cheia.
3. Baixa o chunk JS da página (sem pré-carregar nada).
4. Remonta tudo.

Tudo abaixo é puramente frontend (Vite + React). **Zero custo de Cloud, zero edge function nova, zero migração de banco.**

---

## 1. Manter a "casca" do app montada ao trocar de rota (maior ganho percebido)

**Problema:** em `src/App.tsx`, o `<Suspense fallback={<RouteFallback />}>` envolve **todas** as `<Routes>`. Resultado: ao ir de `/lider/inicio` → `/lider/diario`, a sidebar pisca e some por ~300-800ms.

**Mudança:**
- Remover o `<Suspense>` global do `App.tsx`.
- Criar um `<Suspense>` *interno* dentro de `AppLayout.tsx`, envolvendo apenas `<main>{children}</main>`.
- Fallback vira um skeleton pequeno (header + 2 cards), não tela cheia.
- Rotas públicas (Landing, Auth, Invite) ganham seu próprio `<Suspense>` local.

**Efeito:** sidebar e header não piscam mais. A troca de rota fica visualmente instantânea, mesmo enquanto o chunk carrega.

---

## 2. Pré-carregar a próxima rota no hover/focus da sidebar

**Como:** expor as funções `import()` dos `lazy(...)` (ex.: `const loadDiario = () => import("./pages/lider/Diario")`) e disparar essa função no `onMouseEnter` / `onFocus` dos itens do `AppSidebar`.

**Resultado:** quando o usuário clica, o JS já está no cache do browser. Praticamente elimina a espera do chunk.

Custo: nenhum, é só `<link rel="modulepreload">` implícito do Vite.

---

## 3. Code-splitting controlado no build (manualChunks)

`vite.config.ts` hoje não define `build.rollupOptions.output.manualChunks`. Bibliotecas pesadas (tiptap, pdfjs-dist, mammoth, marked, react-markdown, recharts, radix-ui, lucide-react) caem em chunks misturados, fazendo cada rota baixar mais do que precisa.

**Mudança:** adicionar `manualChunks` agrupando:
- `vendor-react` (react, react-dom, react-router)
- `vendor-radix` (todos `@radix-ui/*`)
- `vendor-tiptap` (`@tiptap/*`, `prosemirror-*`)
- `vendor-pdf` (pdfjs-dist, mammoth) — usado só em upload
- `vendor-charts` (recharts) — usado só em analytics
- `vendor-markdown` (marked, react-markdown, dompurify)

Cada rota baixa menos. Cache do navegador entre deploys melhora também (mudar uma página não invalida o vendor).

---

## 4. Lazy-load real das libs pesadas dentro dos componentes

Hoje várias páginas importam estaticamente libs que só usam em ações pontuais:

- `pdfjs-dist` e `mammoth` (parsing de arquivo) → `await import(...)` dentro do handler de upload.
- `lamejs` (gravação) → já é usado só no Recorder; conferir que não vaza para o bundle principal.
- `marked` + `react-markdown` → carregar dinamicamente só onde renderiza markdown longo (mentor chat, recaps).

Sem mudar nenhum comportamento — só move o `import` para dentro da função que usa.

---

## 5. Quebrar `src/pages/lider/Pessoas.tsx` (1.271 linhas) em chunks por aba

Hoje a página inteira (tabela, analytics, convites, faturamento) entra num único chunk. Cada aba vira `lazy(() => import('./pessoas/TabAnalytics'))` etc. Só a aba ativa baixa.

Aplicar o mesmo padrão em `Mentor.tsx` (597 linhas) extraindo o painel de histórico / galeria de prompts.

---

## 6. Pequenos ajustes no React Query

O `QueryClient` já tem `staleTime: 60s` e `refetchOnWindowFocus: false` (bom). Dois ajustes finos:

- Em `useRecaps.ts`, dois hooks usam `refetchOnMount: 'always'` — trocar para o default a menos que o usuário realmente precise de dados frescos a cada navegação (são recaps mensais).
- Garantir `placeholderData: keepPreviousData` nas listas grandes (`useLeaderMembers`, `useTeamTimeline`) para que a troca de aba não mostre skeleton se já temos dados.

---

## O que NÃO vai mudar

- Nenhuma edge function nova ou alterada.
- Nenhuma migração de banco, nenhum índice novo, nenhuma RLS tocada.
- Nenhum modelo de IA novo, nenhum custo de gateway.
- Slack/Recall/Stripe intocados.
- Cron jobs intocados (a retenção de logs do plano anterior continua valendo).

---

## Detalhes técnicos (resumo)

```text
App.tsx
  - remover <Suspense> global
  - rotas públicas: <Suspense> local
  - rotas Leader/DirectReport: AppLayout cuida do Suspense interno

AppLayout.tsx
  <main>
    <Suspense fallback={<RouteSkeleton />}>{children}</Suspense>
  </main>

AppSidebar.tsx
  - cada NavLink recebe onMouseEnter/onFocus que dispara o import() da rota

vite.config.ts
  build: {
    rollupOptions: {
      output: { manualChunks: { ... } }
    }
  }

Pessoas.tsx / Mentor.tsx
  - extrair sub-componentes pesados para lazy()

Hooks
  - useRecaps: remover refetchOnMount:'always'
  - useLeaderMembers/useTeamTimeline: placeholderData: keepPreviousData
```

---

## Validação

1. Build local: comparar tamanho dos chunks antes/depois (`dist/assets/*.js`).
2. Navegar `/lider/inicio` → `/lider/diario` → `/lider/pessoas`: sidebar não pisca, sem flash de tela em branco.
3. Hover em "Diário" antes de clicar: chunk aparece como `(prefetch)` na aba Network.
4. Abrir aba Analytics em `/lider/pessoas` pela primeira vez baixa só o chunk daquela aba.

## Risco

Baixo. São mudanças de empacotamento e UX de loading. Se algo der ruim:
- Reverter o `manualChunks` é trivial (1 commit).
- O Suspense interno tem fallback funcional — pior caso, volta a aparecer um spinner pequeno em vez de tela cheia.
- Nenhum dado de usuário, RLS ou histórico é tocado.

Posso implementar em uma única rodada e validar com `npm run build` no fim.