# Diagnóstico

**Não é créditos do Lovable AI/Cloud.** Backend está saudável (`cloud_status: ACTIVE_HEALTHY`), todos os assets sobem HTTP 200, e o `index.html` em produção (`rhitmo.co`, `app-rhitmo.lovable.app`, `rhitmo.app`) já contém o bundle correto.

A tela preta vem de **um erro JS fatal em produção** no chunk `vendor-charts`:

```
ReferenceError: Cannot access 'S' before initialization
  at https://rhitmo.co/assets/vendor-charts-DnctLiPC.js:9:16763
```

Como esse chunk é precarregado via `<link rel="modulepreload">` em **todas** as páginas (inclusive `/`), ele é avaliado no boot — quando explode, o React não monta e o `<div id="root">` fica vazio → tela preta. Por isso o sintoma parece "site fora do ar" mesmo o backend estando OK.

## Causa raiz

`vite.config.ts` agrupa Recharts + todas as libs `d3-*` em um único chunk `vendor-charts`:

```ts
if (id.includes('recharts') || id.includes('d3-')) return 'vendor-charts';
```

Esse padrão é conhecido por criar **TDZ (temporal dead zone) entre módulos `d3-*`** quando minificados — uma variável (minificada como `S`) é acessada antes de ser inicializada por ordem de avaliação imposta pelo split. Antes funcionava por sorte de ordering; mudou com a última build.

## Fix proposto

Mudança cirúrgica em `vite.config.ts`:

1. **Remover a regra `vendor-charts`** do `manualChunks` (deixar o Rollup colocar Recharts/d3 nos chunks das rotas que os usam — `Analytics`, `HRAnalytics`, `HealthScoreHero`, `SkillRadar`, `chart.tsx`).
2. Como bônus de performance: a home (`/`) e rotas leves deixam de baixar ~140KB de charts no boot.

Nenhum código de aplicação muda. Sem migração, sem mudança de feature, sem risco de regressão de dados.

## Validação pós-deploy

1. `curl -s https://rhitmo.co | grep vendor-charts` → não deve mais aparecer como modulepreload na home.
2. Abrir `rhitmo.co` em browser limpo → home renderiza.
3. Abrir `/lider/analytics` (que usa Recharts) → gráficos continuam funcionando.
4. Console sem `ReferenceError: Cannot access 'S' before initialization`.

## Riscos

- **Nenhum funcional**: charts só são importados nas mesmas rotas; vão pro chunk delas.
- **Cache**: usuários com versão antiga em cache vão receber o novo hash automaticamente (Vite gera novo nome).
- Não é preciso rollback nem ticket pra Lovable — é fix nosso, no `vite.config.ts`.

## Próximo passo

Aprovar para eu aplicar o patch no `vite.config.ts` (em build mode) e você republica logo em seguida.
