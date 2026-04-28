## Diagnóstico

O Google está rejeitando a verificação OAuth por dois motivos distintos:

### 1. URL da Política de Privacidade "não funcionando" — problema técnico (resolvível no código)

O Rhitmo é uma SPA React. Quando o crawler do Google OAuth Consent Screen acessa `https://rhitmo.co/privacy-policy`, ele **não executa JavaScript** — recebe apenas o HTML do `index.html`, que tem `<div id="root"></div>` vazio e `<title>` da landing page. Validei agora com `curl` simulando Googlebot: retorna 200, mas zero ocorrências das palavras "política", "privacidade" ou "privacy" no HTML. Para o revisor, isso significa "URL inválida".

A página existe e está completa em `src/pages/PrivacyPolicy.tsx` — só não é vista por crawlers.

### 2. Vídeo de demonstração insuficiente — ação manual fora do código

O Google quer um vídeo mostrando: (a) o fluxo de consentimento OAuth do Google sendo executado de ponta a ponta no app, e (b) o que o app faz com os dados do Google Calendar depois. **Isso não tem fix técnico** — é um deliverable de processo (regravar e reenviar pelo Console). Vou explicar abaixo o que o vídeo precisa mostrar, mas o plano de código foca apenas no item 1.

---

## Plano (código)

Servir versões HTML estáticas (pré-renderizadas) das páginas legais diretamente via `public/`, para que crawlers sem JS leiam o conteúdo completo. Estratégia: arquivos físicos em `public/privacy-policy.html` e `public/terms-of-service.html` que o servidor entrega antes do fallback da SPA.

Como a SPA usa `BrowserRouter`, precisamos garantir que o request pra `/privacy-policy` sirva o HTML estático e **não** o `index.html` da SPA. A forma mais simples e à prova de hospedagem (Lovable / Vercel-like) é:

- Criar os arquivos como **pastas com `index.html`**: `public/privacy-policy/index.html` e `public/terms-of-service/index.html`. A maioria das hospedagens estáticas resolve `/privacy-policy` para `/privacy-policy/index.html` antes do fallback SPA. Isso evita conflito com a rota React.
- Manter as rotas React existentes (`/privacy-policy`, `/terms-of-service`) — usuários autenticados que já carregaram a SPA continuam tendo a experiência rica. O HTML estático só é usado quando o request chega "frio" (crawler, link direto sem cache de SPA).

### Conteúdo dos HTMLs estáticos

Auto-contidos, sem dependências externas:
- `<!doctype html>` com `lang="pt-BR"`, charset, viewport
- `<title>` específico (ex.: "Política de Privacidade — Rhitmo")
- `<meta name="description">` adequado
- `<link rel="canonical" href="https://rhitmo.co/privacy-policy">`
- CSS inline minimalista (system font stack, max-width, espaçamento) para parecer apresentável se um humano abrir
- Conteúdo textual completo replicando `src/pages/PrivacyPolicy.tsx` (13 seções da LGPD) e `src/pages/TermsOfService.tsx`
- Link "Voltar para rhitmo.co" no topo
- Footer simples com links cruzados entre Política e Termos

### Sincronização do conteúdo

Como o conteúdo agora vive em dois lugares (TSX + HTML estático), adicionar um comentário no topo de ambos os arquivos avisando: "Ao alterar este texto, atualize também `public/privacy-policy/index.html` (e vice-versa)". Manter os dois é trivial — são páginas que mudam raramente.

### Arquivos a criar/editar

```
public/privacy-policy/index.html      ← novo (HTML estático completo)
public/terms-of-service/index.html    ← novo (HTML estático completo)
src/pages/PrivacyPolicy.tsx           ← adicionar comentário de sincronização no topo
src/pages/TermsOfService.tsx          ← adicionar comentário de sincronização no topo
```

### Validação após o deploy

1. `curl -A "Googlebot" https://rhitmo.co/privacy-policy` deve retornar HTML com o conteúdo real (palavras "política", "privacidade", seções LGPD visíveis no HTML bruto).
2. `curl -A "Googlebot" https://rhitmo.co/terms-of-service` idem.
3. Acessar as URLs no navegador como usuário normal continua funcionando (a hospedagem serve o HTML estático; usuários conseguem clicar para voltar à landing).
4. Reenviar a verificação no Google Cloud Console.

---

## Sobre o vídeo de demonstração (sem ação de código)

O vídeo precisa mostrar, na ordem:

1. **Tela inicial do app** com o botão/CTA de "Conectar Google Calendar" (na página de configurações ou no fluxo de agendamento de reuniões).
2. **Clique no botão** → redirecionamento para a tela de consentimento do Google → escolha de conta Google → tela mostrando os escopos solicitados (`calendar.readonly` ou similar) → clique em "Permitir".
3. **Retorno ao app** com confirmação visual de que a conexão foi feita.
4. **Uso real dos dados**: o app listando eventos do calendário do usuário, agendando o bot Recall.ai numa reunião, e o brief sendo gerado a partir do evento. Ou seja, demonstrar **por que** o app pediu o escopo.
5. **Tela de revogação/desconexão** (opcional, mas recomendado): mostrar onde o usuário pode desconectar a conta Google.

Duração ideal: 2 a 4 minutos. Sem cortes longos, sem música por cima da narração, e o áudio em PT-BR ou EN — o revisor do Google avalia em inglês, então legendas em EN ajudam. Subir como vídeo público (não-listado) no YouTube e colar a URL no Console.

---

## Resumo

- **Código**: criar 2 arquivos HTML estáticos auto-contidos em `public/` para que o Googlebot leia o conteúdo das páginas legais. Não altera comportamento para usuários autenticados nem rotas React existentes.
- **Manual (você)**: regravar o vídeo seguindo o roteiro acima e reenviar a verificação no Google Console. Sem isso, mesmo com a Política funcionando, o item "Funcionalidade do app" continuará reprovado.