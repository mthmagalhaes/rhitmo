
## Problema

Hoje, quando o líder sobe a mesma transcrição (ex: "Alinhamento Operações") para vários liderados, cada cópia vira um `feedbacks` row separado. O `summarize-transcript` roda uma vez por row com o **mesmo prompt genérico** — então as diferenças entre o resumo da Laís e o da Gabriela (prints anexados) são **ruído estatístico do LLM**, não personalização real. O liderado que abre o card não vê "o que importa pra MIM nessa reunião".

## Princípio da solução

Separar duas camadas:

1. **Resumo base (compartilhado)** — TL;DR, tópicos, decisões, action items globais. Roda **uma vez por transcrição-fonte**, mesmo que vá para 5 liderados.
2. **Lente pessoal (por liderado)** — destaque do que *aquela pessoa* falou, compromissos que ela assumiu, menções a ela, tom dirigido a ela. Roda 1× por member vinculado, mas com prompt minúsculo (só o nome + transcrição clipada).

Isso resolve os dois problemas: **consistência** (todos veem a mesma "verdade" da reunião) + **personalização real** (cada um vê sua lente) + **economia** (1 chamada cara + N chamadas baratas em vez de N chamadas caras com resultado aleatório).

## Quando fazer

**No momento do upload**, não depois. O usuário já espera processamento aqui; adicionar lente pessoal não muda a percepção de latência. Pós-fato (lazy, ao abrir o card) introduz spinner ruim numa tela hoje instantânea.

## Como deduplicar transcrições iguais

Adicionar `transcript_hash` (sha256 do `content` normalizado) em `feedbacks`. Quando `summarize-transcript` roda e encontra outro feedback com **mesmo hash + structured_summary preenchido**, copia o `tldr / topics / decisions / action_items / sentiment` desse irmão e pula a chamada cara. Só roda a lente pessoal.

Isso também cobre o caso retroativo: uploads antigos duplicados se beneficiam quando o próximo for processado.

## Mudanças

### Banco (`feedbacks`)
- `transcript_hash text` (índice) — preenchido por trigger na insert/update quando `content` muda e tem >500 chars.
- `personal_lens jsonb` — novo campo separado de `structured_summary` para não invalidar cache existente. Shape:
  ```json
  {
    "member_id": "uuid",
    "member_name": "Laís Isfer",
    "spoke": true | false,
    "talk_share_pct": 12,
    "key_points": ["..."],         // 2-4 bullets do que ela disse
    "commitments": [{"task":"...", "due":"..."}],
    "mentions": ["..."],            // o que falaram SOBRE ela
    "questions_for_1on1": ["..."]   // 2 perguntas que o líder pode levar pra próxima 1:1
  }
  ```

### Edge function `summarize-transcript`
1. Buscar `transcript_hash` do feedback.
2. Procurar irmão com mesmo hash e `structured_summary` pronto → reusa.
3. Se não tiver, gera `structured_summary` como hoje.
4. **Novo passo**: carrega `member_id` + nome do liderado dono desse feedback e chama nova tool `save_personal_lens` (prompt curto, ~3k tokens; Gemini Flash). Grava em `personal_lens`.

### Edge function `upload-meeting`
Sem mudanças na lógica de criar rows (continua 1 row por member_id selecionado). Só passa a invocar `summarize-transcript` em paralelo para todos os rows criados — a dedupe por hash garante 1 chamada base + N lentes.

### Frontend `TranscriptExpandedView.tsx`
Na aba "Resumo", acima dos tópicos globais, novo bloco editorial:

```
PARA VOCÊ · Laís Isfer
[chip "Você participou ativamente" | "Você foi mencionada" | "Você não se manifestou"]

O que você trouxe
• ...

Seus compromissos
• ... (até 15/07)

Perguntas para sua próxima 1:1 com Matheus
• ...
```

Quando o feedback não tem `member_id` (nota geral sem destinatário), oculta o bloco — só o resumo base aparece.

### Backfill
Migration roda `transcript_hash` para o histórico. Lente pessoal NÃO é gerada retroativamente em massa (custo) — só sob demanda: botão discreto "Gerar lente pessoal" no card quando `personal_lens IS NULL && member_id IS NOT NULL`.

## Custos

- **Antes**: N transcrições × ~$0.005 (Gemini Flash, 60k chars) = ~$0.005 × N
- **Depois (transcrição compartilhada com 5 liderados)**: 1 × $0.005 (base) + 5 × $0.0008 (lente, prompt 3k) = $0.009 total, vs $0.025 hoje. **~64% mais barato** + qualidade maior.

## Detalhes técnicos

- Hash: `encode(digest(regexp_replace(content, '\s+', ' ', 'g'), 'sha256'), 'hex')` via `pgcrypto`.
- Trigger `BEFORE INSERT OR UPDATE OF content` em `feedbacks` quando `length(content) > 500`.
- Lente usa o mesmo `clipTranscript` (60k cap) — mas com instrução de "foque APENAS em {{member_name}}; se ela não falou, retorne `spoke:false` e preencha só `mentions` e `questions_for_1on1`".
- `personal_lens` nunca substitui `structured_summary` — convivem. Aba "Resumo" renderiza ambos.
- Sem mudanças em `generate-formal-review` agora — ele já lê `structured_summary` e o `content` cru; a lente é exclusiva da experiência do Diário.

## Fora de escopo

- Permitir 1 feedback com múltiplos members (mudança de modelo grande, quebra RLS de ownership). Mantemos 1 row/member.
- Regenerar lentes em lote no histórico.
- Lente para uploads sem speaker detection (sem nomes na transcrição) — nesse caso o prompt degrada para "menções ao nome do liderado" apenas.
