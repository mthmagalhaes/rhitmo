

## Diagnóstico

O parser CSV em `BulkOnboardDialog.tsx` (linhas 72-122) tem 3 fragilidades que combinadas explicam o erro "0 válidos, 7 com erros, todas as colunas vazias":

1. **Separador hardcoded como vírgula**: `line.split(',')`. Excel em PT-BR salva CSV com ponto-e-vírgula (`;`) por padrão. Se você abriu o template no Excel, editou e salvou, ele virou `;`.
2. **BOM UTF-8 não tratado**: Excel/Numbers adicionam `\ufeff` no início. Isso faz `header[0]` virar `\ufeffemail`, então `emailIdx = -1`, e `cols[-1]` é `undefined` → todos emails vazios → todos "duplicados" entre si.
3. **CRLF do Windows**: `split('\n')` deixa `\r` colado na última coluna de cada linha.

## Fix

Refatorar o `parseCSV` em `BulkOnboardDialog.tsx` para:

1. **Strip BOM** no início do texto (`text.replace(/^\uFEFF/, '')`)
2. **Auto-detectar separador**: contar ocorrências de `,` vs `;` na linha do header e usar o que tiver mais
3. **Normalizar quebras de linha**: `text.replace(/\r\n?/g, '\n')` antes do split
4. **CSV parsing robusto**: respeitar aspas (`"João, Silva"` vira 1 campo, não 2) — implementar parser inline simples que lida com `"..."` quoting
5. **Validação defensiva**: se `emailIdx === -1` ou `roleIdx === -1`, mostrar erro claro "Cabeçalho não reconhecido. Esperado: email, nome, papel, workspace, time, lider_email" em vez de processar como linhas inválidas

## Arquivo a modificar

- `src/components/admin/BulkOnboardDialog.tsx` — substituir função `parseCSV` (linhas 72-122) e adicionar checagem de header no `handleFileUpload`

Zero edge functions, zero migrations.

## Pergunta rápida (não bloqueante)

O CSV que você usou foi:
- (a) Baixado pelo botão "Baixar template CSV" e editado direto, ou
- (b) Aberto no Excel/Numbers e salvo de novo?

Se (b), provavelmente é o problema do `;`. O fix cobre os dois casos de qualquer jeito — só queria confirmar pra documentar a causa raiz.

