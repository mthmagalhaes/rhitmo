

## Plano: Hotfix - Habilitar Cadastro para Usuarios Convidados

### Resumo das Alteracoes

| Arquivo | Alteracao |
|---------|-----------|
| Nova migracao SQL | Atualizar RPC `get_invite_details` para incluir `member_email` |
| `src/pages/Invite.tsx` | Redirecionar para `/auth?mode=signup&email=...` com email pre-preenchido |
| `src/components/Auth.tsx` | Adicionar modo signup condicional para usuarios com convite pendente |
| `src/pages/AuthPage.tsx` | Passar parametros de URL para o componente Auth |

---

### Parte 1: Atualizar RPC get_invite_details

Adicionar o campo `member_email` ao retorno da funcao para pre-preencher no formulario de cadastro:

```sql
CREATE OR REPLACE FUNCTION public.get_invite_details(p_invite_token uuid)
RETURNS TABLE(
  member_id uuid,
  member_name text,
  member_email text,  -- NOVO
  workspace_name text
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT 
    tm.id as member_id,
    tm.name as member_name,
    tm.email as member_email,  -- NOVO
    w.name as workspace_name
  FROM public.team_members tm
  JOIN public.teams t ON t.id = tm.team_id
  JOIN public.workspaces w ON w.id = t.workspace_id
  WHERE tm.invite_token = p_invite_token
    AND tm.invite_status = 'pending'
    AND w.is_active = true
$$;
```

---

### Parte 2: Atualizar Invite.tsx

#### 2.1 Adicionar email ao InviteData

```typescript
interface InviteData {
  memberName: string;
  memberEmail: string | null;  // NOVO
  workspaceName: string;
  memberId: string;
}
```

#### 2.2 Atualizar handleAcceptInvite

Quando usuario nao esta logado, redirecionar com parametros:

```typescript
const handleAcceptInvite = async () => {
  if (!user) {
    sessionStorage.setItem('pending_invite', code!);
    
    // Construir URL com parametros para signup
    const params = new URLSearchParams({
      mode: 'signup',
    });
    
    // Pre-preencher email se disponivel
    if (inviteData?.memberEmail) {
      params.set('email', inviteData.memberEmail);
    }
    
    navigate(`/auth?${params.toString()}`);
    return;
  }
  // ... resto do codigo
};
```

---

### Parte 3: Atualizar Auth.tsx (Componente Principal)

#### 3.1 Novas Props

```typescript
interface AuthProps {
  defaultMode?: 'login' | 'signup';
  defaultEmail?: string;
  isInviteFlow?: boolean;
}
```

#### 3.2 Adicionar Estado de Modo

```typescript
const [isSignUp, setIsSignUp] = useState(defaultMode === 'signup');
```

#### 3.3 Adicionar Funcao de Signup

```typescript
const handleSignUp = async (e: React.FormEvent) => {
  e.preventDefault();
  setLoading(true);
  try {
    const { error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        emailRedirectTo: `${window.location.origin}/dashboard`
      }
    });
    if (error) throw error;
    toast({
      title: "Conta criada com sucesso!",
      description: "Voce ja esta logado no Rhitmo."
    });
  } catch (error: any) {
    toast({
      title: "Erro",
      description: error.message,
      variant: "destructive"
    });
  } finally {
    setLoading(false);
  }
};
```

#### 3.4 Alert de Contexto para Convite

Quando `isInviteFlow = true`, exibir banner no topo do formulario:

```tsx
{isInviteFlow && (
  <div className="flex items-center gap-2 p-3 bg-primary/10 rounded-lg text-sm text-primary">
    <Sparkles className="h-4 w-4" />
    <span>Cadastre uma senha para acessar sua conta</span>
  </div>
)}
```

#### 3.5 UI Condicional (Login vs Signup)

```tsx
{isSignUp ? (
  <form onSubmit={handleSignUp} className="space-y-6">
    {/* Campo Confirmar Senha adicional */}
    {/* Botao "Criar Conta" */}
  </form>
) : (
  <form onSubmit={handleLogin} className="space-y-6">
    {/* Formulario atual de login */}
  </form>
)}
```

#### 3.6 Toggle entre Login/Signup (apenas para fluxo de convite)

```tsx
{isInviteFlow && (
  <div className="text-center pt-4">
    <p className="text-sm text-muted-foreground">
      {isSignUp ? (
        <>
          Ja tem uma conta?{' '}
          <button onClick={() => setIsSignUp(false)} className="text-primary hover:underline font-medium">
            Fazer Login
          </button>
        </>
      ) : (
        <>
          Primeira vez aqui?{' '}
          <button onClick={() => setIsSignUp(true)} className="text-primary hover:underline font-medium">
            Criar Conta
          </button>
        </>
      )}
    </p>
  </div>
)}
```

