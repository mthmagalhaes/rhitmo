
## Simulação de uso · Pessoas (4 abas)

Encarnei um líder usando cada aba e listei abaixo o que ele tenta fazer, o que **trava hoje** e a **mudança proposta**. Sem código nesta fase — peço aprovação dos itens antes de implementar.

---

### 🧑‍🤝‍🧑 Aba **Liderados** (default)

**Cenários simulados**
1. "Quero ver só quem está frio" → não há filtro por health.
2. "Quero ordenar por último sinal pra atacar quem está há mais tempo sem feedback" → não dá pra clicar nos headers.
3. "Quero exportar a lista pra um CSV / mandar pro RH" → sem export.
4. "Quero ver mais info sem abrir a ficha" (último 1:1, próxima reunião, plano) → linha é monolítica.
5. "Quero remover/arquivar um liderado que saiu da empresa" → preciso entrar na ficha; ação escondida.
6. "Quero selecionar 3 e mover de time" → sem multi-select.
7. "Cliquei sem querer no nome errado" → navegação imediata, sem hover preview.
8. Hover na bolinha de health não diz o que significa fresh/warm/cold.
9. "Quero saber quantos liderados estão em cada bucket" → sem contadores.

**Ajustes propostos**
- **Headers clicáveis** (Nome, Cargo, Time, Último sinal) com sort asc/desc + persistência em querystring.
- **Filtros adicionais inline**: chips `Todos · 🟢 Frescos · 🟡 Mornos · 🔴 Frios` (contadores em cada chip).
- **Tooltip na bolinha de health** com a regra (≤7d / ≤14d / +14d) + data do último sinal.
- **Coluna "Ação" no chevron** vira menu kebab (`⋮`) com: *Abrir ficha · Nova nota · Agendar 1:1 · Mover de time · Arquivar*.
- **Multi-select** (checkbox na 1ª coluna ao hover; bulk: mover de time, arquivar, exportar).
- **Botão "Exportar CSV"** no toolbar (respeitando filtros ativos).
- **Estado "Arquivados"**: toggle no toolbar ("Mostrar arquivados") em vez de sumir do mundo. Nova coluna `team_members.archived_at` (não-destrutivo).
- **Densidade**: opção `Compacto/Confortável` (Linear-style), salvo em localStorage.

---

### ✉️ Aba **Convites**

**Cenários simulados**
1. "Mandei convite há 2 semanas e o cara não aceitou — qual a idade?" → mostra apenas nome/email, sem `há X dias`.
2. "Quero cancelar um convite errado" → não tem botão de cancelar/excluir.
3. "Mandei pra `joa@empresa` em vez de `joao@empresa`" → só dá pra editar e-mail se houve **bounce**; sem bounce, fico travado.
4. "Quero reenviar pra todo mundo de uma vez" → sem bulk resend.
5. "Quem convidou esse cara?" → sem coluna do invitador (em time com vários líderes vira ruído).
6. "Quero copiar o link de convite e mandar pelo WhatsApp" → não existe.
7. Limite de 20 pendentes (`.limit(20)`) — em workspaces médios já corta silenciosamente.
8. Sem aba/seção de convites **aceitos recentemente** (perde o "loop de fechamento" — quando alguém entra, deveria sumir daqui mas é bom ter um "Aceitos nas últimas 48h").

**Ajustes propostos**
- **Coluna "Enviado há"** com data relativa + tooltip data exata.
- **Editar e-mail sempre disponível** (não só em bounce); validar conflito com e-mail existente.
- **Cancelar convite** (kebab `⋮`): soft-delete ou `invite_status='cancelled'`.
- **Reenviar em massa** (multi-select).
- **Copiar link de convite** no kebab (gera magic link reusando token existente).
- **Coluna "Convidado por"** quando workspace tem ≥2 líderes.
- Subir o `.limit()` ou paginar; mostrar contador real.
- **Sub-seção colapsada "Aceitaram recentemente"** (últimas 7d) — fechamento de loop emocional.

---

### 🏢 Aba **Times** *(esta é a mais quebrada — bate com o que você notou)*

**Cenários simulados**
1. "Quero **renomear** 'CreativeOps' pra 'Marketing'" → impossível na UI.
2. "Quero **excluir** 'Teste' que criei errado" → impossível.
3. "Quero **trocar o líder** de um time" → só vejo `79a6f679` (slice do UUID, ilegível).
4. "Quero ver **quantos liderados** tem em cada time" → sem contagem.
5. "Quero **clicar no time** e ver os membros dele" → cards são inertes.
6. "Quero **mover liderado** de um time pro outro" → não tem.
7. "Quero **reordenar/arquivar**" → sem.
8. Card mostra `Líder: —` pra time sem líder, sem CTA pra atribuir.
9. Sem ordenação (alfabética / por tamanho / por criação).

