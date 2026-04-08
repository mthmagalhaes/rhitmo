

## Sprint 4: Épico 6 — Marketplace de Templates de Competências

### O que existe hoje
- Tabela `competency_templates` criada com colunas `id, name, company, job_title, level, competencies (jsonb), description, is_public, source`
- 2 templates seed (Spotify e Nubank) com apenas 2 competências cada — insuficiente
- Dialog placeholder "Em breve" no `CompetencyFramework.tsx` (linhas 453-469)
- `CreateJobRoleDialog` já tem opção "Importar de Template" que redireciona para `onOpenTemplateGallery` (fecha o dialog e abre a galeria vazia)
- RLS: apenas SELECT para `is_public = true`, sem INSERT/UPDATE/DELETE para users

### Alterações

#### 1. Seed de templates reais (INSERT via insert tool)
Inserir 6 novos templates com 4-5 competências cada, cobrindo áreas-chave:
- **Tech (Engineering Manager)** — Spotify-inspired
- **Product Manager** — framework genérico
- **Vendas / Account Executive** — framework comercial
- **Customer Success** — framework CS
- **Marketing** — framework growth/brand
- **Design (UX/Product Designer)** — framework design

Cada competência terá `name`, `description`, e `levels` com 4 níveis (junior/pleno/senior/especialista) + exemplos. Total: ~30 competências de qualidade.

Atualizar os 2 templates existentes (Spotify/Nubank) para ter 4-5 competências cada.

#### 2. Novo componente `TemplateMarketplace.tsx`
Substituir o dialog placeholder. Componente com:
- Grid de cards (rounded-2xl, shadow soft) mostrando cada template
- Cada card: logo/ícone da empresa, nome, cargo, nível, contagem de competências, badge de indústria
- Ao clicar: expande/abre preview das competências do template (nome + descrição de cada)
- Botão "Usar este template" que importa as competências para o framework do workspace

#### 3. Lógica de importação
Quando o user clica "Usar este template":
- Cria um `job_role` com título/level do template
- Insere cada competência do template na tabela `competencies` do framework
- Insere `competency_level_descriptions` para cada nível
- Cria `role_competencies` associando tudo
- Invalida queries e fecha o dialog

#### 4. Atualizar `CompetencyFramework.tsx`
- Substituir o dialog placeholder (linhas 453-469) pelo `TemplateMarketplace`
- Adicionar botão "Explorar Templates" visível na view de roles (ao lado de "Adicionar Cargo")

#### 5. Integrar com `CreateJobRoleDialog`
- Quando user escolhe "Importar de Template" no step source, abrir o marketplace diretamente dentro do dialog em vez de fechar e reabrir

### Arquivos modificados/criados

| Arquivo | Ação |
|---------|------|
| `competency_templates` (dados) | INSERT 6 novos + UPDATE 2 existentes via insert tool |
| `src/components/competency/TemplateMarketplace.tsx` | Novo: grid de templates + preview + importação |
| `src/pages/CompetencyFramework.tsx` | Substituir placeholder pelo TemplateMarketplace, adicionar botão |
| `src/components/competency/CreateJobRoleDialog.tsx` | Ajustar fluxo "template" para usar marketplace inline |

### Notas técnicas
- Sem migrações SQL — tabela e RLS já existem
- Templates são read-only para users (RLS só permite SELECT de `is_public = true`)
- A importação cria dados nas tabelas `competencies`, `competency_level_descriptions`, `role_competencies` e `job_roles` — todas já com RLS adequada para owner/HR
- Design segue o padrão "Creme/Bento": `rounded-2xl`, shadows soft, hover lift

