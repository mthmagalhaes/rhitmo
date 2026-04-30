## Diagnóstico

A causa raiz do banner "Bom dia, Matheus" aparecer em todo lugar é simples: hoje **`/lider/inicio`, `/lider/diario`, `/lider/1on1s` (em duas das três abas) e a aba "Membros" de `/lider/pessoas` renderizam o componente `<Index />` inteiro** — e o `<Index />` desenha o hero strip, o setup checklist, o Mirror, as próximas 1:1s e o grid do time, tudo de uma vez. O banner não é da página, é do Index reaproveitado em todo lugar.

A correção é separar as **partes** do `Index` em blocos reutilizáveis e montar cada host page com só o que faz sentido.

---

## Plano

### 1. Refatorar `src/pages/Index.tsx` em blocos exportáveis

Sem mexer no comportamento atual, extrair três blocos nomeados (mantendo `Index` como wrapper que continua rodando em `/lider/inicio` e `/dashboard`):

- `LeaderHero` — banner com saudação, badge de plano, contadores (liderados, reuniões hoje, notas semana, atenção), botões "Novo Membro" e "Nova Nota".
- `LeaderUpcomingMeetings` — wrapper que usa `UpcomingMeetingsCard` + `PendingTranscriptsCard` + boundary.
- `MembersGrid` — grid responsivo de `TeamMemberCard` com `TeamTabs` (filtro por time), checklist e o Mirror Insight ficam só no `Inicio`.

Exportar `LeaderHero`, `LeaderUpcomingMeetings`, `MembersGrid` como named exports. `Index` continua sendo o default export e compõe os três (inicio mantém visual idêntico ao atual).

### 2. Remover o banner das páginas onde não faz sentido

- `src/pages/lider/Diario.tsx`: parar de renderizar `<Index />`. Renderiza só `MembersGrid` com header próprio "Diário de Bordo / Selecione um liderado". `TeamMemberCard.onClick` já navega para `/member/:id` (que é o diário do liderado). Comportamento Tako alcançado sem novo componente.
- `src/pages/lider/Pessoas.tsx` aba "Membros": idem — trocar `<Index />` por `<MembersGrid />`.
- `src/pages/lider/OneOnOnes.tsx` (ver passo 3).
- `src/pages/lider/Avaliacoes.tsx` (ver passo 5).

### 3. `1:1s` — focar no Google Calendar

Reescrever `src/pages/lider/OneOnOnes.tsx`:
- Header próprio "1:1s — Reuniões individuais com cada liderado".
- Manter o banner educacional (Conecte seu Google Calendar) só quando não conectado.
- Conteúdo principal: `LeaderUpcomingMeetings` (cards de próximas 1:1s do Google Calendar + transcrições pendentes), seguido de uma segunda seção "Por liderado" usando o `MembersGrid` em modo compacto que ao clicar leva para `/member/:id?tab=1on1s` (deep-link já suportado por `MemberDetails`).
- Remover as abas "Próximos / Todos / Estatísticas" — viraram seções na mesma página, sem repetir banner.

### 4. Novo item de menu **Objetivos**

- Adicionar entrada em `src/lib/navigation.ts` (`LEADER_NAV_ITEMS`) entre `diario` e `avaliacoes`:  
  `{ id: 'objetivos', labelKey: 'nav.lider.objetivos', icon: Target, to: '/lider/objetivos' }`.
- Adicionar a chave `nav.lider.objetivos` ("Objetivos" / "Goals" / "Objetivos") nos três arquivos `src/i18n/locales/{pt-BR,en,es}.json`.
- Criar `src/pages/lider/Objetivos.tsx`: header próprio + `<MembersGrid mode="objetivos" />`. Em vez de navegar para `/member/:id`, abre o `NewGoalDialog` (`src/components/NewGoalDialog.tsx`) já existente passando o `memberId` selecionado. Adicionar prop opcional `onMemberSelect` em `MembersGrid` para suportar esse comportamento sem duplicar código.
- Registrar a rota `/lider/objetivos` em `src/App.tsx` apontando para `LiderObjetivos` dentro do helper `Leader(...)`.

### 5. `Avaliações` — selecionar liderado e abrir ciclos

Reescrever `src/pages/lider/Avaliacoes.tsx`:
- Header próprio + `<MembersGrid mode="avaliacoes" />`.
- Ao clicar num liderado, abre um `Dialog` com três opções de ciclo: **Rhitmo Mensal**, **Rhitmo Trimestral**, **Rhitmo Formal**. Cada uma chama os fluxos já existentes:
  - Mensal/Trimestral → função `generate-monthly-recap` / `generate-quarterly-recap` (chamadas via `safeFunctionInvoke`) seguidas de redirect para `/member/:id?tab=recaps`.
  - Formal → navega para `/member/:id?tab=reviews&new=formal` (a tela `MemberDetails` já hospeda o `generate-formal-review`).
- Manter abaixo a lista atual de avaliações (Ativos / Rascunhos / Concluídos) como seção secundária — não como abas que escondem o seletor.

### 6. Hero estatístico só no Início

- `src/pages/lider/Inicio.tsx` continua sendo o único lugar com o `LeaderHero` (banner "Bom dia, Matheus" + analytics inline). Esse é o "início" que o usuário pediu: visão geral + métricas vivem aqui.
- Como bônus de coerência, o setup checklist e o Mirror Insight ficam no Início, não vazam pras outras páginas.

### 7. Limpezas

- Remover o `<Index />` reaproveitado em `Diario.tsx`, `Pessoas.tsx` (aba membros) e `OneOnOnes.tsx`.
- Garantir que `/dashboard` continua renderizando `<Index />` (compatibilidade).
- Deep-links existentes (`/member/:id?tab=...`) continuam funcionando — só estamos mudando o ponto de entrada.

---

## Detalhes técnicos

- **Componentização**: `MembersGrid` recebe `mode?: 'navigate' | 'objetivos' | 'avaliacoes'` e `onMemberSelect?: (m) => void`. Default `navigate` mantém o `navigate('/member/'+id)` atual.
- **i18n**: três entradas nuevas (`nav.lider.objetivos`, `objetivos.title`, `objetivos.subtitle`).
- **Rotas adicionadas**: `/lider/objetivos`. Nenhuma removida.
- **Sem mudanças em backend, RLS, edge functions ou schema** — usa `NewGoalDialog`, `generate-monthly-recap`, `generate-quarterly-recap` e `generate-formal-review` já existentes.
- **Risco**: baixo. `Index` permanece intacto (exporta default + named); apenas as host pages de `Diário`, `1on1s`, `Pessoas/membros` e `Avaliações` mudam a composição.

```text
Sidebar (líder)              Conteúdo
─────────────────            ───────────────────────────────────
Início          ─────────►   Hero "Bom dia" + analytics + Mirror
1:1s            ─────────►   Calendar meetings + por liderado
Diário de Bordo ─────────►   Grid Tako → /member/:id (diário)
Objetivos (NEW) ─────────►   Grid Tako → NewGoalDialog
Avaliações      ─────────►   Grid Tako → modal Mensal/Trim/Formal
Configurações   ─────────►   (sem mudança)
```