---

### Parte 4: Atualizar AuthPage.tsx

Ler parametros da URL e detectar convite pendente:

```typescript
const AuthPage = () => {
  const { user, loading } = useAuth();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  
  // Ler parametros da URL
  const mode = searchParams.get('mode') as 'login' | 'signup' | null;
  const emailParam = searchParams.get('email');
  
  // Detectar se e fluxo de convite
  const hasPendingInvite = !!sessionStorage.getItem('pending_invite');
  const isInviteFlow = hasPendingInvite || mode === 'signup';

  // ... resto do codigo

  return (
    <Auth 
      defaultMode={isInviteFlow ? 'signup' : 'login'}
      defaultEmail={emailParam || undefined}
      isInviteFlow={isInviteFlow}
    />
  );
};
```

---

### Parte 5: Fluxo Completo

```text
┌─────────────────────────────────────────────────────────────────┐
│                 FLUXO DE CONVITE COM SIGNUP                     │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  1. LIDERADO acessa /invite?code=XYZ                            │
│     └── RPC get_invite_details retorna nome + email             │
│     └── Exibe Card de boas-vindas                               │
│                                                                 │
│  2. LIDERADO clica "Aceitar e Acessar"                          │
│     └── sessionStorage.set('pending_invite', code)              │
│     └── Redirect para /auth?mode=signup&email=lais@email.com    │
│                                                                 │
│  3. Auth.tsx detecta modo signup + pending_invite               │
│     └── Exibe alerta: "Cadastre uma senha..."                   │
│     └── Mostra formulario de Criar Conta                        │
│     └── Email pre-preenchido e readonly                         │
│                                                                 │
│  4. LIDERADO preenche senha e clica "Criar Conta"               │
│     └── supabase.auth.signUp({ email, password })               │
│     └── AuthEventProvider detecta SIGNED_IN                     │
│     └── Processa pending_invite automaticamente                 │
│     └── Vincula linked_user_id e limpa token                    │
│                                                                 │
│  5. LIDERADO e redirecionado para /dashboard                    │
│     └── Ve seu perfil e feedbacks compartilhados                │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

---

### Secao Tecnica

#### Alteracoes Visuais no Auth.tsx

| Modo | Titulo | Subtitulo | Campos |
|------|--------|-----------|--------|
| Login (padrao) | "Acesso Restrito" | "Exclusivo para convidados" | Email + Senha |
| Signup (convite) | "Criar sua Conta" | "Complete seu cadastro para acessar" | Email (readonly) + Senha + Confirmar Senha |

#### Campo Email Pre-preenchido

Quando vindo do convite, o email deve ser readonly para evitar que o usuario altere:

```tsx
<Input 
  id="email" 
  type="email" 
  value={email} 
  onChange={e => !isInviteFlow && setEmail(e.target.value)} 
  readOnly={isInviteFlow && !!defaultEmail}
  className={isInviteFlow && defaultEmail ? "bg-muted" : ""}
/>
```

#### Validacao de Confirmacao de Senha

```typescript
const [confirmPassword, setConfirmPassword] = useState('');

const handleSignUp = async (e: React.FormEvent) => {
  e.preventDefault();
  
  if (password !== confirmPassword) {
    toast({
      title: "Senhas nao conferem",
      description: "Digite a mesma senha nos dois campos.",
      variant: "destructive"
    });
    return;
  }
  
  // ... prosseguir com signup
};
```

#### Seguranca: Signup Restrito ao Fluxo de Convite

O formulario de signup so aparece quando:
1. `mode=signup` na URL **E**
2. `pending_invite` existe no sessionStorage

Se alguem tentar acessar `/auth?mode=signup` diretamente sem convite valido, o sistema deve redirecionar para a waitlist ou exibir apenas o login.

```typescript
// Protecao contra bypass
const isInviteFlow = hasPendingInvite && mode === 'signup';

// Se mode=signup mas nao tem convite, ignorar
if (mode === 'signup' && !hasPendingInvite) {
  // Exibir login normal
}
```

#### Integracao com AuthEventProvider

O fluxo atual do `AuthEventProvider` ja processa o `pending_invite` apos o evento `SIGNED_IN`. Isso funciona tanto para login quanto para signup:

1. Usuario cria conta via signup
2. Supabase emite evento `SIGNED_IN`
3. AuthEventProvider detecta e executa `processPendingInvite()`
4. Token e vinculado e limpo

Nao e necessario modificar o `AuthEventProvider`.

