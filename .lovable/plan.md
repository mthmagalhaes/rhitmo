

## Mapeamento Completo de Emails — Rhitmo (Estado Atual)

### Resumo

Existem **6 fluxos de email** ativos, todos usando **Resend API diretamente** (via `RESEND_API_KEY`) + **1 fluxo via Supabase Auth API**. Nenhum usa o sistema nativo de email do Lovable ainda.

---

### Fluxo 1: Emails de Autenticação (Supabase Auth)
| Item | Detalhe |
|------|---------|
| **Gatilho** | Signup, reset de senha, verificação de email |
| **Remetente** | Template padrão Supabase (sem branding Rhitmo) |
| **Destinatário** | Usuário que está se cadastrando/resetando senha |
| **Edge Function** | Nenhuma — gerenciado internamente pelo Auth |
| **Status** | Funcionando, mas sem branding |

### Fluxo 2: Convite Rhitmo Sync (DISC)
| Item | Detalhe |
|------|---------|
| **Gatilho** | Líder cadastra novo membro com checkbox "Enviar convite Sync" marcado |
| **Edge Function** | `send-disc-invite` |
| **Remetente** | `Rhitmo <noreply@rhitmo.co>` via Resend |
| **Destinatário** | Email do liderado cadastrado |
| **Conteúdo** | Link para preencher o formulário Rhitmo Sync (`/sync/{memberId}`) |
| **Chamado de** | `NewMemberDialog.tsx` |

### Fluxo 3: Notificação de Avaliação Compartilhada
| Item | Detalhe |
|------|---------|
| **Gatilho** | Líder compartilha avaliação de desempenho com o liderado |
| **Edge Function** | `notify-review-shared` |
| **Remetente** | `Rhitmo <noreply@rhitmo.co>` via Resend |
| **Destinatário** | Email do liderado (campo `email` em `team_members`) |
| **Conteúdo** | Link para visualizar a avaliação compartilhada |
| **Chamado de** | `FormalReviewSheet.tsx`, `ReviewViewDialog.tsx` |

### Fluxo 4: Notificação de Avaliação Reconhecida
| Item | Detalhe |
|------|---------|
| **Gatilho** | Liderado reconhece/confirma leitura da avaliação |
| **Edge Function** | `notify-review-acknowledged` |
| **Remetente** | `Rhitmo <noreply@rhitmo.co>` via Resend |
| **Destinatário** | Email do **gestor** (owner do workspace) |
| **Conteúdo** | Notifica o líder que o liderado leu e reconheceu a avaliação |

### Fluxo 5: Notificação de Novo Lead (Admin)
| Item | Detalhe |
|------|---------|
| **Gatilho** | Novo cadastro na lista de espera (waitlist) |
| **Edge Function** | `notify-admin-new-lead` |
| **Remetente** | `Rhitmo <noreply@rhitmo.co>` via Resend |
| **Destinatário** | `matheus@rhitmo.co` (hardcoded) |
| **Conteúdo** | Dados do lead + link para painel admin |
| **Chamado de** | `WaitlistDialog.tsx` |

### Fluxo 6: Convite Admin (Supabase Auth API)
| Item | Detalhe |
|------|---------|
| **Gatilho** | Admin convida novo usuário via painel |
| **Edge Function** | `admin-invite-user` |
| **Método** | `supabase.auth.admin.inviteUserByEmail()` — usa email nativo do Supabase Auth |
| **Destinatário** | Email do usuário convidado |
| **Conteúdo** | Email de convite padrão Supabase (sem branding) |
| **Chamado de** | `AdminAccess.tsx`, `AdminOverview.tsx` |

### Fluxo 7: Convite via Slack (DM, não email)
| Item | Detalhe |
|------|---------|
| **Gatilho** | Após cadastrar membro, fire-and-forget |
| **Edge Function** | `invite-member-slack` |
| **Canal** | DM no Slack (não é email) |
| **Chamado de** | `NewMemberDialog.tsx`, `Index.tsx` |

---

### Diagrama de Fluxo

```text
CADASTRO NA PLATAFORMA
├── Signup (email/senha) ──→ [Supabase Auth] ──→ Email verificação (sem branding)
├── Signup (Google OAuth) ──→ Sem email
├── Convite Admin ──→ [admin-invite-user] ──→ Email convite Supabase (sem branding)
└── Waitlist ──→ [notify-admin-new-lead] ──→ Email para matheus@ (Resend)

GESTÃO DE EQUIPE
├── Novo membro ──→ [send-disc-invite] ──→ Email Sync para liderado (Resend)
└── Novo membro ──→ [invite-member-slack] ──→ DM Slack (não email)

AVALIAÇÕES
├── Compartilhar review ──→ [notify-review-shared] ──→ Email para liderado (Resend)
└── Liderado reconhece ──→ [notify-review-acknowledged] ──→ Email para gestor (Resend)
```

### O que migrar para o sistema de email Lovable

Quando configurarmos o domínio, o plano seria:

1. **Auth emails** (Fluxos 1 e 6): Migrar para templates branded via `auth-email-hook` — verificação, reset, convite admin
2. **Transactional emails** (Fluxos 2-5): Migrar os 4 emails Resend para templates React Email via `send-transactional-email`, eliminando dependência do `RESEND_API_KEY`
3. **URLs hardcoded**: Substituir `rhitmo.lovable.app` pelo domínio customizado em todos os templates

### Emails que ainda NÃO existem (oportunidades)
- Welcome email após primeiro login
- Resumo semanal de atividades para o líder
- Lembrete de 1:1 agendada (se integração calendar ativa)
- Notificação quando PDI é atualizado

