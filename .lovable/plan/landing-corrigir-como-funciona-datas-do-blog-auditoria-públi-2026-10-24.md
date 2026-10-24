# Landing: corrigir "Como funciona", datas do blog, auditoria pública e calculadora

## 1. "Como funciona" cair na seção certa
Hoje o link leva para os números. Passa a levar para o início da jornada em 4 atos (1:1, evidências, avaliação pela cultura, Espelho). Vale no menu do computador, no menu do celular, no rodapé e vindo do Blog/Integrações. Links antigos `#impacto` continuam levando para os números.

## 2. Datas do blog
Tirar a data visível dos cards e dos artigos e mostrar só o tempo de leitura. Não inventar datas passadas (o Google trataria como informação falsa). A data real fica escondida apenas para o Google.

## 3. Auditoria de todas as páginas públicas
Abrir no computador e no celular: início, /integracoes e cada integração, /blog e cada artigo, /recursos, guias, modelo, gerador, /confianca, privacidade, termos, /enterprise. Checar links quebrados, botões de teste (deixar todos indo para o mesmo cadastro), títulos para o Google e menu igual. Corrigir o que for simples e listar o resto para você. A página do LinkedIn será lida se estiver pública; se o LinkedIn bloquear, aviso.

## 4. Calculadora de custo da avaliação
Nova página grátis "Quanto custa o ciclo de avaliação" com: número de liderados, salário médio do líder, horas por liderado por ciclo, ciclos por ano. Mostra horas e custo por ano com a conta à vista, botão para copiar o resultado e convite para o teste. Sem promessas de economia em porcentagem. Entra no rodapé, em /recursos e no Blog.

## 5. Verificação final
Playwright no computador e no celular (largura 492px): clique em "Como funciona" a partir do início e do Blog, blog sem datas, calculadora calculando, e relatório do que ficou pendente.

## Detalhes técnicos
- `Landing.tsx`: mover `id="como-funciona"` para antes de `SarahJourneySection` (l.1315); trocar `href="#impacto"` (l.1057, 1110, 1304, 1543) por `#como-funciona`; manter `id="impacto"` nos números.
- `Blog.tsx`/`BlogPost.tsx`: remover `formatPostDate` da UI; manter `datePublished` no JSON-LD.
- Unificar `TRIAL_URL` e `/auth/start` num destino só, preservando UTM.
- Nova rota lazy `/ferramentas/calculadora-custo-avaliacao` em `routeLoaders.ts`/`App.tsx`, sitemap e evento via `productAnalytics.ts` (só números agregados).
