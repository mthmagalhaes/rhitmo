
## Plano: Infraestrutura de Convites e Visibilidade Multi-User

### Resumo das Alteracoes

| Arquivo | Alteracao |
|---------|-----------|
| Nova migracao SQL | Adicionar colunas `linked_user_id`, `invite_token`, `invite_status`, `skills_data` em `team_members`, coluna `visibility` em `feedbacks`, novas RLS policies |
| `src/pages/MemberDetails.tsx` | Adicionar botao "Convidar" no header do perfil com logica de estados (none/pending/accepted) |
| `src/components/InviteMemberDialog.tsx` | **NOVO** - Dialog para gerar/copiar link de convite |

---

### Parte 1: Alteracoes no Banco de Dados

#### 1.1 Novas Colunas em team_members

```sql
-- Colunas para gestao de acesso
ALTER TABLE public.team_members
  ADD COLUMN IF NOT EXISTS linked_user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS invite_token UUID UNIQUE,
  ADD COLUMN IF NOT EXISTS invite_status TEXT DEFAULT 'none' CHECK (invite_status IN ('none', 'pending', 'accepted'));

-- Coluna para dados futuros (Job Crafting/Skills)
ALTER TABLE public.team_members
  ADD COLUMN IF NOT EXISTS skills_data JSONB DEFAULT '{}';

-- Indice para busca por token
CREATE INDEX IF NOT EXISTS idx_team_members_invite_token ON public.team_members(invite_token);

-- Indice para busca por linked_user_id
CREATE INDEX IF NOT EXISTS idx_team_members_linked_user_id ON public.team_members(linked_user_id);
```

#### 1.2 Nova Coluna em feedbacks

```sql
-- Coluna de visibilidade com default para manter notas antigas privadas
ALTER TABLE public.feedbacks
  ADD COLUMN IF NOT EXISTS visibility TEXT DEFAULT 'private_leader' 
    CHECK (visibility IN ('private_leader', 'shared', 'private_member'));

-- Indice para filtragem por visibilidade
CREATE INDEX IF NOT EXISTS idx_feedbacks_visibility ON public.feedbacks(visibility);
```

#### 1.3 Novas RLS Policies

```sql
-- Helper function: verificar se usuario esta vinculado a um membro
CREATE OR REPLACE FUNCTION public.user_is_linked_member(_user_id uuid, _member_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.team_members
    WHERE id = _member_id
      AND linked_user_id = _user_id
  )
$$;

-- TEAM_MEMBERS: Liderado pode ver seu proprio perfil
CREATE POLICY "Linked users can view own profile"
ON public.team_members
FOR SELECT
TO authenticated
USING (linked_user_id = auth.uid());

-- TEAM_MEMBERS: Liderado pode atualizar apenas colunas especificas do seu perfil
-- Nota: Restricao de colunas sera feita via aplicacao, RLS garante acesso a linha
CREATE POLICY "Linked users can update own sync data"
ON public.team_members
FOR UPDATE
TO authenticated
USING (linked_user_id = auth.uid())
WITH CHECK (linked_user_id = auth.uid());

-- FEEDBACKS: Liderado pode ver feedbacks compartilhados
CREATE POLICY "Linked users can view shared feedbacks"
ON public.feedbacks
FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.team_members tm
    WHERE tm.id = feedbacks.member_id
      AND tm.linked_user_id = auth.uid()
  )
  AND visibility = 'shared'
);
```

---

### Parte 2: Novo Componente InviteMemberDialog.tsx

#### 2.1 Interface e Props

```typescript
interface InviteMemberDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  member: {
    id: string;
    name: string;
    email: string | null;
    invite_status: string | null;
    invite_token: string | null;
  };
  onSuccess?: () => void;
}
```

#### 2.2 Logica do Componente

```typescript
const InviteMemberDialog = ({ open, onOpenChange, member, onSuccess }) => {
  const [loading, setLoading] = useState(false);
  const { toast } = useToast();
  
  // Gerar link de convite
  const inviteUrl = member.invite_token 
    ? `${window.location.origin}/invite?code=${member.invite_token}`
    : null;

  const handleGenerateInvite = async () => {
    setLoading(true);
    try {
      // Gerar novo token UUID
      const newToken = crypto.randomUUID();
      
      const { error } = await supabase
        .from('team_members')
        .update({ 
          invite_token: newToken,
          invite_status: 'pending'
        })
        .eq('id', member.id);
      
      if (error) throw error;
      
      toast({
        title: "Convite gerado!",
        description: "Copie o link e envie para o membro.",
      });
      
      onSuccess?.();
    } catch (error: any) {
      toast({
        title: "Erro ao gerar convite",
        description: error.message,
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  const handleCopyLink = () => {
    if (inviteUrl) {
      navigator.clipboard.writeText(inviteUrl);
      toast({
        title: "Link copiado!",
        description: "Cole no WhatsApp ou envie por e-mail."
      });
    }
  };

  return (
    <Dialog>
      {/* Estados visuais baseados em invite_status */}
    </Dialog>
  );
};
```

