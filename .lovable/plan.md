

# Diagnóstico final do Google Cloud Console — TUDO está certo no Google

## ✅ O que vi no print do Público-alvo

| Campo | Valor | Status |
|---|---|---|
| Status de publicação | **Em produção** | ✅ Perfeito (não está em modo Teste) |
| Tipo de usuário | **Externo** | ✅ Correto (qualquer Google account pode autenticar) |
| Limite de usuários OAuth | **0/100** | ✅ Folga total pra testar |
| Aviso amarelo | "Seu aplicativo precisa ser verificado..." | ⚠️ Esperado — é exatamente isso que vamos resolver com a Central de Verificação depois |

**Conclusão consolidada do Google Cloud Console:**

| Aba | Status |
|---|---|
| Branding | ✅ 100% certo (Rhitmo, logo, support@rhitmo.co, rhitmo.co autorizado) |
| Público-alvo | ✅ 100% certo (Em produção, Externo, 0/100) |
| Credentials | ✅ 1 OAuth Client ID ("Rhitmo Login") |
| Central de verificação | ⏳ Aguardando vídeo + submissão |

---

## 🎯 O verdadeiro bloqueio (confirmado)

O `lybkgujyezzzvbzypxed.supabase.co` aparece na tela de consentimento **única e exclusivamente** porque o redirect URI configurado aponta pra lá. Não tem nada errado no Google — é configuração técnica do nosso lado.

E o aviso "Seu aplicativo precisa ser verificado" só vai sumir depois que:
1. ✅ Trocarmos o redirect pra `rhitmo.co/auth/google/callback` (Fase 1)
2. ✅ Gravarmos o vídeo mostrando o fluxo completo com `rhitmo.co` na tela de consentimento
3. ✅ Submetermos pra Central de Verificação

Sem o passo 1, o passo 2 não funciona (o vídeo mostraria `supabase.co` e o reviewer rejeitaria).

---

## 🚀 Plano de implementação (Opção A — Proxy de redirect)

### Fase 1 — Código (eu implemento)

**Novo arquivo:** `src/pages/GoogleCalendarCallback.tsx`

Página React pública que:
1. Extrai `code`, `state`, `error` da URL via `useSearchParams`
2. Mostra spinner editorial: "Conectando seu Google Calendar..." (estilo Creme/Bento, fonte Lora, fundo creme com onda Rhythm)
3. Faz POST pra `${SUPABASE_URL}/functions/v1/google-calendar-oauth?action=callback` com body `{ code, state }`
4. Em sucesso: `navigate('/?calendar=connected')` + toast "Google Calendar conectado!"
5. Em erro: mostra card editorial com mensagem amigável + botão "Tentar novamente" (volta pra `/`)
6. Trata caso `error=access_denied` (usuário cancelou no Google) com mensagem específica

**Editar:** `src/App.tsx`

Adicionar rota pública (fora do `<AppLayout>`, junto com as outras rotas públicas tipo `/invite`, `/reset-password`):

```tsx
<Route path="/auth/google/callback" element={<GoogleCalendarCallback />} />
```

**Editar:** `supabase/functions/google-calendar-oauth/index.ts`

Modificar a função pra suportar 2 modos de callback:
- **Modo legado (GET)**: `?action=callback&code=...&state=...` — continua funcionando, retorna redirect 302 (compatibilidade durante migração)
- **Modo novo (POST)**: `?action=callback` com body `{ code, state }` — retorna JSON `{ success: true, calendar_email: "..." }`

A action `authorize` continua igual, só o valor de `GOOGLE_REDIRECT_URI` (secret) vai mudar pro novo URL.

Lógica de troca code→tokens, validação do state contra `auth.uid()`, e persistência em `google_calendar_tokens` continuam idênticas.

### Fase 2 — Atualizar secret (eu disparo o pedido)

Atualizar secret `GOOGLE_REDIRECT_URI`:
- **De:** `https://lybkgujyezzzvbzypxed.supabase.co/functions/v1/google-calendar-oauth?action=callback`
- **Para:** `https://rhitmo.co/auth/google/callback`

### Fase 3 — Configurar no Google Cloud Console (você faz, ~3 min)

1. **APIs & Services → Credentials → Rhitmo Login**
2. Em **URIs de redirecionamento autorizados**, **adicionar** (não remover o antigo ainda):
   ```
   https://rhitmo.co/auth/google/callback
   ```
