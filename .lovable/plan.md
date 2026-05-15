## Auditoria

Varri todas as 53 páginas em `src/pages/**` cruzando com imports (estáticos e `lazy(() => import(...))`) em todo `src/`. Critério aplicado: **arquivo existe + zero imports em qualquer outro arquivo + sem `<Route>` em `App.tsx`**.

### Resultado: 1 página órfã

- `src/pages/admin/NetworkDebug.tsx` (275 linhas) — UI de debug do grafo de rede para super-admin (lista edges, stats, super-connectors). Nenhum import em lugar nenhum, nenhuma `<Route>` apontando pra ela. As únicas referências ao nome `NetworkDebug` são internas ao próprio arquivo (declaração e log).

### O que NÃO é órfão (mas talvez parecesse)

Todas as outras páginas em `src/pages/**` — incluindo `HRDashboard`, `HRTeams`, `HRMembers`, `HRAnalytics`, `Enterprise`, `Evidence`, `SlackChannels`, `RecorderPopup`, etc. — **estão importadas via `lazy()` em `src/App.tsx`** e têm `<Route>` correspondente. Não entram nesse expurgo (se quiser limpar essas, é outra discussão: revisar rotas vivas mas sem links na UI).

## Plano

1. **Deletar** `src/pages/admin/NetworkDebug.tsx`.
2. Verificação pós-delete: `rg "NetworkDebug" src` deve voltar vazio; o build do Vite roda automaticamente.

Pronto. Escopo cirúrgico: 1 arquivo, sem riscos colaterais.

---

**Observação opcional** (fora deste plano): se quiser, num próximo passo posso varrer as páginas que **têm rota mas não têm link na UI** (rota viva sem entrada no menu/sidebar/CTA). Isso é uma categoria diferente de "órfã" e exige decisão caso a caso.