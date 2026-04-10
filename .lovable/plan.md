

## Plano: Cadastro em Massa (Bulk Onboarding)

### Problema
Hoje o cadastro é um-a-um: o admin convida usuário por usuário via `admin-invite-user`. Para dezenas de e-mails com papéis diferentes (líder, liderado, HR admin), isso é inviável.

### Solução: Upload de Planilha + Processamento em Lote

Adicionar na aba **Estrutura** (ou nova aba "Importar") do painel Admin um fluxo de importação em massa:

**1. Template CSV/Excel para download**
- Colunas: `email`, `nome`, `papel` (líder / liderado / hr_admin), `workspace` (nome do workspace destino), `time` (nome do time), `líder_email` (se liderado, email do líder)
- Botão "Baixar template" com exemplo preenchido

**2. Upload e Preview**
- Admin faz upload do CSV/XLSX preenchido
- Frontend parseia o arquivo (já existe `src/lib/fileParser.ts`) e exibe tabela de preview
- Validações visuais: emails duplicados, campos obrigatórios, workspaces/times que não existem (highlight em vermelho)
- Admin revisa e confirma

**3. Processamento no backend (nova Edge Function `bulk-onboard`)**
- Recebe o array de usuários validados
- Para cada linha:
  - Chama `supabase.auth.admin.inviteUserByEmail()` com metadata (nome, plano)
  - Se papel = `hr_admin`: adiciona ao `hr_admin_ids` do workspace via `manage_hr_admin` RPC
  - Se papel = `líder`: cria o time (se não existe) e seta `leader_user_id`
  - Se papel = `liderado`: cria `team_member` com `linked_user_id` (se o líder já existir)
- Retorna relatório: quantos convidados, quantos já existiam, quantos falharam

**4. Relatório pós-importação**
- Exibe resultado na tela: sucesso/erro por linha
- Opção de exportar relatório

### Arquivos a criar/modificar

| Arquivo | Ação |
|---------|------|
| `src/components/admin/BulkOnboardDialog.tsx` | Novo — dialog de upload, preview, validação e envio |
| `src/components/admin/AdminStructure.tsx` | Adicionar botão "Importar em Massa" |
| `supabase/functions/bulk-onboard/index.ts` | Nova Edge Function — processamento em lote |

### Detalhes técnicos
- O `fileParser.ts` existente já suporta CSV e XLSX — será reutilizado para o parsing client-side
- A Edge Function processa sequencialmente (não paralelo) para evitar rate-limit na API de convites
- Limite de 100 usuários por lote para segurança
- A função verifica `is_admin()` antes de processar

### Fluxo visual
```text
[Baixar Template] → [Preencher CSV] → [Upload no Admin]
     → [Preview com validação] → [Confirmar]
     → [Edge Function processa] → [Relatório final]
```

