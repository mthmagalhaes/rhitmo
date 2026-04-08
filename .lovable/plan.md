

## Templates Branded — Auth + Transacionais

### Contexto
- Domínio `notify.rhitmo.co` configurado, DNS pendente (não bloqueia scaffolding)
- Design system: Roxo `#7C3AED`, fundo creme `#F5F3EE`, foreground `#1A1035`, fonte Lora (headings) + Inter (body)
- 4 edge functions existentes usam Resend diretamente com HTML inline (sem branding consistente)

### Parte 1: Auth Email Templates (6 templates)

Scaffold via ferramenta nativa + aplicar branding Rhitmo:

| Template | Conteúdo |
|----------|----------|
| `signup.tsx` | "Confirme sua conta" — botão roxo, tom casual ("Bem-vindo ao Rhitmo!") |
| `recovery.tsx` | "Redefinir senha" — botão roxo |
| `magic-link.tsx` | "Acesse sua conta" — link mágico |
| `invite.tsx` | "Você foi convidado" — convite admin |
| `email-change.tsx` | "Confirme seu novo email" |
| `reauthentication.tsx` | Código OTP |

**Branding aplicado em todos:**
- Fundo body: `#ffffff` (regra obrigatória)
- Botão CTA: `background: #7C3AED`, `color: #fff`, `border-radius: 12px`
- Headings: `color: #1A1035`, font-family Inter (web-safe fallback, Lora não é web-safe para email)
- Texto: `color: #6B6784`
- Logo Rhitmo no topo (wave SVG inline ou texto estilizado)
- Footer: "Rhitmo • Gestão de Performance Contínua"
- Idioma: Português (BR), tom consistente com o app

### Parte 2: Infraestrutura de Email Transacional

Setup da infraestrutura (pgmq, queues, cron) + scaffold do sistema transacional.

### Parte 3: Migrar 4 Edge Functions Resend → Templates Transacionais

| Template | Substitui | Gatilho |
|----------|-----------|---------|
| `sync-invite.tsx` | `send-disc-invite` | Novo membro com checkbox Sync |
| `review-shared.tsx` | `notify-review-shared` | Líder compartilha avaliação |
| `review-acknowledged.tsx` | `notify-review-acknowledged` | Liderado reconhece avaliação |
| `admin-new-lead.tsx` | `notify-admin-new-lead` | Novo lead na waitlist |

Cada template terá o mesmo branding dos auth emails. Os call sites em `NewMemberDialog.tsx`, `FormalReviewSheet.tsx`, etc. serão atualizados para usar `supabase.functions.invoke('send-transactional-email', ...)`.

### Parte 4: Página de Unsubscribe

Criar página `/unsubscribe` com branding Rhitmo para opt-out de emails transacionais.

### Parte 5: Atualizar URLs hardcoded

Substituir `rhitmo.lovable.app` por `rhitmo.co` em todos os templates e edge functions.

### Sequência de execução

1. Scaffold auth templates → aplicar branding → deploy `auth-email-hook`
2. Setup email infra (pgmq, queues, cron)
3. Scaffold transactional → criar 4 templates branded → registrar no registry
4. Atualizar call sites nos componentes React (trocar Resend → `send-transactional-email`)
5. Criar página `/unsubscribe`
6. Deploy todas as edge functions
7. Verificar previews

### Arquivos impactados

| Arquivo | Ação |
|---------|------|
| `supabase/functions/_shared/email-templates/*.tsx` | Criar (6 auth templates) |
| `supabase/functions/auth-email-hook/*` | Criar |
| `supabase/functions/_shared/transactional-email-templates/*.tsx` | Criar (4 templates + registry) |
| `supabase/functions/send-transactional-email/*` | Criar |
| `supabase/functions/handle-email-unsubscribe/*` | Criar |
| `supabase/functions/handle-email-suppression/*` | Criar |
| `src/components/NewMemberDialog.tsx` | Editar — trocar invoke de `send-disc-invite` → `send-transactional-email` |
| `src/components/review/FormalReviewSheet.tsx` | Editar — trocar invoke |
| `src/components/WaitlistDialog.tsx` | Editar — trocar invoke |
| `src/pages/Unsubscribe.tsx` | Criar |
| `src/App.tsx` | Editar — adicionar rota `/unsubscribe` |

