## Diagnóstico

Confirmei no banco para `matheus.magalhaes@fstr.co`:


| source                    | qtd     | tamanho médio        | conteúdo                                                                                                                        |
| ------------------------- | ------- | -------------------- | ------------------------------------------------------------------------------------------------------------------------------- |
| `manual`                  | **298** | 39k chars (máx 124k) | **maioria são transcrições do Tactiq** (cabeçalho `Meeting started:`, `Participants:`, link `tactiq.io`, falas `> HH:MM Nome:`) |
| `recall_bot`              | 36      | 46k                  | bot Rhitmo ✅                                                                                                                    |
| `transcription`           | 3       | 6k                   | uploads recentes ✅                                                                                                              |
| `slack_ambient` / `slack` | 3       | 200                  | Slack ✅                                                                                                                         |


Ou seja: o filtro "Upload / Transcrição" não retorna nada porque essas reuniões (Alinhamento Operações, Alinhamento Semanal, Projeto Nubank, etc.) foram gravadas historicamente com `source='manual'`. O chip "Upload" também não aparece nelas, e ao mesmo tempo o filtro "Notas manuais" fica poluído por elas.

A correção precisa ser uma **regra do sistema** (não só do líder Matheus), aplicável retroativamente e a qualquer nova ingestão futura.

## O que vou implementar

### 1. Detector heurístico unificado (frontend + backend)

Criar uma função pura `detectEffectiveSource(content, currentSource)` que retorna o source **efetivo** quando o gravado for `manual` ou `null`. Regras (em ordem):

1. Match Tactiq/Granola/Fireflies/GoogleMeet Transcriptions: regex em `Meeting started:` ∧ (`Participants:` ∨ `tactiq.io` ∨ `fireflies` ∨ `granola`) → `transcription`.
2. Múltiplas falas com timestamp `^>\s?\d{1,2}:\d{2}\s+\S` (≥ 4 ocorrências) → `transcription`.
3. Padrão Markdown `**Nome:**` em ≥ 4 linhas → `transcription`.
4. `content.length > 1500` ∧ qualquer padrão de fala acima → `transcription`.
5. Caso contrário, mantém o source atual (real `manual`, `recall_bot`, `slack`, etc.).

### 2. Frontend — chip + filtro (imediato, sem migration)

- `src/lib/diarySource.ts`: substituir `isTranscriptLike` por `detectEffectiveSource`; o chip e a `kind` passam a refletir a heurística. Resultado:
  - Tactiq legado → chip "Transcrição" (amber) e cai no filtro **Upload / Transcrição**.
  - Notas curtas reais → chip "Nota" (e cai em **Notas manuais**).
- `src/pages/lider/Diario.tsx`: o filtro `source` passa a comparar contra `detectEffectiveSource(fb.content, fb.source)` em vez de `fb.source` cru. Isso resolve o sintoma reportado sem depender de migration.

### 3. Backend — backfill + regra futura (a regra do sistema)

Migration única + trigger leve, para que toda a stack (RAG, recaps, briefs) também enxergue o source correto:

```sql
-- helper imutável reaproveitado pelo trigger
CREATE OR REPLACE FUNCTION public.detect_feedback_source(_content text, _current text)
RETURNS text LANGUAGE sql IMMUTABLE AS $$
  SELECT CASE
    WHEN _current IS NOT NULL AND _current NOT IN ('manual','') THEN _current
    WHEN _content ~* 'Meeting started:' AND (_content ~* 'Participants:|tactiq\.io|fireflies|granola') THEN 'transcription'
    WHEN (SELECT count(*) FROM regexp_matches(_content, '^>\s?\d{1,2}:\d{2}\s+\S', 'gm')) >= 4 THEN 'transcription'
    WHEN (SELECT count(*) FROM regexp_matches(_content, '\*\*[^*\n:]{1,80}:\*\*', 'g')) >= 4 THEN 'transcription'
    WHEN length(_content) > 1500
         AND _content ~ '(^|\n)[A-ZÀ-Ý][\wÀ-ÿ ''.-]{1,60}:\s' THEN 'transcription'
    ELSE COALESCE(_current, 'manual')
  END;
$$;

-- backfill one-shot (apenas linhas 'manual'/NULL)
UPDATE public.feedbacks
SET source = public.detect_feedback_source(content, source)
WHERE (source IS NULL OR source = 'manual')
  AND public.detect_feedback_source(content, source) <> COALESCE(source,'manual');

-- trigger para futuras inserções/edições
CREATE OR REPLACE FUNCTION public.feedbacks_auto_source()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
BEGIN
  NEW.source := public.detect_feedback_source(NEW.content, NEW.source);
  RETURN NEW;
END $$;

DROP TRIGGER IF EXISTS feedbacks_auto_source_trg ON public.feedbacks;
CREATE TRIGGER feedbacks_auto_source_trg
BEFORE INSERT OR UPDATE OF content, source ON public.feedbacks
FOR EACH ROW EXECUTE FUNCTION public.feedbacks_auto_source();
```

Observações:

- Não toca em `recall_bot`, `slack`, `slack_ambient`, `magic_paste` — só promove `manual`/NULL quando o conteúdo é claramente transcrição.
- Como `recall-webhook` e `upload-meeting` já gravam o source certo, o trigger é defensivo (não muda o fluxo atual).
- Como bônus, o `summarize-transcript` (que hoje só é disparado em `recall_bot`/`upload-meeting`) passa a poder ser invocado on-demand no `TranscriptExpandedView` para esses Tactiq legados — já é o comportamento atual quando `structured_summary` está vazio.

### 4. Validação

Antes de subir a migration, rodo um `SELECT count(*) GROUP BY detect_feedback_source(...)` para confirmar quantos dos 298 serão reclassificados (esperado: praticamente todos, exceto notas curtas reais). Pós-deploy, abro o Diário do Matheus e valido:

- Filtro **Upload / Transcrição** mostra as reuniões "Alinhamento Operações" etc.
- Filtro **Notas manuais** fica restrito a notas curtas reais.
- Chip "Transcrição" aparece em cada item legado.

## Fora do escopo

- Não vou re-gerar `structured_summary` em massa (custo de LLM); fica sob demanda quando o líder abrir o item, como já funciona.
- Não vou mexer em fontes que já gravam corretamente (`recall_bot`, `slack`, `upload-meeting`).