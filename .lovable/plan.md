## Ajuste no drawer MemberAdminSheet

Editar a seção **"Abrir em…"** em `src/components/leader/MemberAdminSheet.tsx`:

- **Remover** o atalho "1:1s" (`/lider/1on1s?member=:id`).
- **Adicionar** o atalho "Objetivos" (`/lider/objetivos?member=:id`) com ícone `Target` (lucide-react).

Ordem final dos atalhos:
1. Diário de bordo → `/lider/diario?member=:id`
2. Objetivos → `/lider/objetivos?member=:id`
3. Avaliações → `/lider/avaliacoes?member=:id`
4. Rhitmo (chat) → `/lider/mentor?member=:id`

Sem outras alterações. Sem mudanças de schema, RLS ou edge functions.
