# Rhitmo 2.0 — Bloco 3: Auto Draft

Blocos 1 (Calibrações) e 2 (ONA passivo) estão no ar. Falta o último pilar: a Rhitmo escreve o primeiro rascunho, o líder edita.

Gatilho já decidido: **só quando o líder pedir**. Nada é gerado sozinho, nada é enviado ou compartilhado automaticamente.

## O que existe hoje (verificado)

- A geração de avaliação formal já existe e já lê evidências, mensais e trimestrais. Ainda **não** enxerga a rede de colaboração nem as decisões de calibração.
- A pauta de 1:1 já existe e já inclui um bloco de rede e vozes de pares.
- Os dois montam o texto-base do prompt fora da pasta da "alma" (`soul/`), fora do padrão que definimos.

## O que vamos entregar

### 1. Rascunho de avaliação formal mais completo
- Passa a considerar também a rede real de colaboração da pessoa e as decisões registradas na calibração do ciclo.
- Toda afirmação carrega citação rastreável; frase sem evidência não entra no rascunho.
- O resultado continua nascendo como rascunho editável, nunca compartilhado.

### 2. Rascunho de pauta de 1:1 sob demanda
- Botão explícito "Gerar rascunho da pauta" na próxima 1:1.
- Foco no que mudou desde a última conversa: novas evidências, compromissos abertos, mudanças de rede e sinais ativos.
- Nada é gerado automaticamente antes da reunião por esse caminho.

### 3. Prompts na alma
- Mover os textos de instrução desses dois geradores para arquivos da pasta `soul/`, com um modo próprio de rascunho, para que futuras mudanças de comportamento aconteçam num só lugar.
- Sem mudar o formato de saída atual (o editor de avaliação continua recebendo o mesmo tipo de conteúdo).

### Guardrails
- Sempre rascunho: nunca envia, nunca compartilha, nunca conclui sozinho.
- Rede entra como padrão de colaboração, nunca conteúdo de mensagem.
- Se a matéria-prima for insuficiente, o rascunho diz isso em vez de inventar.

## Pronto quando

Um líder abre um ciclo, clica em gerar, recebe um rascunho ancorado em evidência citável (incluindo rede e calibração quando existirem), edita e conclui sem escrever do zero — e consegue o mesmo para a pauta da próxima 1:1.

## Notas técnicas

- `generate-formal-review`: acrescentar leitura de `team_network_edges`/`network_signals` e das decisões de calibração do ciclo (`calibration_decisions`) ao bloco de contexto; manter a ordem atual (evidência bruta primeiro, recaps como camada de calibração).
- Novo modo `formal-review-draft` e `one-on-one-draft` em `_shared/soul/modes/`, registrados em `loader.ts` + `docs.generated.ts`; substituir os textos inline em `generate-formal-review/index.ts` e `_shared/briefGenerator.ts` (que hoje concatena `RHITMO_IDENTITY + GUARDRAILS_PROMPT`).
- Pauta sob demanda: reaproveitar `generateBriefForMeeting` via chamada explícita da UI (`OneOnOnePrepCard`/`UpcomingMeetingsCard`), sem novo cron.
- Modelo padrão `google/gemini-2.5-flash`, como já está.
- Padrões obrigatórios: JWT, ownership chain antes de service_role, `safeSupabase`, CORS em toda resposta.
- Sem migração destrutiva. Nenhuma mudança de preço, RLS ou regra de negócio.
