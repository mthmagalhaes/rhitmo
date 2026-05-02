## Diagnóstico

Em `/lider/objetivos`, ao selecionar um liderado, aparecem **dois botões idênticos** logo um abaixo do outro:

- `+ Novo objetivo` — no header da página (`src/pages/lider/Objetivos.tsx`, linha 67-73)
- `+ Nova Meta` — no header interno do `GoalsManager` (`src/components/GoalsManager.tsx`, linha 127-130)

Ambos abrem o **mesmo `NewGoalDialog`** com o mesmo `memberId`. Pura redundância visual, herança da fusão entre o layout antigo (botão dentro do `GoalsManager`) e o master-detail novo (Sprint 12.1) que adicionou o botão no header da página.

Há também uma inconsistência de vocabulário: "Objetivo" (header da página/menu) vs "Meta" (botão interno, contadores e cards). A tabela no banco se chama `goals`, e o resto do `GoalsManager` (cards, "X metas ativas", "Nenhuma meta ativa") usa **meta** consistentemente. "Objetivos" fica reservado como nome da seção/menu — "metas" são as unidades dentro dela.

## Mudanças

**1. `src/components/GoalsManager.tsx` — tornar o botão interno opcional**

Adicionar prop `hideHeaderAction?: boolean` (default `false`). Quando `true`, o `<div>` com contador + botão "Nova Meta" continua renderizando o contador, mas omite o botão. Mantém retrocompatibilidade — `MemberDetails.tsx` continua funcionando exatamente como hoje, já que não passa a prop.

**2. `src/pages/lider/Objetivos.tsx` — eliminar duplicação**

- Renomear o botão do header de `Novo objetivo` para `Nova meta` (alinhamento de vocabulário).
- Passar `hideHeaderAction` para o `<GoalsManager>` para suprimir o botão duplicado.

**3. Sem mudanças em `MemberDetails.tsx`**

Ali o `GoalsManager` é o único caminho para criar meta dentro da aba "Objetivos" do perfil completo — o botão interno continua visível como antes.

## Resultado visual

Antes (em `/lider/objetivos` com liderado selecionado):

```text
[Avatar] Gabriela Lucas              [ + Novo objetivo ]
         Analista de Business Ops

🎯 0 metas ativas                    [ + Nova Meta ]
```

Depois:

```text
[Avatar] Gabriela Lucas                [ + Nova meta ]
         Analista de Business Ops

🎯 0 metas ativas
```

## Riscos

Nenhum. Mudança puramente cosmética + uma prop opcional com default seguro. Não toca em queries, mutations, RLS ou no `NewGoalDialog`.
