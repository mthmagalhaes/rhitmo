Diagnóstico confirmado

A plataforma continua fora do ar por um erro de bundling frontend em produção, não por créditos, Lovable Cloud ou backend.

Evidências:
- `https://rhitmo.co/` responde HTTP 200 e entrega HTML/assets normalmente.
- Lovable Cloud respondeu saudável.
- O browser quebra antes do React montar com:

```text
TypeError: Cannot read properties of undefined (reading 'createContext')
at /assets/vendor-i18n-Bw1tAm9q.js:1:2691
```

Causa raiz

A implementação recente de performance adicionou `manualChunks` no `vite.config.ts`, separando bibliotecas em chunks como:

```text
vendor-react
vendor-i18n
vendor-radix
vendor-pdf
vendor-markdown
vendor-tiptap
```

O fix anterior removeu apenas `vendor-charts`, que causava o erro `Cannot access 'S' before initialization`. Isso corrigiu uma parte, mas não a raiz estrutural: o split manual ainda está criando ciclos entre chunks.

O erro atual mostra um ciclo direto:

```text
vendor-i18n imports vendor-react
vendor-react imports vendor-i18n
```

Mais especificamente:
- `vendor-i18n` começa com `import { r as I } from './vendor-react...'` e usa `I.createContext()`.
- `vendor-react` começa com `import { g as wa } from './vendor-i18n...'`.
- Quando o browser avalia os módulos, `vendor-i18n` tenta usar React antes de `vendor-react` estar inicializado, então `I` fica `undefined`.

Isso explica a tela vazia: o erro acontece no boot, antes de qualquer rota, auth, loader ou layout renderizar.

Plano de correção emergencial

1. Reverter o `manualChunks` customizado em `vite.config.ts`
   - Remover o bloco `build.rollupOptions.output.manualChunks` inteiro.
   - Deixar Rollup/Vite decidir a divisão dos chunks automaticamente.
   - Isso elimina os ciclos artificiais entre `vendor-react`, `vendor-i18n` e outros vendors React-dependent.

2. Manter os ganhos seguros de performance já implementados
   - Não mexer em `routeLoaders.ts`.
   - Não mexer no prefetch da sidebar.
   - Não mexer no `<Suspense>` local do `AppLayout`.
   - Não mexer nos ajustes de React Query.

3. Atualizar o diagnóstico em `.lovable/plan.md`
   - Registrar que o problema não era só `vendor-charts`.
   - Registrar a causa final: chunk splitting manual criando ciclos de inicialização entre vendors.

4. Validação pós-publicação
   - Abrir `https://rhitmo.co` em browser limpo.
   - Console sem:
     - `Cannot access 'S' before initialization`
     - `Cannot read properties of undefined (reading 'createContext')`
   - `curl https://rhitmo.co` deve mostrar novos hashes de assets.
   - Home deve renderizar.
   - Rotas autenticadas devem voltar a carregar normalmente.
   - Testar pelo menos uma rota com gráficos depois, como `/lider/analytics`, para confirmar que Recharts continua funcionando.

Risco

Baixo e preferível para incidente de produção.

Trade-off: pode haver uma pequena perda do cache fino por vendor chunk, mas a plataforma volta a montar. O prefetch e o Suspense local continuam melhorando a percepção de velocidade sem arriscar ciclos de módulo.

Não vou aplicar sem sua confirmação. Ao aprovar, faço só esse rollback cirúrgico no `vite.config.ts` e atualizo o diagnóstico.