#### 2.3 Estados Visuais

| Status | UI |
|--------|-----|
| `none` | Botao "Gerar Link de Convite" |
| `pending` | Input com link + Botao "Copiar" + Badge "Convite enviado" |
| `accepted` | Badge "Usuario Ativo" + Info do login |

---

### Parte 3: Alteracoes em MemberDetails.tsx

#### 3.1 Novo Botao no Header

Adicionar ao lado do nome/cargo do membro:

```tsx
<div className="flex items-start gap-6 mb-6">
  <MemberAvatar memberId={member.id} memberName={member.name} size="xl" />
  <div className="flex-1">
    <div className="flex items-center gap-3 mb-2">
      <h1 className="text-3xl font-bold text-foreground">{member.name}</h1>
      
      {/* Botao de Convite */}
      {member.invite_status === 'accepted' ? (
        <Badge variant="secondary" className="bg-green-500/10 text-green-700 gap-1">
          <CheckCircle className="h-3 w-3" />
          Usuario Ativo
        </Badge>
      ) : (
        <Button 
          variant="outline" 
          size="sm" 
          onClick={() => setInviteDialogOpen(true)}
          className="gap-2"
        >
          <Mail className="h-4 w-4" />
          {member.invite_status === 'pending' ? 'Ver Convite' : 'Convidar'}
        </Button>
      )}
    </div>
    <p className="text-lg text-muted-foreground mb-4">{member.role}</p>
    <span className="text-muted-foreground">{feedbacks.length} notas registradas</span>
  </div>
</div>
```

#### 3.2 Novos Estados

```typescript
const [inviteDialogOpen, setInviteDialogOpen] = useState(false);
```

---

### Parte 4: Fluxo de Convite

```text
┌─────────────────────────────────────────────────────────────────┐
│                      FLUXO DE CONVITE                           │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  1. LIDER clica "Convidar" no perfil do membro                  │
│     └── Sistema gera UUID em invite_token                       │
│     └── invite_status = 'pending'                               │
│                                                                 │
│  2. LIDER copia link e envia para LIDERADO                      │
│     └── Link: app.rhitmo.com/invite?code={token}                │
│                                                                 │
│  3. LIDERADO acessa link (futuro - nao nesta implementacao)     │
│     └── Cria conta ou faz login                                 │
│     └── Sistema vincula linked_user_id = auth.uid()             │
│     └── invite_status = 'accepted'                              │
│                                                                 │
│  4. LIDERADO logado ve:                                         │
│     └── Seu perfil (via RLS linked_user_id)                     │
│     └── Feedbacks com visibility = 'shared'                     │
│     └── NAO ve notas com visibility = 'private_leader'          │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

---

### Secao Tecnica

#### Diagrama do Modelo de Dados

```text
┌─────────────────────────────────────────────────────────────────┐
│                      team_members                               │
├─────────────────────────────────────────────────────────────────┤
│ id                    UUID (PK)                                 │
│ name                  TEXT                                      │
│ role                  TEXT                                      │
│ email                 TEXT                                      │
│ team_id               UUID (FK → teams)                         │
│ user_id               UUID (owner/manager - deprecated?)        │
│ ------- NOVAS COLUNAS -------                                   │
│ linked_user_id        UUID (FK → auth.users) -- login do membro │
│ invite_token          UUID (UNIQUE) -- token do convite         │
│ invite_status         TEXT ('none'|'pending'|'accepted')        │
│ skills_data           JSONB (default '{}')                      │
│ work_style_data       JSONB                                     │
└─────────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────────┐
│                        feedbacks                                │
├─────────────────────────────────────────────────────────────────┤
│ id                    UUID (PK)                                 │
│ member_id             UUID (FK → team_members)                  │
│ manager_id            UUID (owner do feedback)                  │
│ content               TEXT                                      │
│ ------- NOVA COLUNA -------                                     │
│ visibility            TEXT ('private_leader'|'shared'|          │
│                            'private_member')                    │
│                       DEFAULT 'private_leader'                  │
└─────────────────────────────────────────────────────────────────┘
```

#### Logica de RLS (Resumo)

```sql
-- LIDER: Ve TUDO do seu workspace (ja existe)
-- RLS atual: workspace.owner_id = effective_user_id()

