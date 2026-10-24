---
name: rhitmo-design-auditor
description: Use ao criar, revisar ou ajustar telas e componentes da Rhitmo (app logado ou landing) para auditar o design system Creme/Bento, tokens semânticos, tipografia, acessibilidade e responsividade mobile antes de entregar.
---

# Rhitmo Design Auditor

Guardião do design system. Referência completa: `docs/design-system.md` e `src/index.css` / `tailwind.config.ts`.

## Regras
1. **Tokens semânticos sempre.** Proibido `bg-white`, `text-black`, `bg-[#...]`, `text-gray-*` cru em componentes. Usar `bg-background`, `text-foreground`, `bg-card`, `text-muted-foreground`, variants do shadcn.
2. **Raio:** cards/containers `rounded-2xl` ou `rounded-3xl`; inputs/botões `rounded-xl`.
3. **Sombras difusas** (`shadow-[0_2px_20px_rgba(0,0,0,0.04)]` ou token equivalente) em vez de bordas duras.
4. **Tipografia:** Lora (serif) em H1-H3 com `font-bold tracking-tight`; Inter no corpo.
5. **Layout:** container `max-w-5xl`; telas master-detail (/lider/1on1s, /diario, /objetivos) seguem o padrão full-bleed. Dashboard em Bento Grid assimétrico, sem scroll horizontal.
6. **Interação:** cards clicáveis com lift `hover:-translate-y-1` + transição; respeitar `prefers-reduced-motion`.
7. **Privacidade visual:** nota privada = cadeado, compartilhada = olho.
8. **Acessibilidade:** contraste AA, `aria-label` em botões só-ícone, foco visível, alvos ≥ 40px no mobile.
9. Landing/páginas públicas: visual branco/slate da landing, CTA preto, sem travessão.

## Auditoria rápida
```bash
rg -n "bg-white|bg-black|text-white|text-black|bg-\[#|text-\[#|border-\[#" src/components src/pages
rg -n "rounded-(md|lg)\b" <arquivos alterados>
```
Corrigir ocorrências nos arquivos tocados (não refatorar o projeto inteiro sem pedido).

## Verificação visual
Playwright com viewport 1280x1800 e 492x835 (locale `pt-BR`). Screenshot por elemento para conferir. Checar: sem overflow horizontal (`document.documentElement.scrollWidth <= innerWidth`), drawer mobile abre/fecha, textos não cortados.

## Saída
Lista curta: ✅ ok / ⚠️ corrigido / ❌ pendente, com arquivo:linha.
