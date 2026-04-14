

## Plano: i18n — Migrar DirectReportDashboard.tsx (último arquivo do Batch 2)

Este é o único arquivo pendente do Batch 2. Possui ~200 strings hardcoded em português distribuídas por todo o componente de 1223 linhas.

### Categorias de strings a migrar

| Categoria | Quantidade estimada | Exemplos |
|-----------|-------------------|----------|
| Label maps (tenure, chronotype, feedback, recognition) | ~30 | `'Menos de 1 ano'`, `'Madrugador (5h-14h)'`, `'Direto'`, `'Reconhecimento Público'` |
| Context maps (chronotype, feedback, recognition) | ~20 | `'Seu líder sabe que você rende melhor...'` |
| MOTIVATOR_OPTIONS array | 6 | `'Autonomia'`, `'Dinheiro'`, `'Estabilidade'`... |
| Hero section | ~10 | `'Meu Painel'`, `'Olá, {name}!'`, subtitle with plurals |
| Tab 1: Visão Geral (Pulse, Actions, News) | ~25 | `'Seu Pulso'`, `'Próximas Ações'`, `'Novidades'`, `'Hoje'`, `'Ontem'`, `'Tudo em dia!'` |
| Tab 2: Minha Carreira (PDI) | ~20 | `'Meu Desenvolvimento'`, `'Propor Ação de Desenvolvimento'`, `'Concluído'`, `'Iniciar'`, `'Prazo:'` |
| Tab 3: Feedbacks | ~10 | `'Feedbacks do seu líder'`, `'Nenhuma anotação compartilhada'`, `'Avaliações Formais'`, `'Exportar PDF'`, `'Confirmar Leitura'` |
| Tab 4: Meu Perfil (Role info + Sync) | ~30 | `'Informações da Função'`, `'Cargo'`, `'Tempo na função'`, `'Responsabilidades'`, `'Aspirações'`, `'Interesses'` |
| Sync Dialog form | ~25 | `'Ritmo e Energia'`, `'Quando você é mais produtivo?'`, `'Madrugador'`, `'Manual de Instruções'`, labels, placeholders |
| Toasts | ~8 | `'Rhitmo Sync atualizado!'`, `'Erro ao salvar.'`, `'Análise atualizada!'`, `'Objetivo concluído!'` |

### Mudanças técnicas

1. **Import** `useTranslation` e `getDateLocale`
2. **Converter label/context maps** para usar `t()` — chamar `t('directReport.tenure.lessThan1')` etc. em vez de strings literais
3. **`MOTIVATOR_OPTIONS`** — converter para array de keys, renderizar como `t('directReport.motivator.autonomy')` etc.
4. **`formatPDIDate`** — usar locale dinâmico via `getDateLocale()`
5. **`toLocaleDateString('pt-BR')`** — substituir por locale dinâmico
6. **Todas as strings inline** no JSX — substituir por `t('directReport.*')`
7. **Atualizar os 3 JSONs** com todas as novas keys sob namespace `directReport`

### Execução

Um único passo: migrar o arquivo + atualizar JSONs. Sem novas dependências ou migrações SQL.

