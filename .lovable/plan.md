## Sprint 9.1 — Fundação de dados para Pulse Surveys (4º pilar do Context Graph)

Esta sprint cria a infraestrutura de banco para **Pulse Surveys conversacionais** — surveys multi-pergunta disparados pelo líder (ou por automação) e respondidos pelo liderado, com resumo de IA. É o canal estruturado para capturar "perspectivas" do liderado.

### Análise prévia e ajustes propostos

Inspecionei o schema atual antes de planejar. Três pontos importantes:

1. **`member_prompts` já existe e integra ao `context_evidence`** (Sprint 8.1, source_table = `member_prompts`). É um sistema de **1 pergunta semanal** ("Pulse Card" do dashboard do liderado). O novo `pulse_surveys` é diferente: **N perguntas, conversacional, disparado sob demanda pelo líder, com tipos** (blockers/priorities/retro/goal_progress) e resumo de IA. **Os dois coexistem** — não há duplicação. O `member_prompts` continua sendo o pulse leve recorrente; `pulse_surveys` é o survey formal.

2. **Padrão de escrita em `context_evidence`:** todas as triggers existentes usam `SECURITY DEFINER` + `_ctx_resolve_workspace()` + `ON CONFLICT (source_table, source_id) DO UPDATE`. Vamos seguir exatamente esse padrão. A tabela já tem `CONSTRAINT context_evidence_source_uniq UNIQUE (source_table, source_id)` que protege contra duplicação.

3. **Fonte canônica de `workspace_id`:** o briefing pede `workspace_id` na tabela. Mantemos a coluna (consistência com `kudos`, `slack_ambient_evidence`), mas garantimos via trigger BEFORE INSERT que ela bate com o workspace do `member_id` (evita inconsistência cross-workspace).

### Migration única

**1) Tabela `pulse_surveys`**

```text
id              uuid PK default gen_random_uuid()
workspace_id    uuid NOT NULL                          -- denormalized, validated by trigger
member_id       uuid NOT NULL → team_members(id) ON DELETE CASCADE
requested_by    uuid NOT NULL                          -- líder (auth.users.id)
type            text NOT NULL CHECK IN
                  ('blockers','priorities','retro','goal_progress')
status          text NOT NULL DEFAULT 'pending' CHECK IN ('pending','completed','expired')
questions       jsonb NOT NULL DEFAULT '[]'::jsonb     -- [{id, text, type}]
responses       jsonb NOT NULL DEFAULT '[]'::jsonb     -- [{question_id, answer}]
summary         jsonb                                   -- {tldr, themes[], sentiment, action_items[]}
context_metadata jsonb NOT NULL DEFAULT '{}'::jsonb    -- goal_id ref, etc
sent_at         timestamptz NOT NULL DEFAULT now()
expires_at      timestamptz                             -- opcional, p/ status auto-expired
completed_at    timestamptz
created_at      timestamptz NOT NULL DEFAULT now()
updated_at      timestamptz NOT NULL DEFAULT now()

INDEX (member_id, sent_at DESC)
INDEX (workspace_id, status, sent_at DESC)
INDEX (requested_by, sent_at DESC)
```

Trigger `update_updated_at_column` (já existe globalmente).

Trigger BEFORE INSERT/UPDATE valida `workspace_id = _ctx_resolve_workspace(member_id)` — rejeita se inconsistente.

**2) RLS** (espelhando `feedbacks` e `member_prompts`)

```text
SELECT:
  - líder do member (is_team_leader(effective_user_id(), member_id))
  - workspace owner (is_workspace_owner_of_member(member_id))
  - HR admin do workspace
  - liderado vinculado (team_members.linked_user_id = auth.uid())
  - super admin

INSERT:
  - líder: requested_by = effective_user_id() AND is_team_leader(effective_user_id(), member_id)

UPDATE:
  - líder do member (pode editar perguntas enquanto pending, cancelar)
  - liderado vinculado (apenas para preencher responses + flipar status para 'completed')

DELETE:
  - líder do member ou workspace owner
```

Não criamos política aberta para o liderado mexer em `summary` ou `requested_by` — campos sensíveis. Isso fica garantido por uma trigger BEFORE UPDATE: se o ator é o liderado (não líder), apenas `responses`, `status`, `completed_at` podem mudar.

