## Diagnóstico

Hoje `/lider/mentor` tem dois problemas de respiração:

1. **Coluna principal travada em `max-w-2xl` (≈672px) sem `mx-auto`** — fica colada à esquerda. Como o `main` é `flex-1`, sobra uma faixa vazia entre o conteúdo e o aside de 340px.
2. **Sugestões em flex-wrap** ficam em 1–2 chips por linha numa largura "magra", desperdiçando espaço horizontal.
3. O aside já está bom (Contexto + Como obter o melhor + Atalhos), só não tem nada que "puxe a vista" pra baixo.

## Mudanças (frontend, `src/pages/lider/Mentor.tsx`)

### 1. Coluna central com mais respiro e centralizada
- Alterar o wrapper interno do `<main>` (linha 226) de `max-w-2xl px-6 lg:px-8 py-8` para **`max-w-3xl mx-auto px-6 lg:px-8 py-8`**.
- O parágrafo de subtítulo (linha 236) já usa `max-w-2xl` — manter para não esticar texto longo.

### 2. Sugestões em grid 2 colunas (com fallback mobile)
- Trocar o `flex flex-wrap gap-2` por **`grid grid-cols-1 sm:grid-cols-2 gap-2`**.
- Tornar cada chip `w-full text-left` para preencher a célula uniformemente (continua com o estilo arredondado, ícone à esquerda).
- Resultado: 3 linhas × 2 colunas, alinhadas, ocupando toda a largura disponível.

### 3. Composer e Conversas recentes
- Composer e a lista de conversas já são `w-full` — passam a se beneficiar automaticamente da nova `max-w-3xl`.
- Nenhuma mudança em altura/padding.

### 4. Aside (mantém estrutura, só melhora densidade)
- Sem novos cards. Apenas pequeno ajuste: o `<div className="px-5 py-8">` (linha 569) ganha `space-y-5` se `MentorContextPanel` ainda não impõe espaçamento próprio (verificar no momento da edição; se já houver, manter).

## Fora de escopo
- Não muda a lógica do chat, do RAG, dos atalhos nem do `MentorContextPanel`.
- Não mexe em `MentorThread.tsx` (página da thread).
- Não cria novos componentes/cards no aside.

## Validação
- No viewport atual do usuário (869×829), conteúdo central deve ficar visualmente equilibrado entre sidebar esquerda e aside direita, sem a faixa vazia atual.
- Em ≥1280px, as sugestões mostram 2 colunas; em <640px, voltam a 1 coluna.
- Nenhum overflow horizontal.
