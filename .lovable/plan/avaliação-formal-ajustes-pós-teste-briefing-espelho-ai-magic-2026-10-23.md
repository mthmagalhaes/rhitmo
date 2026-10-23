# Avaliação formal: ajustes pós-teste (briefing, Espelho, AI Magic)

## O que muda para o líder

1. **Texto explicativo do briefing não some mais**
   - A caixinha de explicação abaixo dos modos fica sempre visível e troca o texto conforme o modo escolhido (Avaliação Institucional ou Rascunho livre por evidências), sem a tela "pular".

2. **Espelho estável, corrigindo ao vivo na própria aba**
   - O Espelho continua como aba própria. Clicar em "Revisar no Espelho" dentro do Rascunho Geral só leva para a aba Espelho, sem trocar de tela de forma estranha.
   - O Espelho só revisa quando o Rascunho Geral já está pronto. Enquanto ainda estiver "Preparando...", mostra "Aguardando o documento ficar pronto" em vez de uma tela vazia.
   - A revisão sempre lê o texto atual do Rascunho Geral (inclusive edições não salvas).
   - "Aplicar sugestão" corrige o texto ali mesmo: o alerta vira "Aplicado" e o líder continua na aba Espelho. Um aviso curto confirma a alteração, com opção de desfazer.

3. **Sugestão do AI Magic sempre inteira e visível**
   - A caixa da sugestão passa a se posicionar acima do trecho quando falta espaço embaixo, e nunca fica atrás da barra fixa inferior.
   - Área de leitura maior, com rolagem própria para sugestões longas.
   - A Rhitmo garante respostas completas (sem corte no meio da frase) e, se a resposta vier incompleta, avisa e pede para tentar de novo em vez de mostrar texto cortado.

## O que não muda
- Passos obrigatórios na primeira vez, compartilhar bloqueado com o "i", escrita ao vivo, aviso único de carregamento, regra de nunca inventar, citações preservadas.

## Detalhes técnicos
- **Briefing**: em `CreateFormalReviewDialog.tsx`, remover a condição `effectiveMode === 'full_draft'` do bloco helper; renderizar descrição por modo com altura mínima fixa.
- **Espelho**: em `FormalReviewSheet.tsx`, separar navegação (`setTab('mirror')`) de execução (`runMirror`); bloquear `runMirror` quando o rascunho é placeholder ou está em stream; `waiting` do `ReviewMirrorPanel` ligado a esse estado. Aplicação usa o editor ativo do Rascunho Geral (ref compartilhada) ou, se não montado, aplica no Markdown do rascunho via `replaceFuzzy` e salva; marcar achado `applied` em `review_mirror_checks`; toast com desfazer (restaura o texto anterior).
- **AI Magic**: `BubbleMenu` com `placement: 'bottom-start'` + `flip`/`shift` (padding inferior igual à altura do rodapé), `max-h` da prévia ~60vh com scroll, `z-index` acima do rodapé. Em `review-rewrite`, subir `max_tokens`, checar `finish_reason === 'length'` e devolver erro amigável; manter validação de `[doc:UUID]`.
- **Testes**: unitário do fluxo de aplicação via `replaceFuzzy` no Markdown; verificação no navegador do briefing, Espelho em avaliação real e prévia longa do AI Magic.
