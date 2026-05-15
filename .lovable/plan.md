## Reorganização dos CTAs em /lider/pessoas

### Problema
Hoje a aba **Convites** mostra até 3 botões com semânticas sobrepostas:
1. "Adicionar liderado" (header) — cadastro 1:1, email opcional
2. "Adicionar time" (header) — cria time, não pessoa (só HR/Owner)
3. "Convidar liderados" (tab + empty state) — bulk para HR/Owner; cai no mesmo dialog do #1 para líder comum (vira CTA duplicado idêntico)

### Mudanças

**1. Header da página `/lider/pessoas`**
- Manter **um único CTA primário**: `Adicionar liderado` (universal, abre `NewMemberDialog`)
- Adicionar tooltip explicando "com ou sem e-mail — sem e-mail vira cadastro silencioso, com e-mail vira convite"
- **Remover** `Adicionar time` do header global

**2. Aba Times**
- Mover `Adicionar time` para dentro da aba **Times** (já existe `onNewTeam` no `TeamTabs` como pílula "Novo Time"; garantir botão também no header da aba para HR/Owner)

**3. Aba Convites**
- HR/Owner: botão renomeado para **`Convidar em massa`** (abre `BulkOnboardDialog`) — deixa claro que é diferente do header
- Líder comum (sem `canBulk`): **esconder** o CTA da aba (o header já cobre o caso 1:1) — elimina duplicata
- Empty state:
  - HR/Owner: "Convide vários liderados de uma vez colando e-mails" + botão `Convidar em massa`
  - Líder comum: "Use **Adicionar liderado** no topo para cadastrar uma pessoa por vez" (texto, sem botão)

**4. Microcopy**
- Tooltip do header: `Cadastra um liderado com ou sem e-mail. Com e-mail, vira convite automático.`
- Subtítulo da aba Convites mantém foco em "convites pendentes" (estado), não em ação

### Fora de escopo
- Lógica do `BulkOnboardDialog`, RLS, edge functions
- Comportamento de Liderados/Analytics
- Roteamento `?tab=convites`
- Permissões (`canBulk`, `canManageTeams` permanecem como estão)

### Arquivos afetados
- `src/pages/lider/Pessoas.tsx` (header, tab Convites, empty state, condicionais por papel)
- Possivelmente um pequeno ajuste na aba Times para reposicionar `Adicionar time`

Sem migrações, sem edge functions, sem mudança de tipos.