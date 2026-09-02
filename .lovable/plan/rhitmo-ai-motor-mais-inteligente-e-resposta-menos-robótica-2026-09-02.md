# Rhitmo AI: motor mais inteligente e resposta menos robótica

Dois problemas distintos aparecem nos prints: (1) a tela do "Pergunte à Rhitmo" pede o liderado em dois lugares; (2) o motor responde sempre com o mesmo template de análise, mesmo quando o pedido é "me escreve uma mensagem", e ignora o anexo como contexto real.

## 1. UX: um único lugar para escolher o liderado

Hoje o header tem o toggle "Conversar comigo (coach)" / "Analisar um liderado" e o composer tem outro seletor com o nome do liderado. São dois controles para a mesma decisão.

Mudança: remover o toggle do header. O seletor do composer passa a ser o único controle, com dois estados visuais:

- Sem liderado: chip neutro "Rhitmo (sobre você)" — modo coach.
- Com liderado: chip com avatar + nome — modo análise, e o seletor de escopo ("Tudo do liderado") só aparece nesse estado.

O header perde o toggle e ganha uma linha de contexto discreta ("Falando sobre Laís Isfer" ou "Conversa sobre sua liderança"), no padrão editorial do resto do app. O envio deixa de ser bloqueado por "escolha um liderado": sem seleção, a pergunta vai como coach. Se a pergunta citar claramente um nome do time e não houver liderado escolhido, o composer sugere o chip ("Falar sobre Laís?") em vez de travar.

## 2. Motor: contrato de resposta por intenção

Causa raiz do tom robótico: a alma força o mesmo formato em toda mensagem. `04-drafting.md` obriga "Explicação Breve + Texto Pronto Destacado + 📱 Sugestão para WhatsApp/Slack", e `02-analysis-matrix.md` + `03-tone-and-format.md` empurram seções com emoji e "🎯 Síntese Honesta". Resultado: pedir uma mensagem devolve um laudo.

Criar um bloco novo `_shared/soul/09-response-contract.md`, carregado antes dos demais nos modos `leader-member`, `leader-self` e `member-self`, com um contrato explícito de formato por intenção:

| Intenção | Formato obrigatório |
|---|---|
| Escrever/sugerir mensagem para a pessoa | Só a mensagem, em prosa, na voz do líder. Sem seções, sem emoji de seção, sem Síntese Honesta. No máximo uma linha antes explicando a escolha de tom, e só se agregar. |
| Pergunta pontual ("como abordo isso?") | 1 parágrafo + no máximo 3 bullets. Sem Síntese Honesta. |
| Pedido explícito de análise/diagnóstico | Aí sim o formato completo com seções e Síntese Honesta. |
| Small talk / meta | 1–2 linhas. |
| Follow-up ("agora encurta", "muda o tom") | Reescreve o artefato anterior. Nunca reabre a análise. |

Regra-mãe do bloco: **o formato segue o pedido, não o catálogo de capacidades**. `04-drafting.md` é reescrito para gerar mensagem humana (sem cabeçalho "📱 Sugestão para…", sem blockquote obrigatório quando o pedido é só a mensagem) e `03-tone-and-format.md` passa a marcar Síntese Honesta como exclusiva de análise profunda.

## 3. Motor: classificador de intenção antes do modelo

Hoje `chat-mentor` decide só se busca contexto (router de RAG). Adicionar, no mesmo passo barato já existente, uma classificação de intenção do turno (`draft_message` | `quick_question` | `deep_analysis` | `followup_edit` | `smalltalk` | `read_attachment`), levando em conta a última resposta do assistente. A intenção vira um apêndice curto no system prompt ("INTENÇÃO DETECTADA: draft_message — siga a linha correspondente do contrato de resposta") e também decide o modelo.

## 4. Motor: modelo e profundidade

Hoje todo turno vai para `google/gemini-3-flash-preview`, sem raciocínio, o que explica a resposta rasa mesmo com contexto bom. Passa a ser escalonado:

- `smalltalk`, `followup_edit`, `draft_message` curto: Gemini Flash da geração atual (rápido e barato).
- `deep_analysis`, `read_attachment` e mensagens sensíveis (burnout, conflito, desligamento): modelo de raciocínio da geração atual, com streaming, para conectar pontos entre evidências em vez de listar.

O modelo exato sai da listagem viva do gateway no momento da implementação; a regra é sempre a geração mais recente da família.

## 5. Motor: anexos viram contexto de primeira classe

No print do Slack anexado, a Rhitmo não usou o conteúdo da conversa. Hoje a imagem entra no payload sem instrução de leitura. Passa a:

- Injetar um bloco "ANEXO DO LÍDER" no prompt dizendo que o anexo é o contexto mais recente e mais relevante, acima do histórico.
- Pedir uma leitura literal antes da resposta (quem falou o quê), usada internamente para ancorar a resposta.
- Persistir um resumo textual do anexo na thread, para que o turno seguinte ("agora me sugere a mensagem") continue enxergando o print.

## 6. Calibração de voz

Adicionar ao contrato exemplos de calibração no padrão do que o líder espera de um braço direito: mensagem que valida o momento da pessoa, fala como o líder falaria, sem jargão de RH, sem rótulo de diagnóstico ("burnout", "risco") dentro do texto que vai para o liderado. O diagnóstico existe para o líder, nunca dentro da mensagem sugerida.

## Detalhes técnicos

- Frontend: `src/pages/lider/Mentor.tsx` (remoção do toggle, chip único, desbloqueio do envio), `src/pages/lider/MentorThread.tsx` (linha de contexto no header).
- Alma: novo `supabase/functions/_shared/soul/09-response-contract.md`; edição de `03-tone-and-format.md` e `04-drafting.md`; registro do bloco em `loader.ts` (`MODE_BLOCKS` dos modos de chat). Obrigatório rodar `regen-docs.ts` + `regen-snapshots.ts` e `loader_test.ts` no mesmo commit.
- Edge function: `supabase/functions/chat-mentor/index.ts` — classificador de intenção, seleção de modelo por intenção, bloco de anexo, persistência do resumo do anexo.
- Slack (`slack-bot`, briefs) herda o contrato automaticamente por usar o mesmo loader; nenhum prompt inline novo.

## Fora de escopo agora

Reescrever brief/recaps, mudar RAG de embeddings, e migrar as edge functions que ainda têm prompt inline.
