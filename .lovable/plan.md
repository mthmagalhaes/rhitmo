## Objetivo

Reduzir poluição cognitiva no menu enquanto evoluímos as 3 capacidades (ONA Slack, conectores BR, agente Rhitmo). Esconder Contexto da sidebar e padronizar nomenclatura: tudo passa a ser "Rhitmo" (Mensal, Trimestral, Formal).

## Mudanças

### 1. Esconder "Contexto" da sidebar do líder

**Arquivo:** `src/lib/navigation.ts`

Remover (ou comentar com `// TODO: reabilitar quando ONA + conectores estiverem prontos`) a entrada `contexto` de `LEADER_NAV_ITEMS`. A rota `/lider/contexto` continua existindo (deep-links de auditoria do Brief 1:1 e do EvidenceDrawer continuam funcionando), só some do menu.

### 2. Renomear "Avaliações Formais" → "Rhitmo Formal"

**Arquivo:** `src/components/PerformanceReviewList.tsx` (linhas 121-134)

Trocar o cabeçalho do bloco para o mesmo padrão visual de Mensal/Trimestral (título + subtitle curto descrevendo a feature, sem mencionar nome do liderado — isso já está no header da página):

```tsx
<div>
  <h3 className="text-lg font-semibold">Rhitmo Formal</h3>
  <p className="text-sm text-muted-foreground">
    Avaliação de ciclo (semestral/anual) gerada a partir dos trimestrais
    confirmados. Você revisa, calibra e compartilha com o liderado.
  </p>
</div>
```

Ajustar também:
- Empty state (linha 140): "Nenhum Rhitmo Formal ainda"
- Botão "Criar Primeira Avaliação" → "Criar primeiro Rhitmo Formal"
- Botão principal "Avaliação de Desempenho" → "Novo Rhitmo Formal"

### 3. i18n — adicionar chave `formal` em `rhitmo-pt.json` (e en/es)

**Arquivo:** `src/i18n/locales/rhitmo-pt.json` (e equivalentes en/es)

Adicionar bloco `formal` dentro de `recap` espelhando estrutura `monthly`/`quarterly`:

```json
"formal": {
  "title": "Rhitmo Formal",
  "subtitle": "Avaliação de ciclo (semestral/anual) gerada a partir dos trimestrais confirmados. Você revisa, calibra e compartilha com o liderado.",
  "emptyTitle": "Nenhum Rhitmo Formal ainda",
  "emptyDesc": "Crie o primeiro Rhitmo Formal — a IA monta o rascunho a partir dos trimestrais confirmados e você calibra antes de compartilhar.",
  "createFirst": "Criar primeiro Rhitmo Formal",
  "newButton": "Novo Rhitmo Formal"
}
```

`PerformanceReviewList.tsx` passa a consumir essas chaves via `useTranslation('rhitmo')`.

### 4. (Opcional, mesmo PR) Tab label

**Arquivo:** `src/pages/lider/Avaliacoes.tsx` (linha ~134)

Se quiser consistência total, trocar a label da sub-tab `Formais` → `Formal` (singular, alinhado a "Mensal"/"Trimestral"). Recomendo fazer.

## Fora de escopo (próximos sprints)

- Implementação das 3 capacidades novas (ONA Slack, conectores Linear/GitHub/etc., agente Rhitmo conversacional). Quando o Contexto voltar à sidebar, ele já vem repaginado com esses sinais.
- Remoção da rota `/lider/contexto` — mantida viva para deep-links existentes.
