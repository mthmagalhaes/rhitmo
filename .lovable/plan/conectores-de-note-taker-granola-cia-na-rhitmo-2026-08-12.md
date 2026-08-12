# Conectores de note taker (Granola & cia) na Rhitmo

Análise de produto + CTO sobre abrir uma seção "Conectores" onde cada líder pluga seu próprio note taker, e o que isso custa para a Rhitmo.

## Resposta curta

Faz sentido, e é estrategicamente forte: hoje a Rhitmo **paga** pela captura (Recall.ai, ~US$0,45/hora de reunião). Se o líder já usa Granola/Fireflies/Otter, ele traz a transcrição de graça e a Rhitmo fica só com a camada de valor (evidência, diário, review formal). Ou seja, conector de note taker é **redução de custo**, não novo custo.

O detalhe técnico importante: **Granola não tem OAuth por usuário disponível na nossa plataforma de conectores.** A lista de conectores "cada usuário conecta a própria conta" não inclui Granola. O que o Granola oferece é **Personal API key** (exatamente a tela que você mandou: Settings > Connectors > API > Personal API keys). Então o fluxo real é BYOK: o líder gera a chave no Granola, cola na Rhitmo uma vez, e a gente sincroniza as notas dele.

## O que o usuário veria

Nova aba/seção **Conectores** dentro de Configurações (evoluindo a aba "Integrações" atual, que hoje só tem Slack e Google Calendar), no padrão das telas de referência: lista de cards com ícone, nome, uma linha de descrição e status à direita ("Conectado" / ">").

Grupos:
- **Captura de reuniões**: Rhitmo Bot (Recall.ai, já existe), Granola, Fireflies, Otter, "Colar transcrição" (Magic Paste, já existe)
- **Comunicação**: Slack (já existe)
- **Agenda**: Google Calendar (já existe)

Fluxo do Granola: card → painel lateral com 3 passos (abrir Granola > Settings > Connectors > Personal API keys, gerar, colar) → validação imediata da chave → mostra "Conectado · última sincronização há X". Depois disso, cada nota nova do Granola cai no Diário de Bordo com o chip de origem **Granola**, passa pelo mesmo pipeline de resumo estruturado / lente pessoal / evidência que já existe para o bot, e o líder só precisa confirmar a quem a nota pertence quando a Rhitmo não conseguir casar o participante com um liderado.

## Fases sugeridas

1. **Fase 1 — Granola BYOK (1 conector, ponta a ponta)**: seção Conectores + chave pessoal + sync a cada 30 min + chip de origem + matching de participante → liderado. É o teste real de demanda.
2. **Fase 2 — mais note takers**: Fireflies e Otter usam o mesmo contrato (chave + polling), então o custo marginal por conector novo é pequeno depois que a Fase 1 existe.
3. **Fase 3 — economia explícita**: quando o líder conecta um note taker, sugerir desligar o Rhitmo Bot para as reuniões cobertas (evita transcrição duplicada e corta custo de Recall).

## Custos para a Rhitmo

Premissa: líder Pro, ~20 reuniões/mês, 30 min cada (10 h/mês).

| Item | Hoje (Recall.ai) | Com note taker conectado |
|---|---|---|
| Captura / transcrição | ~US$4,50/mês por líder | **US$0** (custo é do plano Granola do próprio líder) |
| Resumo estruturado + lente pessoal (Gemini Flash via Lovable AI) | já incluso | já incluso, mesma ordem de grandeza |
| Polling + storage (Cloud) | — | desprezível (~1 chamada/30 min por líder conectado) |
| **Custo variável total/líder/mês** | **~R$26** | **~R$1–2** |

Custo de construção: Fase 1 é o trabalho maior (nova UI + criptografia da chave + worker de sync + matching). Fases 2 e 3 são incrementais.

Risco a nomear: dependência de API de terceiro (a API pública do Granola é recente e pode mudar), e o líder precisa de plano Granola pago para ter chave. Mitigação: Magic Paste continua como fallback e o Rhitmo Bot continua como padrão para quem não usa note taker.

## Recomendação

Avançar, mas com escopo travado na Fase 1 e Granola só. O ganho não é "mais uma integração" — é mudar o modelo de custo: a Rhitmo deixa de comprar minuto de máquina e passa a monetizar a inteligência em cima de transcrição que o cliente já produz. Isso melhora a margem justamente no plano Business, que hoje é o mais apertado.

## Detalhes técnicos

- **Auth**: Granola = API key pessoal (`Authorization: Bearer`), chamada pelo gateway de conectores da Lovable em `https://connector-gateway.lovable.dev/granola/v1/notes`. Não há OAuth por app-user para Granola hoje, então cada líder guarda a própria chave.
- **Armazenamento**: nova tabela `leader_note_taker_connections` (user_id, provider, api_key_ciphertext, last_synced_at, cursor), AES-GCM na edge function, RLS fechada — só `service_role` lê. Chave nunca trafega para o browser depois de salva.
- **Sync**: edge function `sync-note-taker` em cron (30 min), paginando `GET /v1/notes?created_after=<last_synced_at>&cursor=...`, dedupe por id da nota.
- **Ingestão**: reaproveitar o pipeline existente — grava em `feedbacks` com `source = 'granola'`, dispara `summarize-transcript` (resumo estruturado + `personal_lens` por liderado) e o trigger de `context_evidence`. `src/lib/diarySource.ts` ganha o chip "Granola".
- **Matching**: participantes da nota → `team_members` por e-mail; sem match, a nota entra como "não atribuída" com CTA para o líder escolher o liderado.
- **UI**: refatorar `IntegrationsTab` em `src/pages/lider/Configuracoes.tsx` para uma lista de cards agrupada, mais `ConnectorSheet` para o passo a passo da chave.
