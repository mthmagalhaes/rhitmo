

## Plano: Pagina de Aceite de Convite (Visual System)

### Resumo das Alteracoes

| Arquivo | Alteracao |
|---------|-----------|
| `src/pages/Invite.tsx` | **NOVO** - Pagina publica de aceite de convite com visual consistente |
| `src/App.tsx` | Adicionar rota `/invite` |
| `src/pages/AuthPage.tsx` | Adicionar logica para processar `pending_invite` apos login |
| `src/components/AuthEventProvider.tsx` | Adicionar listener para processar convite pendente apos autenticacao |

---

### Parte 1: Nova Pagina Invite.tsx

#### 1.1 Layout Visual (Baseado no Auth.tsx e RhitmoSync.tsx)

```text
┌─────────────────────────────────────────────────────────────────┐
│                                                                 │
│              ┌─────────────────────────────┐                    │
│              │     🎵 [RhitmoLogo]         │                    │
│              │                             │                    │
│              │    ✨ (Sparkles Icon)       │                    │
│              │                             │                    │
│              │  Ola, Lais!                 │                    │
│              │  Matheus convidou voce      │                    │
│              │  para colaborar no Rhitmo.  │                    │
│              │                             │                    │
│              │  [  Aceitar e Acessar  ]    │                    │
│              │                             │                    │
│              └─────────────────────────────┘                    │
│                                                                 │
│              bg-background + Card centralizado                  │
└─────────────────────────────────────────────────────────────────┘
```

#### 1.2 Estados da Pagina

| Estado | UI |
|--------|-----|
| Loading | Spinner centralizado com `bg-background` |
| Erro (token invalido) | Card com icone de erro + "Convite expirado ou invalido" |
| Sucesso (token valido) | Card de boas-vindas + botao de acao |
| Processando | Botao desabilitado com loading spinner |

#### 1.3 Estrutura do Componente

```typescript
interface InviteData {
  memberName: string;
  workspaceName: string;
  memberId: string;
}

export default function Invite() {
  const [searchParams] = useSearchParams();
  const code = searchParams.get('code');
  
  const [loading, setLoading] = useState(true);
  const [processing, setProcessing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [inviteData, setInviteData] = useState<InviteData | null>(null);
  
  const { user } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();
  
  // Carregar dados do convite
  useEffect(() => {
    validateInvite();
  }, [code]);
  
  // Processar convite automaticamente se usuario ja logado
  useEffect(() => {
    if (user && inviteData) {
      handleAcceptInvite();
    }
  }, [user, inviteData]);
  
  // ...
}
```

---

### Parte 2: Logica de Validacao

#### 2.1 Query para Buscar Dados do Convite

Para permitir acesso publico ao token sem expor dados sensiveis, criaremos uma nova funcao RPC:

```sql
CREATE OR REPLACE FUNCTION public.get_invite_details(p_invite_token uuid)
RETURNS TABLE(
  member_id uuid,
  member_name text,
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
    w.name as workspace_name
  FROM public.team_members tm
  JOIN public.teams t ON t.id = tm.team_id
  JOIN public.workspaces w ON w.id = t.workspace_id
  WHERE tm.invite_token = p_invite_token
    AND tm.invite_status = 'pending'
    AND w.is_active = true
$$;
```

#### 2.2 Funcao de Validacao no Frontend

```typescript
const validateInvite = async () => {
  if (!code) {
    setError('Link de convite invalido');
    setLoading(false);
    return;
  }

  try {
    const { data, error: rpcError } = await supabase.rpc('get_invite_details', {
      p_invite_token: code
    });

    if (rpcError) throw rpcError;
    if (!data || data.length === 0) {
      setError('Convite expirado ou ja utilizado');
      setLoading(false);
      return;
    }

    const invite = data[0];
    setInviteData({
      memberId: invite.member_id,
      memberName: invite.member_name,
      workspaceName: invite.workspace_name,
    });
  } catch (err) {
    console.error('Error validating invite:', err);
    setError('Erro ao validar convite');
  } finally {
    setLoading(false);
  }
};
```

