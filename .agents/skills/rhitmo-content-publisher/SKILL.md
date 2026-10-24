---
name: rhitmo-content-publisher
description: Use ao criar ou editar conteúdo público do rhitmo.co (post de blog, página de integração/conector, guia, ferramenta como calculadora, página em /recursos). Garante tom editorial, SEO/JSON-LD, rota lazy, sitemap, telemetria PostHog e CTA de conversão.
---

# Rhitmo Content Publisher

Checklist para publicar conteúdo público sem esquecer nada. Páginas públicas usam `src/components/content/ContentLayout.tsx` (menu unificado: Como funciona · Integrações · Blog · Preços · FAQ · Entrar · Começar teste grátis).

## Onde cada coisa mora
- Posts: `src/content/blog.ts` (páginas `src/pages/content/Blog.tsx` / `BlogPost.tsx`).
- Integrações: cards vêm de `src/lib/connectorsCatalog.ts`; só copy editorial em `src/content/integracoes.ts`. Nunca duplicar dados de conector.
- Guias: `src/content/guias.ts`. Ferramentas: `src/pages/content/*` (ex.: `CalculadoraCusto.tsx`).
- Rotas lazy: `src/lib/routeLoaders.ts` + `src/App.tsx`.
- Sitemap: `public/sitemap.xml`. GEO: `public/llms.txt`.
- Telemetria: só via `capture()` de `src/lib/productAnalytics.ts`.

## Regras editoriais (não-negociáveis)
1. Português BR, tom Early Adopter, profissional, para líderes de tecnologia e RH.
2. Sem travessão (em-dash "—"). Use vírgula, dois-pontos ou ponto.
3. Nunca inventar estatísticas, depoimentos, clientes, datas ou URLs (ex.: LinkedIn só quando o Matheus enviar o link).
4. Data de post: não exibir na UI; data real só no JSON-LD (`datePublished`). Nunca retroagir datas.
5. Claims de produto só sobre o que existe (Zoom/Teams são "Em breve").

## Checklist técnico
- [ ] `<title>` (≤60 chars) e meta description (≤160) via Helmet, únicos por página
- [ ] og:title, og:description, canonical `https://rhitmo.co/...`
- [ ] JSON-LD adequado (`BlogPosting`, `SoftwareApplication`, `FAQPage`, `WebApplication`)
- [ ] Um único H1; H2/H3 com `tracking-tight`
- [ ] Rota lazy registrada em `routeLoaders.ts` e `App.tsx`
- [ ] URL adicionada em `public/sitemap.xml` (e `llms.txt` se for página-pilar)
- [ ] CTA de trial usa `TRIAL_URL` do ContentLayout (`/auth/start?utm_source=content&utm_medium=organic`)
- [ ] Post de avaliação/1:1: manter callout da calculadora no fim (evento `blog_calculator_cta_clicked`)
- [ ] Eventos novos em snake_case com só IDs/slugs, nunca texto do usuário
- [ ] Link interno para 2+ páginas relacionadas (blog ↔ integrações ↔ recursos)

## Verificação
Playwright em 1280 e 492 (locale `pt-BR`): página abre sem erro de console, título correto, CTA navega. Rodar `bun test` se tocar lógica de ferramenta.
