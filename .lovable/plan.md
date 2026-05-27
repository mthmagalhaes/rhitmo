## Status do app

O app **já voltou a montar**. Console mais recente mostra `Auth event: INITIAL_SESSION`, ou seja, React boot + AuthContext rodando — o que estava quebrado antes (`Cannot read properties of undefined (reading 'createContext')` no `vendor-i18n`). O rollback do `manualChunks` em `vite.config.ts` resolveu o incidente.

**Nada a aplicar no app agora.** O follow-up natural (não-urgente) seria, depois de uma semana estável, decidir se queremos voltar a fazer code-splitting de vendors — mas dessa vez por *route-aware splits* (deixar Rollup decidir) em vez de chunks manuais por nome de lib. Não faz parte deste plano.

## O que mudar no skill

Atualizar **só** o skill `rhitmo-support` (draft em `.agents/skills/rhitmo-support`) para capturar a lição desse incidente. Dois arquivos:

### 1. `references/known-pitfalls.md` — nova seção "Build / Bundling (Vite)"

Adicionar no fim do arquivo:

```md
## Build / Bundling (Vite)
- **`manualChunks` por lib quebra o boot com tela branca**. Splitar `vendor-react`, `vendor-i18n`, `vendor-radix`, `vendor-charts`, `vendor-tiptap` etc. em chunks nomeados cria ciclos de inicialização entre eles (ex: `vendor-i18n` importa `R as I` de `vendor-react`, e `vendor-react` importa `g as wa` de `vendor-i18n` → no boot `I` é `undefined` → `Cannot read properties of undefined (reading 'createContext')`). Sintomas observados na produção:
  - `Cannot access 'S' before initialization` (variante com `vendor-charts`)
  - `Cannot read properties of undefined (reading 'createContext')` em `vendor-i18n-*.js`
  - Tela 100% branca em `rhitmo.co`, antes de qualquer rota/auth renderizar.
  Fix: **remover o bloco `build.rollupOptions.output.manualChunks` inteiro** do `vite.config.ts` e deixar Rollup/Vite colocar cada lib com a rota que a importa. Nunca splitar vendors React-dependent por nome.
- **Sintoma "plataforma fora do ar" mas Cloud saudável + HTML 200**: é quase sempre bundling/runtime do frontend, não backend. Sequência de triagem:
  1. `curl -sI https://rhitmo.co` → confirma que HTML chega (200).
  2. `supabase--cloud_status` → confirma backend `ACTIVE_HEALTHY`.
  3. Browser console: procurar `Cannot access ... before initialization` ou `Cannot read properties of undefined (reading 'createContext'|'useState'|'forwardRef')` — assinatura de ciclo de chunk.
  4. Diff recente em `vite.config.ts`, `package.json` (deps novas/atualizadas), `src/main.tsx`, `src/i18n/index.ts`.
- **Regra geral**: mudanças em `vite.config.ts` (especialmente `build.rollupOptions`, `optimizeDeps`, `resolve.dedupe`) são **mudanças de produção de altíssimo risco**. Tratar como migration: validar em preview antes, e ter rollback pronto.
```

### 2. `references/investigation-playbook.md` — nova seção "Frontend boot quebrado / tela branca"

Adicionar no fim:

```md
## Frontend boot quebrado / tela branca em produção

Quando o sintoma é "app fora do ar" mas backend está OK:

1. **Confirmar que é frontend, não backend**:
   ```bash
   curl -sI https://rhitmo.co                       # espera 200
   curl -s https://rhitmo.co | grep -oE 'assets/[^"]+\.js' | head -5
   ```
   Se HTML chega e backend está `ACTIVE_HEALTHY` (via `supabase--cloud_status`), é bundle.

2. **Capturar o erro real** do browser (preview da sandbox ou prod):
   - `code--read_console_logs` no preview, ou pedir ao Matheus screenshot do console em prod.
   - Procurar especificamente: `Cannot access '\w+' before initialization` ou `Cannot read properties of undefined (reading 'createContext'...)`.

3. **Identificar o chunk culpado**:
   ```bash
   # qual chunk lança o erro? (ex: vendor-i18n-XXXX.js:1:NNNN)
   # baixar e ver o início — primeiros imports revelam o ciclo:
   curl -s https://rhitmo.co/assets/vendor-i18n-XXXX.js | head -c 400
   curl -s https://rhitmo.co/assets/vendor-react-YYYY.js | head -c 400
   ```
   Se cada um importa do outro → ciclo de chunk.

4. **Fix imediato**: remover `manualChunks` em `vite.config.ts` (ver pitfall em `known-pitfalls.md`).

5. **Validar pós-deploy**:
   - `curl -s https://rhitmo.co | grep -oE 'assets/[^"]+\.js'` → novos hashes.
   - Browser console limpo (só `Auth event: INITIAL_SESSION` é esperado).
   - Smoke test em rota com lib pesada (`/lider/analytics` para Recharts, `/lider/diario` para Tiptap, `/lider/configuracoes` para Radix).
```

### 3. `SKILL.md` — uma única linha na lista de padrões frequentes

Adicionar no bloco "Padrões frequentes da Rhitmo":

```md
- Tela branca em produção / "app fora do ar" → `references/known-pitfalls.md` seção "Build / Bundling (Vite)" + playbook "Frontend boot quebrado"
```

## Hand-off

Após escrever os arquivos, rodar `skills--apply_draft` com `.agents/skills/rhitmo-support` para ativar a versão atualizada.

## Fora de escopo

- Não vou tocar em `vite.config.ts`, `routeLoaders.ts`, prefetch da sidebar, React Query, ou qualquer código de aplicação.
- Não vou abrir ticket em `support_tickets` (incidente interno de build, não usuário final).
- Não vou re-introduzir `manualChunks` agora.
