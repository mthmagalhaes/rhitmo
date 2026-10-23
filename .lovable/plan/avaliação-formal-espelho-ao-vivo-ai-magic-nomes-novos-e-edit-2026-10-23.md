# Avaliação formal: Espelho ao vivo, AI Magic, nomes novos e editor estável

## O que muda para o líder

1. **Espelho ao vivo e acionável**
   - Cada clique em "Revisar" lê o Rascunho Geral exatamente como está agora na tela (inclusive edições não salvas). Cada revisão substitui a anterior.
   - Todo alerta com trecho ganha "Aplicar sugestão". Se o texto mudou desde a revisão, a Rhitmo localiza o trecho de forma tolerante (ignora espaços, pontuação e formatação). Se mesmo assim não achar, o alerta fica marcado "Texto mudou, revise de novo" em vez de mostrar erro.
   - Alertas sem trecho (ex.: Cobertura) ganham "Escrever trecho sugerido": a Rhitmo cria um parágrafo e mostra para o líder aceitar antes de inserir.
   - Botão "Revisar no Espelho" também disponível dentro do Rascunho Geral.

2. **Fim do "A Rhitmo está trabalhando nisso" em dobro**
   - Um único aviso de carregamento no Rascunho Geral, que some no primeiro trecho escrito ao vivo.

3. **Nomes profissionais**
   - "Guiado pela cultura" vira **Avaliação Institucional**: "Estruturada pela cultura da empresa: valores, comportamentos e régua, combinados com sinais do dia a dia. Passo a passo com revisão do Espelho."
   - "Rascunho completo" vira **Rascunho livre por evidências**: "A Rhitmo escreve a avaliação inteira a partir de anotações, 1:1s e evidências do período. Você edita livremente."
   - Mudança só de texto na tela (português, inglês e espanhol). Avaliações antigas não mudam.

4. **Barra AI Magic**
   - Ao selecionar um trecho no editor, aparece uma barrinha flutuante com:
     - 😊 Deixar menos formal
     - 👔 Deixar mais formal / corporativo
     - 🎯 Mais direto / encurtar
     - 🤝 Ajustar tom (mais construtivo / empático)
     - 🔎 Adicionar evidência (busca uma anotação relacionada do período e insere com a pílula de citação)
     - Campo livre "Peça à Rhitmo…" para instruções próprias
   - Resultado aparece como prévia com "Substituir", "Inserir abaixo" e "Descartar". Nada muda sem o clique do líder; Ctrl+Z desfaz.
   - Citações existentes no trecho são preservadas. "Adicionar evidência" nunca inventa: sem anotação relacionada, diz isso com leveza.

5. **Sinais de rede**: sem mudança agora (continuam distribuídos na narrativa como contexto, nunca como prova isolada).

6. **Barra de formatação estável**
   - Clicar em Título, Subtítulo, Marcadores, Lista numerada, Negrito e Itálico passa a aplicar sempre, sem perder a seleção.
   - Botões alinhados aos níveis reais do documento (Título de seção e Subtítulo), com estado ativo correto.

## O que não muda
- Passos obrigatórios na primeira vez, compartilhar bloqueado com o "i", escrita ao vivo, regra de nunca inventar, exclusão de rascunhos, PDF, revogar.

## Detalhes técnicos
- **Formatação**: botões da toolbar com `onMouseDown={e => e.preventDefault()}`; parar o loop de `setContent` sincronizando só quando o valor externo difere do HTML atual (e nunca durante foco/stream); mapear para H2/H3 + bulletList/orderedList em `rich-text-editor-impl.tsx`.
- **Espelho**: `review-mirror` recebe o texto atual no corpo (Markdown do editor) em vez de ler o banco; aplicação via helper novo `findFuzzyRange` (normaliza texto do doc ProseMirror e aplica com `insertContentAt`, padrão de `biasReplace.ts`); estado "stale" no achado; nova ação `suggest_insert` para achados sem excerpt. Resultado continua em `review_mirror_checks`.
- **Duplicação**: garantir uma única fonte de loading no `FormalReviewSheet` (remover o RhitmoThinking redundante entre sheet e `SignalsGuidedPanel`).
- **Nomes**: só chaves de i18n e labels em `CreateFormalReviewDialog` e onde o modo é exibido; `authoring_mode` no banco permanece.
- **AI Magic**: Tiptap `BubbleMenu` no modo `appearance="reading"`; nova edge function `review-rewrite` (auth obrigatória, checagem de dono da avaliação, `google/gemini-2.5-flash`, prompt em `soul/modes/review-rewrite.md` + regen-docs/snapshots/testes); "Adicionar evidência" usa o RAG de evidências do período do liderado e só aceita `[doc:UUID]` reais do contexto.
- **Analytics**: eventos `mirror_run`, `mirror_suggestion_applied`, `ai_magic_used` (só tipo de ação) via `productAnalytics.ts`.
- **Testes**: unitário de `findFuzzyRange` (trecho com espaços/pontuação diferentes e trecho ausente); unitário de que o rewrite preserva `[doc:UUID]`; testes Soul; verificação no navegador de formatação, AI Magic e Espelho numa avaliação real.