---

### Parte 3: Logica de Handshake

#### 3.1 Funcao de Aceite do Convite

```typescript
const handleAcceptInvite = async () => {
  // Cenario A: Usuario nao esta logado
  if (!user) {
    // Salvar codigo no sessionStorage
    sessionStorage.setItem('pending_invite', code!);
    // Redirecionar para login
    navigate('/auth');
    return;
  }

  // Cenario B: Usuario ja logado - vincular conta
  setProcessing(true);
  try {
    const { error } = await supabase
      .from('team_members')
      .update({
        linked_user_id: user.id,
        invite_status: 'accepted',
        invite_token: null  // Limpar token apos uso
      })
      .eq('invite_token', code);

    if (error) throw error;

    toast({
      title: "Convite aceito com sucesso!",
      description: `Bem-vindo ao ${inviteData?.workspaceName}!`,
    });

    // Redirecionar para dashboard
    navigate('/dashboard', { replace: true });
  } catch (err: any) {
    console.error('Error accepting invite:', err);
    toast({
      title: "Erro ao aceitar convite",
      description: err.message,
      variant: "destructive"
    });
  } finally {
    setProcessing(false);
  }
};
```

---

### Parte 4: Integracao com AuthEventProvider

#### 4.1 Processar Convite Pendente Apos Login

Adicionar ao `AuthEventProvider.tsx`:

```typescript
useEffect(() => {
  const processPendingInvite = async () => {
    const pendingCode = sessionStorage.getItem('pending_invite');
    if (!pendingCode) return;

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    try {
      const { error } = await supabase
        .from('team_members')
        .update({
          linked_user_id: user.id,
          invite_status: 'accepted',
          invite_token: null
        })
        .eq('invite_token', pendingCode);

      if (!error) {
        toast({
          title: "Convite aceito com sucesso!",
          description: "Voce foi vinculado a equipe.",
        });
      }
    } catch (err) {
      console.error('Error processing pending invite:', err);
    } finally {
      sessionStorage.removeItem('pending_invite');
    }
  };

  // Escutar evento de login
  const { data: { subscription } } = supabase.auth.onAuthStateChange((event) => {
    if (event === 'SIGNED_IN') {
      processPendingInvite();
    }
  });

  return () => subscription.unsubscribe();
}, []);
```

---

### Parte 5: JSX da Pagina Invite.tsx

```tsx
return (
  <div className="min-h-screen flex items-center justify-center bg-background p-4">
    <Card className="w-full max-w-md p-8">
      {/* Logo */}
      <div className="flex justify-center mb-6">
        <RhitmoLogo size="md" className="text-primary" />
      </div>

      {loading ? (
        {/* Estado Loading */}
        <div className="text-center py-8">
          <Loader2 className="h-8 w-8 animate-spin text-primary mx-auto" />
          <p className="text-muted-foreground mt-4">Validando convite...</p>
        </div>
      ) : error ? (
        {/* Estado Erro */}
        <div className="text-center py-8 space-y-4">
          <div className="w-16 h-16 rounded-full bg-destructive/10 flex items-center justify-center mx-auto">
            <XCircle className="h-8 w-8 text-destructive" />
          </div>
          <div>
            <h1 className="text-2xl font-bold tracking-tight text-foreground">
              Convite Invalido
            </h1>
            <p className="text-muted-foreground mt-2">
              {error}
            </p>
          </div>
          <Button variant="outline" asChild className="mt-4">
            <Link to="/">Voltar para o inicio</Link>
          </Button>
        </div>
      ) : inviteData && (
        {/* Estado Sucesso */}
        <div className="text-center space-y-6">
          {/* Icone de boas-vindas */}
          <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center mx-auto">
            <Sparkles className="h-8 w-8 text-primary" />
          </div>

          {/* Titulo e Descricao */}
          <div className="space-y-2">
            <h1 className="text-2xl font-bold tracking-tight text-foreground">
              Ola, {inviteData.memberName}!
            </h1>
            <p className="text-muted-foreground">
              Voce foi convidado para colaborar no <strong>{inviteData.workspaceName}</strong> atraves do Rhitmo.
            </p>
          </div>

          {/* Botao de Acao */}
          <Button 
            onClick={handleAcceptInvite}
            disabled={processing}
            size="lg"
            className="w-full"
          >
            {processing ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Processando...
              </>
            ) : (
              <>
                <UserCheck className="mr-2 h-4 w-4" />
                Aceitar e Acessar
              </>
            )}
          </Button>

          {/* Nota de privacidade */}
          <p className="text-xs text-muted-foreground">
            Ao aceitar, voce podera visualizar feedbacks compartilhados pelo seu lider.
          </p>
        </div>
      )}
    </Card>
  </div>
);
```