3. Salvar

(Opcional, depois do teste passar) Remover o URL antigo do Supabase.

### Fase 4 — Testar juntos (~5 min)

1. Login com `andygziemer@gmail.com` na Rhitmo
2. Dashboard → "Conectar Google Calendar"
3. Confirmar tela de consentimento mostra:
   > "Rhitmo quer acessar... compartilhará com **rhitmo.co**" ✨
4. Aprovar
5. Confirmar redirect: Google → `rhitmo.co/auth/google/callback` → spinner → `/?calendar=connected`
6. Confirmar dashboard mostra "Calendário conectado" + lista próximas reuniões

### Fase 5 — Gravar vídeo + Central de Verificação (você faz)

1. Gravar tela do fluxo completo: login → conectar calendar → tela de consentimento mostra `rhitmo.co` → aprovar → calendário sincronizado
2. Google Cloud → **Central de verificação** → submeter app com:
   - Vídeo gravado
   - Link da Política de Privacidade: `https://rhitmo.co/privacidade`
   - Link dos Termos: `https://rhitmo.co/termos`
   - Justificativa de uso de cada scope
3. Aguardar revisão (~4-6 semanas)

---

## 🔧 Detalhes técnicos importantes

### Por que precisa de página React intermediária?

O Google só aceita redirect URIs em domínios listados em **Authorized domains**. A tela de consentimento mostra esse domínio pro usuário ("você está dando acesso a [domínio]") — é uma proteção de transparência da Google, **não dá pra esconder**.

A única forma de mostrar `rhitmo.co` é o redirect realmente ir pra `rhitmo.co`. A página React serve como "trampolim": recebe o `code`, repassa pra Edge Function processar, e mostra UI bonita.

### Validação de segurança no `state`

O `state` continua sendo o `user_id` gerado quando o líder clicou em "Conectar Calendar" (já implementado). A Edge Function valida via `supabase.auth.getUser()` se o user_id bate com a sessão atual antes de salvar tokens. Isso protege contra CSRF.

### Compatibilidade durante migração

A Edge Function aceita os 2 formatos (GET legado e POST novo) durante a transição. Se algo der errado no front novo, o backend ainda funciona. Depois de validar, podemos remover o caminho legado.

### Por que rota pública (`/auth/google/callback` fora do AppLayout)?

O Google redireciona o browser cru, sem garantia de sessão Supabase ainda hidratada. A página precisa funcionar mesmo se a sessão estiver carregando — ela só repassa o `code` pra Edge Function, que valida via service role + state.

---

## ✅ Resultado esperado na tela de consentimento

**Antes:**
> Para continuar, o Google compartilhará seu nome, endereço de e-mail, idioma de preferência e foto do perfil com **lybkgujyezzzvbzypxed.supabase.co**.

**Depois:**
> Para continuar, o Google compartilhará seu nome, endereço de e-mail, idioma de preferência e foto do perfil com **rhitmo.co**.

---

## 📌 Fora de escopo (não fazer agora)

- Refatorar OAuth do Slack pro mesmo padrão (já funciona via `slack-oauth-callback` → `rhitmo.co/slack/connect`)
- Criar arquitetura genérica de OAuth proxy reutilizável (overengineering pra 1 integração)
- Submeter Central de Verificação automaticamente (precisa de input humano: vídeo + justificativas)
- Mexer em Recall.ai/Stripe/Resend (não usam OAuth do usuário final)

---

## ⏱️ Timeline estimada

| Fase | Quem | Tempo |
|---|---|---|
| Fase 1 — Código | Lovable | ~15 min |
| Fase 2 — Atualizar secret | Você (1 clique no prompt) | 30s |
| Fase 3 — Google Cloud Console | Você | 3 min |
| Fase 4 — Teste juntos | Nós dois | 5 min |
| Fase 5 — Vídeo + submissão | Você | 30 min |
| **Total até desbloqueio do teste visual** | | **~25 min** |

---

## 🎬 Aprovação

Aprova a implementação da Opção A? Eu posso começar imediatamente após o seu OK — começo pela Fase 1 (código), depois disparo o pedido de atualização do secret, te passo as instruções exatas pro Google Cloud Console, e testamos juntos.

