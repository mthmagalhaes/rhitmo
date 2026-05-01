## Limpeza de páginas órfãs (Prioridades 1-3)

### Correção importante vs. audit anterior

Ao ler o código com mais cuidado, descobri que **`src/pages/Index.tsx` NÃO pode ser deletado**. Ele é o componente compartilhado renderizado por:

- `src/pages/lider/Inicio.tsx`
- `src/pages/liderado/Inicio.tsx`
- `src/pages/liderado/Compass.tsx`
- `src/pages/liderado/OneOnOnes.tsx`
- `src/pages/liderado/MeuRhitmo.tsx`
- `src/pages/liderado/PDI.tsx`

Deletar `Index.tsx` quebraria toda a Home do líder e do liderado. Esse arquivo é uma refatoração merecedora de sprint própria (não é "órfão", é "wrapper universal legado"). Fica fora desta limpeza.

### O que será feito

**1. Deletar `src/pages/AwaitingInvite.tsx`**
- Confirmado: 0 imports no projeto. Lógica substituída por `PendingInviteAutoLinker`.

**2. Deletar `src/pages/Roadmap.tsx` + sua rota**
- Sem links na UI, sem referências externas conhecidas. Remover `lazy import` (linha 48 de `App.tsx`) e a `<Route path="/roadmap">` (linha 195).

**3. Endurecer a rota legada `/dashboard`**
- Hoje: `/dashboard` renderiza `<Index />` dentro do `DirectReportGuard`, que faz redirect para `/lider/inicio` ou `/liderado/inicio` via `useEffect`. Funciona, mas pisca o `Index` por um instante.
- Mudança: trocar a rota por um redirecionamento puro, deixando o `DirectReportGuard` decidir o destino antes de qualquer render. Mantém compatibilidade com:
  - `HRAdminGuard.tsx` (linha 47): `<Navigate to="/dashboard" />`
  - `DesignSystem.tsx` (linha 46): `<Navigate to="/dashboard" />`
  - `Auth.tsx` (linha 122): `emailRedirectTo: .../dashboard`
  - `Landing.tsx` (linha 848): `target = "/dashboard"`
  - `WorkspaceOnboarding.tsx` (linha 92): `dashboardUrl: 'https://rhitmo.co/dashboard'`
  - `AwaitingInvite.tsx` linha 90 — irrelevante porque o arquivo será deletado.
  - `Index.tsx` linha 216: `window.history.replaceState({}, '', '/dashboard')` — também será revisado para apontar para a home correta da persona.

### Detalhes técnicos

**`src/App.tsx`**
- Remover `import Roadmap` (linha 48) e `<Route path="/roadmap" ...>` (linha 195).
- Manter `import Index from "./pages/Index"` (ainda usado pela rota `/dashboard` durante o redirect e pelos wrappers de Inicio/Compass/etc.).
- Rota `/dashboard` continua envolvida pelo `DirectReportGuard` para que ele resolva a persona e redirecione. O `<Index />` dentro dela permanece como fallback enquanto o guard processa — é o que evita o flash em sessões já carregadas.

**`src/pages/Index.tsx`**
- Linha 216: `window.history.replaceState({}, '', '/dashboard')` será trocado por `'/lider/inicio'` ou `'/liderado/inicio'` conforme a persona já resolvida no componente (já existe lógica de persona ali).

**`src/pages/AwaitingInvite.tsx`**
- Deletar arquivo.

**`src/pages/Roadmap.tsx`**
- Deletar arquivo.

### Não muda nesta sprint
- `Index.tsx` permanece (é wrapper universal — refator é sprint própria).
- `Analytics.tsx`, `Billing.tsx`, `HelpCenter.tsx` permanecem em `src/pages/` (movê-los para `src/components/` é refator opcional, fica para depois).
- `Evidence.tsx` e `SlackChannels.tsx` permanecem (a decisão sobre "integrar no menu ou remover" é a Prioridade 4, que você quer analisar com mais tempo).

### Riscos & mitigação
- **Risco**: alguém depender de `/roadmap` em link externo (email marketing, social). **Mitigação**: como cai no `NotFound` (já existe), não quebra build. Se aparecer demanda, refazemos.
- **Risco**: `Index.tsx` linha 216 com persona não resolvida. **Mitigação**: usar fallback `/dashboard` se persona ainda não estiver pronta (mantém comportamento atual nesse caso).

### Resultado esperado
- 2 arquivos deletados.
- 2 linhas removidas em `App.tsx`.
- 1 ajuste defensivo em `Index.tsx` linha 216.
- Zero rota quebrada, zero import dangling.