**Ajustes propostos** (esta aba precisa de uma reescrita pequena)
- **Lista densa em vez de grid de cards** (consistência com Liderados): colunas `Nome · Líder (avatar+nome real) · Liderados (count) · Criado em · ⋮`.
- **Resolver `leader_user_id` → nome+avatar** via join com `profiles`.
- **Click na linha** abre **TeamDetailSheet** (sidebar à direita) com:
  - Renomear (inline edit do título)
  - Trocar líder (combobox de líderes do workspace)
  - Lista dos liderados do time + drag/move (ou botão "Mover para outro time")
  - Botão **Excluir time** (com confirmação; valida se tem liderados — oferece reatribuir antes de deletar)
- **Permissão**: só HR Admin/Owner edita/deleta. Líder comum vê read-only (já está hidden hoje pra não-admin; manter).
- **CTA "Novo time"** sai do meio da aba e vai pra junto do search (consistência com Liderados).
- **Search** por nome do time quando ≥6 times.

---

### 📊 Aba **Analytics**

**Cenários simulados**
1. "Quero filtrar por time" → o `AnalyticsContent` global não conhece o contexto da página.
2. "Quero exportar PDF/CSV pra reunião com C-level" → sem export.
3. "Quero comparar este mês vs. mês passado" → sem range picker.
4. "Quero clicar no gráfico de 'cobertura de feedback' e ver QUEM está sem feedback" → sem drilldown pra Liderados.
5. "Sou líder comum (não HR Admin), o que vejo aqui?" → memória `analytics-governance-and-access-control` diz que é restrito a HR/Super Admin — mas a aba aparece pra todos. **Bug de governança.**

**Ajustes propostos**
- **Esconder aba Analytics pra não-HR/Owner** (`hidden: !canManageTeams` igual Times) OU mostrar variante reduzida ("Saúde do meu time" só com health buckets agregados).
- **Filtro por time** no topo (bind com o filtro da aba Liderados via querystring `?team=`).
- **Range picker** (Últimos 7d / 30d / 90d / Trimestre / Custom).
- **Drilldown**: gráficos clicáveis → `?tab=membros&filter=cold` etc.
- **Export CSV** consistente com Liderados.

---

### 🧰 Cross-aba (consistência)

- **Querystring única** carregando estado: `?tab=membros&team=X&health=cold&sort=last_signal_desc`. Permite compartilhar URL e voltar do drilldown.
- **Header da página** ganha um **filtro global de Time** (à esquerda dos CTAs) que se aplica em Liderados + Analytics simultaneamente. Times/Convites ignoram.
- **Atalhos de teclado** (Linear-style): `g l/c/t/a` pra trocar de aba; `n` abre "Novo liderado".
- **Empty state da página inteira** quando o workspace não tem nenhum time nem liderado: hero único "Comece pelo seu time" em vez de mostrar 4 abas vazias.

---

### 🗂️ Priorização sugerida (3 ondas)

| Onda | Foco | Itens |
|------|------|-------|
| **1 — Quebras óbvias** | Times utilizável + governança Analytics | Times: rename/delete/trocar líder/contagem/drilldown · Analytics: hidden pra não-admin · Liderados: tooltip health + sort por último sinal · Convites: cancelar + editar e-mail sempre |
| **2 — Eficiência** | Bulk + filtros | Multi-select + bulk move/archive/export · Filtro health chips · Bulk resend convite · Range picker Analytics |
| **3 — Polimento** | Atalhos & estado | Querystring unificada · Atalhos teclado · Densidade compacta · "Aceitos recentemente" |

---

### ❓ Perguntas antes de implementar

1. **Arquivar liderado**: criar coluna `archived_at` (soft delete, mantém histórico) ou usar status existente? Recomendo soft delete novo — preserva feedbacks/recaps sem RLS quebrar.
2. **Excluir time**: política quando o time tem liderados — *bloquear* (forçar mover antes) ou *liberar* (liderados ficam órfãos com `team_id=null`)? Recomendo **bloquear com diálogo "Mover N liderados para…"**.
3. **Analytics pra líder comum**: esconder totalmente OU mostrar uma versão reduzida só com saúde do próprio time? Default que vou seguir se não responder: **esconder** (consistente com a memória de governança).
4. Querer atacar **Onda 1 inteira** num PR só, ou prefere dividir Times / Analytics / Liderados / Convites?
