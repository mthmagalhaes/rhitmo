

## Simplificar PDI — Remover Etapa de Aprovacao

Remover o fluxo de aprovacao do lider. O PDI vai direto para status "active" ao ser criado pelo liderado. O lider ve um card informativo (read-only) com progresso.

---

### 1. NewPDIDialog.tsx

- Linha 58: Mudar `status: 'pending_approval'` para `status: 'active'`
- Linha 84: Mudar toast para "PDI criado! Seu lider foi notificado."
- Linha 109: Mudar descricao do dialog para remover "isso vai para revisao do seu lider"
- Linha 185: Mudar texto do botao de "Enviar para aprovacao" para "Criar meu PDI"

---

### 2. DirectReportDashboard.tsx

- Linha 250: Remover `'pending_approval'` do `.in('status', ['draft', 'pending_approval', 'active'])` — fica `['draft', 'active']`
- Linhas 554-573: Remover bloco inteiro do estado `pending_approval` (card amber com badge "Aguardando aprovacao")
- Linha 582: Mudar badge de "Aprovado pelo lider" para "Ativo" (remover referencia a aprovacao)
- Linhas 585-589: Remover bloco do `leader_comment` no estado active

---

### 3. MemberDetails.tsx

- **Remover**: `handleApprovePDI` (linhas 221-238), `handleRequestChanges` (linhas 241-258), estado `leaderComment` (linha 56), `pdiActionLoading` (linha 57)
- **Remover imports nao mais usados**: `MessageSquare` (se so era usado aqui)
- Linha 190: Mudar query para buscar apenas `['active']` (remover `'pending_approval'`)
- Linhas 673-711: **Substituir** o card de aprovacao pelo card informativo read-only com:
  - Icone Sprout + "PDI de {memberName}" + Badge com period_label
  - Lista de itens com icones de status (CheckCircle2 verde para completed, Circle primary para in_progress, Circle cinza para pending)
  - Badges de status por item (Concluido, Em andamento)
  - Rodape com progresso: "X de Y objetivos concluidos"
  - **Condicao**: Renderizar quando `memberDevPlan && memberDevPlan.status === 'active'`
- Adicionar import de `Sprout`, `Circle` se ainda nao importados

---

### Arquivos alterados

| Arquivo | Acao |
|---|---|
| `src/components/NewPDIDialog.tsx` | Status direto "active", textos atualizados |
| `src/components/dashboard/DirectReportDashboard.tsx` | Remover estado pending_approval, ajustar badge |
| `src/pages/MemberDetails.tsx` | Substituir card de aprovacao por card informativo read-only |

### O que NAO muda

- Controles de status do liderado (Iniciar/Concluir)
- Shared Review Flow, Bussola de Carreira, Rhitmo Sync
- Tabelas do banco (colunas `approved_at` e `leader_comment` ficam, apenas nao sao mais usadas)

