## Fix: Account Setup sumindo sozinho

### Causa
Em `src/components/dashboard/AccountSetupBento.tsx` (linhas 113-114):
```ts
const allDone = cards.every((c) => c.done);
if (allDone || dismissed) return null;
```
Como as 4 integrações do Matheus estão conectadas, assim que as queries (`useSlackConnection`, `useSlackChannels`, `useCalendarIntegration`) terminam de carregar (~5s), `allDone` vira `true` e a seção desaparece sozinha — parecendo que o "Dispensar" foi clicado.

### Mudança

**`src/components/dashboard/AccountSetupBento.tsx`**
- Remover `allDone` da condição de esconder. A seção só some quando o líder clica em **Dispensar** (já persistido em `localStorage` por workspace).
- Trocar:
  ```ts
  const allDone = cards.every((c) => c.done);
  if (allDone || dismissed) return null;
  ```
  Por:
  ```ts
  if (dismissed) return null;
  ```

Quando todos os cards estiverem `done`, eles continuam visíveis com o badge "Conectado" (UI já existente) — o líder decide quando dispensar.

**`.lovable/memory/design/dashboard/home-v3-windmill.md`**
- Atualizar a descrição do AccountSetupBento (linha 15) removendo "Auto-some quando os 4 estão concluídos" e deixando explícito que a seção só desaparece quando o líder clica em Dispensar.

### Resultado
- Account Setup permanece visível ao carregar `/lider/inicio`, mesmo com tudo conectado.
- Líder controla a visibilidade clicando em "Dispensar" (persiste por workspace).
- Sem mudanças em hooks, queries ou backend.
