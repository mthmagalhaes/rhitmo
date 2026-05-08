## Diagnóstico

O tour usa o seletor `[data-tour="member-list"]` no passo 2 (Diário). Esse atributo só existe em **um** lugar — o `<aside>` desktop em `MemberMasterList.tsx`:

```tsx
<aside data-tour="member-list" className="hidden lg:flex ...">
```

A classe `hidden lg:flex` faz o elemento ficar `display:none` abaixo de `lg` (1024px). Como o usuário está em **869px** (e qualquer pessoa em laptop pequeno / janela reduzida cai no mesmo caso), acontece o seguinte:

1. `waitForSelector` encontra o elemento no DOM (querySelector ignora visibilidade) → resolve imediatamente.
2. `driver.js` tenta destacar/posicionar o popover sobre um elemento de área zero (`display:none`) → o overlay/highlight falha silenciosamente e o popover "desaparece".

Mesmo padrão de risco existe na navegação Mobile (Sheet com botão "Liderados"), que não tem âncora alguma.

## Correção

### 1. `src/components/leader/MemberMasterList.tsx`
Adicionar `data-tour="member-list"` também ao **botão trigger mobile** (`<Button>` dentro do `SheetTrigger`), para que abaixo de `lg` o tour tenha um alvo visível para destacar.

### 2. `src/components/onboarding/LeaderTour.tsx`
- Endurecer `waitForSelector` para considerar **apenas elementos visíveis** (verificar `offsetParent !== null` e `getBoundingClientRect().width > 0`). Se o desktop aside estiver `hidden`, o polling pula para o trigger mobile (ambos compartilham o mesmo `data-tour`).
- Adicionar fallback: se nenhum elemento visível aparecer em 2.5 s, mostrar um toast amigável ("Não consegui encontrar este passo no seu layout atual") e destruir o tour em vez de travar com popover invisível.
- Garantir que `hopAndAdvance` só chame `moveNext()` se a âncora foi encontrada.

### 3. (Defensivo) Revisar âncoras dos demais passos
- `[data-tour="context-feed"]` em `Contexto.tsx` → ok, sempre visível.
- `[data-tour="reviews-list"]` em `Avaliacoes.tsx` → ok.
- `[data-tour="integrations"]` em `Configuracoes.tsx` → confirmar que a aba `?tab=integracoes` realmente monta a grid antes de polling terminar (já há 60ms de delay + 2.5s polling, deve cobrir).

## Fora do escopo
- Não alterar conteúdo/copy dos steps.
- Não mexer no `useOnboardingTour` (estado de "completou").
- Não redesenhar o `MemberMasterList`.

## Arquivos afetados
- `src/components/leader/MemberMasterList.tsx` (1 atributo)
- `src/components/onboarding/LeaderTour.tsx` (helper + fallback)

## Validação
Após o fix, abrir `/lider/inicio` em viewport 869px com tour ativo → clicar Próximo no passo 1 → deve navegar para `/lider/diario` e destacar o botão "Liderados" do header mobile sem desaparecer.