**3) Integração com Context Graph** (segue padrão `ctx_evidence_from_*`)

```text
FUNCTION ctx_evidence_from_pulse_survey()
  SECURITY DEFINER, search_path = public
  Disparada AFTER INSERT OR UPDATE OF status, summary, responses

  IF NEW.status <> 'completed' THEN
    -- Se voltar de completed → não-completed, remove a evidence
    IF TG_OP = 'UPDATE' AND OLD.status = 'completed' THEN
      DELETE FROM context_evidence
      WHERE source_table='pulse_surveys' AND source_id=NEW.id;
    END IF;
    RETURN NEW;
  END IF;

  v_summary_text :=
    COALESCE(
      NEW.summary->>'tldr',
      -- fallback: concatena respostas
      (SELECT string_agg(r->>'answer', ' • ')
       FROM jsonb_array_elements(NEW.responses) r),
      'Pulse Survey respondido'
    );

  v_sentiment := COALESCE(NEW.summary->>'sentiment', 'neutral');
  v_themes    := ARRAY(SELECT jsonb_array_elements_text(
                         COALESCE(NEW.summary->'themes','[]'::jsonb)));

  INSERT INTO context_evidence (
    workspace_id, member_id, source_table, source_id, evidence_type,
    occurred_at, title, summary, sentiment, tags, actor_user_id,
    visibility, metadata
  ) VALUES (
    NEW.workspace_id, NEW.member_id, 'pulse_surveys', NEW.id, 'pulse_response',
    NEW.completed_at,
    'Pulse Survey: ' || NEW.type,
    LEFT(v_summary_text, 500),
    v_sentiment,
    ARRAY['pulse_survey', NEW.type] || v_themes,
    NEW.requested_by,
    'shared',                       -- líder requisitou e liderado respondeu = compartilhado
    jsonb_build_object(
      'survey_type', NEW.type,
      'questions_count', jsonb_array_length(NEW.questions),
      'responses_count', jsonb_array_length(NEW.responses),
      'summary', NEW.summary,
      'context_metadata', NEW.context_metadata
    )
  )
  ON CONFLICT (source_table, source_id) DO UPDATE SET
    summary    = EXCLUDED.summary,
    sentiment  = EXCLUDED.sentiment,
    tags       = EXCLUDED.tags,
    metadata   = EXCLUDED.metadata,
    occurred_at= EXCLUDED.occurred_at,
    embedding  = NULL,                -- conteúdo mudou → re-embed via worker existente
    updated_at = now();

  RETURN NEW;
END;
```

**4) Constants/source registry**

Adicionar `'pulse_surveys'` ao `sourceMeta.ts` (já existe pattern). Apenas a entrada de mapeamento — sem criar componentes UI nesta sprint.

### O que NÃO está nesta sprint (próximas)

- UI: criar/visualizar surveys (Sprint 9.2).
- Edge function de geração de perguntas com IA por tipo (Sprint 9.2/9.3).
- Notificação Slack/Email do survey enviado (Sprint 9.3).
- Backfill — não há dados legados.

### Aceitação

- Inserir `pulse_surveys` com `status='pending'` → nada vai pro `context_evidence`.
- Atualizar para `status='completed'` com `summary` populado → uma row aparece em `context_evidence` com `source_table='pulse_surveys'` e visível na timeline `/contexto`.
- `workspace_id` mismatch com `member_id.team.workspace_id` → INSERT/UPDATE rejeitado.
- Liderado consegue dar UPDATE só em `responses/status/completed_at` (trigger barra outras colunas).
- Liderado de outro workspace não vê via SELECT (RLS).
- Reverter `status` de `completed` para `pending` remove a evidência (consistência com pattern de `slack_ambient_evidence`).
- `sourceMeta.ts` reconhece `pulse_surveys` (label "Pulse Survey", ícone `Sparkles` ou `MessagesSquare`).

### Arquivos

**Criar:**
- 1 migration: `pulse_surveys` (tabela + RLS + 2 triggers: validação workspace + integração context_evidence).

**Editar:**
- `src/components/context/sourceMeta.ts` — adicionar entrada `pulse_surveys`.

`src/integrations/supabase/types.ts` regenera automaticamente.
