

## Roadmap de Execução — 6 Épicos

### Épico 1: Bug do MeetingRecorder (P0)

**Problema**: A compressão MP3 via `lamejs` falha silenciosamente em alguns navegadores, gerando WAV de 43MB que excede o limite do Whisper. O fallback atual (`convertToMp3` catch → WAV) não comprime o suficiente.

**Alterações**:

| Arquivo | O que muda |
|---------|-----------|
| `src/components/MeetingRecorder.tsx` | Adicionar verificação de tamanho pós-conversão: se WAV > 20MB, re-render para 8kHz mono (reduz ~4x). Adicionar log de diagnóstico no catch do lamejs para entender a causa raiz. Mostrar toast de aviso se fallback for ativado. |
| `supabase/functions/upload-meeting/index.ts` | Adicionar validação server-side: se arquivo > 25MB, rejeitar com mensagem clara pedindo gravação mais curta. |

---

### Épico 2: Slack Phase 2 — `/brief` e `/meu-pdi`

**Problema**: Os comandos `/brief` e `/meu-pdi` estão registrados na privacy list mas não têm handlers implementados. O menu para liderados é básico (só "Abrir Rhitmo").

**Alterações**:

| Arquivo | O que muda |
|---------|-----------|
| `supabase/functions/slack-bot/index.ts` | Implementar `handleBriefCommand` (chama `generate-brief` e retorna resumo formatado em blocks). Implementar `handleMeuPdiCommand` (busca PDI ativo do liderado e retorna lista formatada). Adicionar cases no `processCommand` switch. Expandir menu de liderados com botões de ação (Meu PDI, Meu Brief). |

---

### Épico 3: Ativar Embeddings

**Problema**: A coluna `feedbacks.embedding` (vector 1536) e a RPC `match_feedbacks` existem, mas nenhuma Edge Function gera os vetores. O Mentor Chat usa apenas as 10 notas mais recentes.

**Alterações**:

| Arquivo | O que muda |
|---------|-----------|
| `supabase/functions/analyze-feedback-background/index.ts` | Após análise de sentimento/tags, chamar `text-embedding-3-small` via OpenAI para gerar embedding do conteúdo e salvar na coluna `embedding`. |
| `supabase/functions/chat-mentor/index.ts` | Na Camada 2 (Compressor), quando `needsContext=true`, chamar `match_feedbacks` via RPC com embedding da pergunta para busca semântica, mesclando com as notas recentes. |

---

### Épico 4: Migrar Meu Rhitmo e Mentor Chat L3 para modelo mais barato

**Problema**: `chat-mentor` e `meu-rhitmo` usam `gpt-4o` para a resposta final (L3), que é o principal driver de custo. O roteador e summarização já usam `gpt-4o-mini`.

**Alterações**:

| Arquivo | O que muda |
|---------|-----------|
| `supabase/functions/chat-mentor/index.ts` | Trocar `model: 'gpt-4o'` (linha 628) por Lovable AI Gateway (`google/gemini-2.5-flash`) via `https://ai.gateway.lovable.dev/v1/chat/completions` com `LOVABLE_API_KEY`. Manter `gpt-4o-mini` no roteador e summarização (já barato). |
| `supabase/functions/meu-rhitmo/index.ts` | Trocar `model: 'gpt-4o'` por Lovable AI Gateway (`google/gemini-2.5-flash`). Manter `gpt-4o-mini` na summarização. |

**Nota**: Gemini 2.5 Flash tem qualidade comparável ao GPT-4o para tarefas de análise textual em PT-BR, com custo significativamente menor e sem precisar de API key externa (usa `LOVABLE_API_KEY` já configurado).

---

### Épico 5: Analytics Avançado para HR

**Problema**: O `HRAnalytics.tsx` atual mostra métricas básicas (sentimento, notas por líder). Faltam: evolução temporal, heatmap de engajamento, alertas de risco, comparativo entre líderes.

**Alterações**:

| Arquivo | O que muda |
|---------|-----------|
| Migração SQL | Criar RPC `get_hr_analytics_advanced` com: tendência de feedback semanal (últimas 12 semanas), distribuição de tags, membros em risco (>30d sem feedback + sem PDI), ranking de engajamento por líder. |
| `src/pages/HRAnalytics.tsx` | Adicionar tabs: "Visão Geral" (atual), "Tendências" (gráfico de linha semanal), "Riscos" (tabela de membros em risco com ações), "Engajamento" (heatmap líder × semana). |
| `src/components/hr/RiskTable.tsx` | Novo componente: tabela de membros em risco com filtros e ações rápidas. |
| `src/components/hr/EngagementHeatmap.tsx` | Novo componente: heatmap visual líder × semana (verde/amarelo/vermelho). |

---

### Épico 6: Marketplace de Templates de Competências

**Problema**: O framework de competências atual é fixo (6 competências genéricas criadas via `create_default_competency_framework`). Não há como importar frameworks prontos por área/indústria.

**Alterações**:

| Arquivo | O que muda |
|---------|-----------|
| Migração SQL | Criar tabela `competency_templates` (id, name, industry, description, template_data jsonb, is_public, created_by). Seed com 5-8 templates iniciais (Tech, Vendas, Marketing, Produto, CS, etc.). |
| `src/components/competency/TemplateMarketplace.tsx` | Novo componente: grid de cards com templates disponíveis, preview das competências, botão "Usar este template". |
| `src/pages/CompetencyFramework.tsx` | Adicionar botão "Explorar Templates" que abre o marketplace. Ação de importar substitui o framework default. |

---

### Ordem de Execução

```text
Sprint 1 (concluída):     Épico 1 (P0 bug) + Épico 4 (migração modelo) ✅
Sprint 2 (concluída):     Épico 3 (embeddings) + Épico 2 (Slack Phase 2) ✅
Sprint 3:                  Épico 5 (HR Analytics)
Sprint 4:                  Épico 6 (Marketplace)
```

### Impacto em Custos

- **Épico 4** reduz ~60-70% do custo de IA (GPT-4o → Gemini Flash via Lovable AI)
- **Épico 3** adiciona custo marginal (~$0.0001/embedding) mas melhora drasticamente a qualidade das respostas do Mentor

