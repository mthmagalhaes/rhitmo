

# Seletor de Persona no Signup — "Sou Líder" vs "Sou Liderado"

## Problema atual

Quando a `andygziemer@gmail.com` clicou em "Começar grátis":
1. Foi direto pro signup sem declarar se era líder ou liderado
2. Após criar conta, o sistema tentou adivinhar o papel:
   - Sem workspace próprio → não é líder
   - Sem convite pendente pelo email → não é liderado vinculado
   - Resultado: caiu numa zona cinzenta ("Processando seu acesso...") em vez de receber o modal de criar workspace
3. Sem ser líder, **nunca veria** a opção de conectar Google Calendar — bloqueando o teste de OAuth

## Solução: Persona Selector explícito

Adicionar uma etapa intermediária entre "Começar grátis" e o signup, onde o usuário declara seu papel. Isso elimina ambiguidade e remove a tela "Processando..." pra novos signups.

### Fluxo novo

```text
Landing "Começar grátis"
        │
        ▼
┌─────────────────────────────────┐
│  Você quer usar o Rhitmo como?  │
│                                  │
│  ┌──────────┐  ┌──────────┐    │
│  │  LÍDER   │  │ LIDERADO │    │
│  │ de time  │  │          │    │
│  └──────────┘  └──────────┘    │
└─────────────────────────────────┘
        │              │
        ▼              ▼
   /auth?mode=     /auth?mode=
   signup&         signup&
   persona=leader  persona=member
        │              │
        ▼              ▼
  Cria workspace   Pede código de
  automaticamente  convite OU avisa
  (modal)          "peça ao seu líder"
```

## Mudanças necessárias

### 1. Nova rota `/auth/start` — Persona Selector
- Tela limpa, split-screen (segue Design System Creme/Bento)
- 2 cards grandes: **Líder de Time** (destaque, badge "Recomendado para testar") vs **Liderado** (secundário)
- Cada card explica em 1 linha o que vai acontecer:
  - Líder: "Crie seu workspace e convide seu time. Acesso a Google Calendar, AI Mentor e Reviews."
  - Liderado: "Você foi convidado pelo seu líder? Use o link do convite ou crie sua conta de acesso."
- Botão "Voltar para Landing" no header

### 2. Atualizar todos os CTAs "Começar grátis" da Landing
- Substituir `navigate('/auth?mode=signup')` por `navigate('/auth/start')` nos 6 pontos:
  - Header desktop (linha 878)
  - Sheet mobile (linha 947)
  - Hero (linha 987)
  - Card Pulse pricing (linha 667)
  - Card Líder persona (linha 1327)
  - Card PME persona (linha 1340)
- Manter `?plan=pro&cycle=...` no botão Pro (vai direto pro signup de líder + checkout)

### 3. Atualizar `AuthPage.tsx`
- Ler novo param `persona` da URL (`leader` | `member`)
- Passar pra `<Auth />` como prop
- Após signup bem-sucedido com `persona=leader`: garantir que cai no `WorkspaceOnboarding` (modal) — não no "Processando..."
- Após signup com `persona=member`: redirecionar pra tela de "Insira código de convite ou peça ao seu líder"

### 4. Atualizar `Auth.tsx`
- Receber prop `persona`
- Persistir intenção em `localStorage.setItem('signup_persona', persona)` durante o fluxo de signup com Google (sobrevive ao roundtrip OAuth)
- Mostrar título contextual: "Criar conta de Líder" vs "Criar conta de Liderado"

### 5. Atualizar `AppLayout.tsx` / `WorkspaceOnboarding.tsx`
- Ler `localStorage.signup_persona` no momento de decidir mostrar o `WorkspaceOnboarding`:
  - Se `persona === 'leader'` E sem workspace → força modal de criar workspace (mesmo se a heurística atual falhar)
  - Se `persona === 'member'` → não mostra workspace onboarding, redireciona pra tela de "aguardando vínculo / código de convite"
- Limpar `localStorage.signup_persona` após processar

### 6. Atualizar `DirectReportGuard.tsx`
- Antes de mostrar "Processando seu acesso...", checar `localStorage.signup_persona`:
  - Se `persona === 'leader'`, não bloqueia — deixa o `WorkspaceOnboarding` assumir
- Adicionar botão "Sou líder, não liderado" na tela de processamento (escape hatch pra quem caiu por engano)

### 7. Nova tela "Aguardando vínculo de convite" (para liderados sem invite)
- Substitui a tela genérica "Processando seu acesso..."
- Mostra: "Você se cadastrou como liderado mas não encontramos um convite pro seu email."
- 2 ações:
  - **"Tenho um código de convite"** → input pra colar código → chama `/invite?code=...`
  - **"Sou líder, na verdade"** → reseta persona pra `leader` e mostra `WorkspaceOnboarding`

## Detalhes técnicos

- **Roteamento:** adicionar `<Route path="/auth/start" element={<PersonaSelector />} />` em `src/App.tsx`
- **Novo arquivo:** `src/pages/PersonaSelector.tsx`
- **Novo arquivo:** `src/pages/AwaitingInvite.tsx` (substitui o estado órfão atual)
- **Persistência:** `localStorage.signup_persona` (mais confiável que query params durante OAuth roundtrip do Google)
- **Cleanup:** limpar localStorage em 3 pontos: após criar workspace, após vincular invite, após escolher "sou líder na verdade"

## Impacto na verificação Google OAuth

✅ **Resolve o bloqueio do teste** — `andygziemer@gmail.com` poderá:
1. Clicar "Começar grátis"
2. Escolher "Sou Líder de time"
3. Fazer signup com Google
4. Cair direto no modal de criar workspace
5. Ver o dashboard de líder com opção de conectar Google Calendar
6. Você grava o vídeo pra Central de Verificação ✨

## Fora de escopo (não fazer agora)

- Reformular o Onboarding de 3 etapas existente (Identidade/Job Crafting/Futuro) — esse é o onboarding do **liderado já vinculado**, fluxo diferente
- Mexer no fluxo de convite via email (`/invite?code=...`) — já funciona
- Mexer no fluxo de HR Admin (vem via bulk-onboard, não pela landing)
- Tradução EN/ES dos textos novos — fazer junto, mas não bloquear