-- LIDERADO (NOVO): Ve apenas:
-- 1. Seu proprio perfil em team_members
-- 2. Feedbacks onde visibility = 'shared'
-- 3. NAO ve notas privadas do lider
```

#### Seguranca: Restricao de Colunas no UPDATE

A RLS permite UPDATE na linha inteira quando `linked_user_id = auth.uid()`. Para restringir quais colunas o liderado pode alterar (apenas `work_style_data` e `skills_data`), usaremos validacao na aplicacao:

```typescript
// Opcao 1: Validar no frontend antes de enviar
// Opcao 2: Criar funcao RPC que permite apenas colunas especificas

CREATE OR REPLACE FUNCTION public.update_member_own_data(
  p_work_style_data JSONB DEFAULT NULL,
  p_skills_data JSONB DEFAULT NULL
)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  UPDATE public.team_members
  SET 
    work_style_data = COALESCE(p_work_style_data, work_style_data),
    skills_data = COALESCE(p_skills_data, skills_data),
    updated_at = now()
  WHERE linked_user_id = auth.uid();
  
  RETURN FOUND;
END;
$$;
```

Esta funcao RPC garante que o liderado so pode alterar as colunas permitidas, mesmo que consiga burlar a validacao do frontend.

#### Valores Default Estrategicos

| Coluna | Default | Motivo |
|--------|---------|--------|
| `invite_status` | `'none'` | Nenhum convite gerado ainda |
| `invite_token` | `NULL` | Token gerado sob demanda |
| `linked_user_id` | `NULL` | Vinculo criado apos aceite |
| `visibility` | `'private_leader'` | 130 notas antigas continuam privadas |
| `skills_data` | `'{}'` | JSONB vazio, pronto para Job Crafting |

---

### Migracao Completa

```sql
-- 1. Novas colunas em team_members
ALTER TABLE public.team_members
  ADD COLUMN IF NOT EXISTS linked_user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS invite_token UUID UNIQUE,
  ADD COLUMN IF NOT EXISTS invite_status TEXT DEFAULT 'none' CHECK (invite_status IN ('none', 'pending', 'accepted')),
  ADD COLUMN IF NOT EXISTS skills_data JSONB DEFAULT '{}';

-- 2. Indices para performance
CREATE INDEX IF NOT EXISTS idx_team_members_invite_token ON public.team_members(invite_token);
CREATE INDEX IF NOT EXISTS idx_team_members_linked_user_id ON public.team_members(linked_user_id);

-- 3. Nova coluna em feedbacks
ALTER TABLE public.feedbacks
  ADD COLUMN IF NOT EXISTS visibility TEXT DEFAULT 'private_leader' 
    CHECK (visibility IN ('private_leader', 'shared', 'private_member'));

CREATE INDEX IF NOT EXISTS idx_feedbacks_visibility ON public.feedbacks(visibility);

-- 4. Helper function para verificar vinculo
CREATE OR REPLACE FUNCTION public.user_is_linked_member(_user_id uuid, _member_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.team_members
    WHERE id = _member_id AND linked_user_id = _user_id
  )
$$;

-- 5. RLS: Liderado pode ver seu perfil
CREATE POLICY "Linked users can view own profile"
ON public.team_members
FOR SELECT
TO authenticated
USING (linked_user_id = auth.uid());

-- 6. RPC segura para liderado atualizar seus dados
CREATE OR REPLACE FUNCTION public.update_member_own_data(
  p_work_style_data JSONB DEFAULT NULL,
  p_skills_data JSONB DEFAULT NULL
)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  UPDATE public.team_members
  SET 
    work_style_data = COALESCE(p_work_style_data, work_style_data),
    skills_data = COALESCE(p_skills_data, skills_data),
    updated_at = now()
  WHERE linked_user_id = auth.uid();
  RETURN FOUND;
END;
$$;

-- 7. RLS: Liderado pode ver feedbacks compartilhados
CREATE POLICY "Linked users can view shared feedbacks"
ON public.feedbacks
FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.team_members tm
    WHERE tm.id = feedbacks.member_id
      AND tm.linked_user_id = auth.uid()
  )
  AND visibility = 'shared'
);
```