---

### Parte 6: Adicionar Rota no App.tsx

```tsx
// Importar nova pagina
import Invite from "./pages/Invite";

// Dentro de <Routes>
{/* Rotas publicas (sem sidebar) */}
<Route path="/sync/:memberId" element={<RhitmoSync />} />
<Route path="/invite" element={<Invite />} />
```

---

### Secao Tecnica

#### Diagrama do Fluxo de Convite

```text
┌─────────────────────────────────────────────────────────────────┐
│                    FLUXO COMPLETO DE CONVITE                    │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  1. LIDER gera convite em MemberDetails                         │
│     └── invite_token = UUID gerado                              │
│     └── invite_status = 'pending'                               │
│                                                                 │
│  2. LIDERADO acessa /invite?code=XYZ                            │
│     └── RPC get_invite_details valida token                     │
│     └── Exibe Card de boas-vindas                               │
│                                                                 │
│  3a. Se NAO logado:                                             │
│      └── sessionStorage.set('pending_invite', code)             │
│      └── Redirect para /auth                                    │
│      └── Apos login, AuthEventProvider processa convite         │
│                                                                 │
│  3b. Se JA logado:                                              │
│      └── UPDATE team_members SET linked_user_id = auth.uid      │
│      └── invite_status = 'accepted', invite_token = null        │
│      └── Redirect para /dashboard                               │
│                                                                 │
│  4. LIDERADO logado ve:                                         │
│     └── Seu perfil (via RLS linked_user_id)                     │
│     └── Feedbacks com visibility = 'shared'                     │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

#### Nova Funcao RPC Necessaria

```sql
CREATE OR REPLACE FUNCTION public.get_invite_details(p_invite_token uuid)
RETURNS TABLE(
  member_id uuid,
  member_name text,
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
    w.name as workspace_name
  FROM public.team_members tm
  JOIN public.teams t ON t.id = tm.team_id
  JOIN public.workspaces w ON w.id = t.workspace_id
  WHERE tm.invite_token = p_invite_token
    AND tm.invite_status = 'pending'
    AND w.is_active = true
$$;
```

Esta funcao permite consulta publica ao token sem expor dados sensiveis (apenas nome e workspace).

#### Seguranca do Token

- Token e UUID v4 (36 caracteres aleatorios, nao enumeravel)
- Token e limpo (`invite_token = null`) apos aceite
- Validacao verifica `invite_status = 'pending'` (nao reutilizavel)
- Workspace deve estar ativo (`is_active = true`)

#### Dependencias Utilizadas

- `lucide-react`: Sparkles, Loader2, XCircle, UserCheck (ja instaladas)
- `@/components/ui/card`: Card centralizado (ja existe)
- `@/components/RhitmoLogo`: Logo consistente (ja existe)
- `useAuth` hook: Verificar estado de autenticacao (ja existe)

#### SessionStorage vs LocalStorage

Usamos `sessionStorage` para o `pending_invite` porque:
- Expira quando a aba e fechada (mais seguro)
- Evita conflitos entre multiplas abas
- Nao persiste indefinidamente

