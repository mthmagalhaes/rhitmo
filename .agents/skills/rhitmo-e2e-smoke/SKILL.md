---
name: rhitmo-e2e-smoke
description: Use antes de dar uma tarefa como concluída ou quando pedirem "smoke test", "ver se nada quebrou" ou "validar a plataforma". Roda roteiro Playwright nos fluxos vitais (páginas públicas, mobile, telas autenticadas do líder) e devolve relatório verde/vermelho.
---

# Rhitmo E2E Smoke

Roteiro pronto em `scripts/smoke.py`. Copiar e rodar:
```bash
mkdir -p /tmp/browser/smoke && cp /tmp/knowledge/skill/rhitmo-e2e-smoke/scripts/smoke.py /tmp/browser/smoke/ 2>/dev/null || cp .workspace/skills/rhitmo-e2e-smoke/scripts/smoke.py /tmp/browser/smoke/
python3 /tmp/browser/smoke/smoke.py > /tmp/browser/smoke/out.txt 2>&1; tail -60 /tmp/browser/smoke/out.txt
```

## Antes de rodar
1. Ler `/tmp/observability/build-errors.log` (última entrada precisa ser "build OK").
2. Sessão autenticada: se `LOVABLE_BROWSER_AUTH_STATUS` não for `injected`, rodar `lovable auth-session --json --self`. O script lê env ou `~/.cache/lovable-auth/session.json`. Nunca imprimir tokens.

## O que cobre
- Públicas (desktop 1280): `/`, `/blog`, um post, `/integracoes`, `/recursos`, `/ferramentas/calculadora-custo-avaliacao` → sem erro de console, sem overflow, H1 presente.
- Mobile 492x835: menu `aria-label="Menu"` abre, link "Como funciona" fecha drawer e rola.
- Autenticadas (se houver sessão): `/lider/inicio`, `/lider/pessoas`, `/lider/diario`, `/lider/conectores` → saem do loader em ≤15s, sem tela de erro.
Adicionar ao script a rota específica da tarefa atual quando fizer sentido.

## Saída
Tabela ✅/❌ por rota com erro de console resumido; ver screenshots em `/tmp/browser/smoke/shots/` dos ❌ antes de reportar. Não declarar "tudo ok" com ❌ pendente.
