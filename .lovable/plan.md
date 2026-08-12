# Erro ao atribuir nota do Granola a uma liderada

## O que aconteceu

Ao escolher a Laís como dona da nota, a Rhitmo tenta gravar a nota no Diário. Toda nota longa passa por uma rotina interna que calcula uma "impressão digital" do texto (usada para reaproveitar o resumo quando a mesma transcrição serve a vários liderados). Essa rotina chama uma função de criptografia que vive em outro esquema do banco, mas a rotina foi configurada para enxergar apenas o esquema `public` — então a função não é encontrada e a gravação falha inteira.

Mensagem exibida: `function digest(text, unknown) does not exist`.

Isso não é específico do Granola: qualquer gravação de conteúdo com mais de 500 caracteres (upload de transcrição, nota manual longa, transcrição do bot) está passando pelo mesmo caminho e falhando.

## Correção

Migration única corrigindo a rotina de hash:

- Recriar `public.feedbacks_set_transcript_hash()` chamando `extensions.digest(...)` de forma qualificada e com `SET search_path = public, extensions`.
- Manter o resto da lógica idêntica (só calcula quando o conteúdo tem mais de 500 caracteres e mudou).

## Verificação depois de aplicar

- Atribuir de novo a nota pendente à Laís no card do Granola em Configurações > Conectores e confirmar que ela aparece no Diário de Bordo.
- Conferir se outras notas longas (upload/bot) voltam a ser gravadas sem erro.

## Detalhes técnicos

`pgcrypto` está instalado no esquema `extensions`. A função trigger tem `SECURITY DEFINER` com `SET search_path TO 'public'`, o que exclui `extensions` da resolução de nomes — daí o `42883`. A chamada passa a ser `encode(extensions.digest(normalized, 'sha256'), 'hex')`.
