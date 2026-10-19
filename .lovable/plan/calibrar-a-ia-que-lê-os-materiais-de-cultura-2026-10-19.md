# Calibrar a IA que lê os materiais de cultura

Objetivo: ao clicar em "Analisar materiais com IA", a Rhitmo deve separar os comportamentos de cada valor em cartões próprios e trazer a régua da empresa (ex.: os 4 níveis do Framework v1.1 da Faster), em vez de juntar tudo no texto do valor.

## O que muda para o RH
- Cada valor vem com seus comportamentos listados embaixo, um por cartão, já ligados ao valor certo.
- Quando o material traz "Fazemos assim / Não assim" ou "O que significa / O que não significa", isso vira exemplos do comportamento (esperado e abaixo do esperado).
- A régua aparece preenchida com os níveis na ordem do mais baixo ao mais alto, com a definição de cada um.
- O resumo do valor fica curto (1 a 2 frases), sem repetir a lista de atitudes.
- Itens que você já editou à mão continuam protegidos.
- Na Faster: depois de publicar a mudança, basta clicar de novo em "Analisar materiais com IA" no rascunho v1.

## Detalhes técnicos
- `_shared/soul/modes/org-context-extraction.md` (v2): regras explícitas de desdobramento — toda frase/atitude observável listada sob um valor ("na prática", "fazemos assim", bullets) vira 1 item em `behaviors` com `value_title` exato; "não assim"/"o que não significa" vai em `below`; `in_practice` do valor limitado a uma frase; procurar escala numerada/nomeada (1–4, "Não atende… Supera") em qualquer documento e devolver em ordem crescente; meta de 2 a 8 comportamentos por valor quando o material permitir. Rodar `regen-docs` para atualizar `docs.generated.ts`.
- `extract-org-context/index.ts`: descrições do tool schema reforçando o mesmo; `scale_levels` ganha campo `order` para ordenar; matching de `value_title` ao valor tolerante (normalizado, com fallback por "contém"); se a IA devolver valores mas zero comportamentos com material rico, fazer uma segunda chamada focada só em comportamentos+régua.
- Ao reextrair, comportamentos e níveis não editados à mão são atualizados; nada editado manualmente é sobrescrito (regra atual mantida).
- Teste Deno do ordenamento da régua e do vínculo comportamento→valor; deploy da função.
