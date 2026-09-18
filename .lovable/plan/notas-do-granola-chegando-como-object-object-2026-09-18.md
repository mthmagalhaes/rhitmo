# Notas do Granola chegando como "[object Object]"

## O que está acontecendo

A conexão com o Granola funcionou: a nota "Alinhamento Emilia Vision" entrou sozinha, com data, origem e liderada certas. O que quebrou foi só o **conteúdo**.

O Granola devolve a transcrição como uma lista de trechos (quem falou, o que falou, em que momento), não como um texto corrido. A Rhitmo hoje espera texto corrido, então grava a lista "como está" e o resultado vira aquela sequência de `[object Object]`. Como o texto ficou ilegível, a IA respondeu com sinceridade: "a transcrição está vazia".

Confirmado no banco: as 5 notas do Granola já importadas (04/09, 09/09, 10/09 e 18/09) estão todas com o mesmo problema, e nenhuma delas trouxe o resumo do Granola junto — só o cabeçalho "Transcrição" seguido dos marcadores.

## O que vamos corrigir

1. **Ler a nota do jeito que o Granola entrega.** Antes de mudar código, buscar uma nota real pela conexão do seu usuário e olhar o formato exato dos campos (resumo, transcrição, participantes). A correção segue esse formato real, não um palpite.
2. **Montar o texto direito.** Transcrição vira "Nome: fala" linha a linha, como já fazemos com o Fireflies. O resumo do Granola entra antes, quando existir.
3. **Marcar a fidelidade certa.** Nota com fala literal passa a valer como "Fala literal" citável; nota só com resumo continua marcada como resumo.
4. **Recuperar as notas já importadas.** Reimportar o conteúdo das 5 notas existentes e refazer o resumo com IA, para elas deixarem de mostrar "[object Object]" e virarem evidência utilizável.
5. **Não deixar passar de novo.** Se o conteúdo montado não tiver texto legível, a nota não é gravada como evidência silenciosamente: ela fica pendente com o motivo visível na tela de Conectores.

## O que não muda

Preço, planos, visibilidade (a nota continua privada do líder), regras de acesso, e a forma como a nota é ligada ao liderado. A conexão com o Granola segue a mesma, sem precisar refazer a chave.

## Detalhes técnicos

- `supabase/functions/_shared/granolaClient.ts`: `noteToContent` faz `String(note.transcript)` num array de segmentos. Substituir por um normalizador que aceite `string | Array<{speaker|speaker_name|name, text, ...}>` e também resumo em objeto (`summary.markdown` / `overview`), espelhando `buildContent` de `notetakers/fireflies.ts`.
- `notetakers/granola.ts`: `fidelity` passa a depender de a transcrição ter rendido linhas de fala, não só de `note.transcript` existir.
- Passo 1 via ação de diagnóstico temporária em `note-taker-connect` (só para o próprio usuário autenticado), que devolve as chaves e os tipos do payload de uma nota — sem expor a chave nem o conteúdo integral.
- Backfill: função de reprocessamento que, para cada `note_taker_synced_notes` com `status='imported'` do provedor `granola`, rebusca a nota, atualiza `feedbacks.content` / `source_fidelity` e redispara `summarize-transcript`.
- Guarda: em `noteTakerSync.ts`, além de `MIN_CONTENT_LEN`, rejeitar conteúdo cuja parte de transcrição seja majoritariamente `[object Object]`, gravando `status='pending'` com `last_error` legível.
