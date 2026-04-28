## Trimestral em "Modo Rápido" (fallback direto dos feedbacks brutos)

Permite ao líder gerar o Rhitmo Trimestral **sem ter mensais confirmados**, lendo direto dos feedbacks brutos, com sinalização clara de qualidade reduzida.

### O que muda

**1. Banco de dados (mínimo)**
Migration adicionando à tabela `quarterly_recaps`:
- `generation_mode text default 'from_monthly'` — valores: `'from_monthly'` | `'from_raw'`
- Coluna nullable, sem quebrar registros existentes (todos viram `'from_monthly'`).

**2. Edge Function `generate-quarterly-recap`**
- Aceitar parâmetro novo no body: `mode?: 'auto' | 'from_raw'` (default `'auto'`).
- Fluxo `'auto'` (atual): tenta mensais confirmados; se 0, retorna 422 como hoje.
- Fluxo `'from_raw'`: pula a checagem de mensais e busca diretamente:
  - `feedbacks` (notas + shared) do trimestre via `occurred_at`
  - `meetings` com `leader_notes` ou `transcript` do trimestre
- Prompt especializado "Modo Rápido" com guardrails extras anti-alucinação (cita feedback_ids reais, sem inventar padrões).
- Salva `generation_mode = 'from_raw'` no registro.
- Mantém timeout de 50s; limita a no máx ~30 feedbacks + 10 meetings mais relevantes para evitar estouro de contexto/tempo.

**3. Frontend `QuarterlyRecapSection.tsx`**
- Quando vier 422 ("nenhum mensal confirmado"), mostrar dois botões em vez de bloquear:
  - **"Gerar Rhitmo Trimestral"** (primário, desabilitado com tooltip explicando)
  - **"Gerar em modo rápido"** (secundário, link sutil)
- Ao clicar em "modo rápido", abrir `AlertDialog` de confirmação explicando:
  > "Esse modo gera o trimestral direto dos feedbacks brutos, sem a curadoria mensal. A qualidade pode ser menor e padrões isolados podem pesar mais. Recomendado só quando você não confirmou os mensais."
- Após gerado, exibir badge **"Modo rápido"** (amarelo discreto) ao lado do título do recap, lendo `recap.generation_mode === 'from_raw'`.

**4. Tipos & i18n**
- Atualizar tipo `QuarterlyRecap` em `useRecaps.ts` com `generation_mode`.
- Adicionar chaves `recap.quarterly.fastModeButton`, `recap.quarterly.fastModeWarning`, `recap.quarterly.fastModeBadge` em `pt-BR`, `en`, `es`.

### O que NÃO muda
- Reviews formais, mensais, e fluxo padrão continuam idênticos.
- Trimestral gerado em "modo rápido" pode ser confirmado normalmente — mas o badge fica permanente para auditoria.

### Custo estimado
- ~$0.006 por geração em modo rápido vs ~$0.0006 normal (10x maior em token, mas absoluto desprezível).
- Latência: 20-40s vs 5-10s.

### Arquivos a editar
- `supabase/migrations/<novo>.sql` (coluna `generation_mode`)
- `supabase/functions/generate-quarterly-recap/index.ts` (modo `from_raw` + prompt)
- `src/components/recaps/QuarterlyRecapSection.tsx` (botão + dialog + badge)
- `src/hooks/useRecaps.ts` (passar `mode` no invoke + tipo)
- `src/i18n/locales/{pt-BR,en,es}.json` (3 chaves)