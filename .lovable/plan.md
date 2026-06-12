## Padronizar eyebrows de seção da landing

Hoje os "eyebrows" (rótulos curtos antes do H2 de cada seção) usam padrões diferentes em cada lugar — tamanho, peso, tracking e cor variam, então o olho não reconhece "começou uma seção nova". Vamos unificar num único padrão editorial discreto mas inconfundível.

### Diagnóstico (variações atuais)
- `Plano` (Landing.tsx:781): `text-xs font-semibold tracking-widest text-primary`
- `Como funciona` (SarahJourneySection.tsx:217): `text-[11px] tracking-[0.25em] font-semibold text-slate-500`
- `Impacto mensurável` (Landing.tsx:1296): `text-[10px] tracking-[0.3em] font-bold text-indigo-500`
- `Para Líderes / Pessoas / RH` (Landing.tsx:1364/1383/1400): `text-xs font-bold tracking-[0.25em]` em indigo-600 / emerald-600 / slate-600, com ícone Lucide colado
- `FAQ` (Landing.tsx:1424): `text-[10px] tracking-[0.3em] font-bold text-indigo-500`

Cinco variações para o mesmo papel visual.

### Padrão único proposto

Um eyebrow com **marcador gráfico** (linha curta + label) que sinaliza inequivocamente "nova seção", mas continua leve e editorial:

```text
———— SECTION LABEL
```

Especificação:
- Container: `inline-flex items-center gap-3`
- Linha: `h-px w-8 bg-slate-300` (linha fina à esquerda, como serifa editorial)
- Texto: `text-[11px] font-semibold uppercase tracking-[0.28em] text-slate-500`
- Margem inferior: `mb-5` (antes do H2)

Esse marcador resolve o problema central — quando o usuário rola e cruza um eyebrow, a linha curta funciona como "régua de capítulo" e o cérebro registra "mudei de assunto", sem gritar.

### Variante para sub-seções de persona

Para os blocos `Para Líderes / Para Pessoas Lideradas / Para RH`, **mantemos a cor de acento** (indigo / emerald / slate) porque ela codifica significado dentro do mesmo bloco "Impacto mensurável", mas alinhamos com o padrão:
- Mesma estrutura (linha + label uppercase)
- Linha + texto na cor de acento da persona (`bg-indigo-300` + `text-indigo-700`, etc.)
- Ícone Lucide permanece, posicionado **depois** da linha e antes do texto, `h-3 w-3`

### Onde aplicar (apenas eyebrows, não tocar nos H2)

| Local | Arquivo |
|---|---|
| Plano | `src/pages/Landing.tsx:780-783` |
| Como funciona | `src/components/landing/SarahJourneySection.tsx:217-219` |
| Impacto mensurável | `src/pages/Landing.tsx:1295-1297` |
| Para Líderes | `src/pages/Landing.tsx:1363-1366` (acento indigo) |
| Para Pessoas Lideradas | `src/pages/Landing.tsx:1382-1385` (acento emerald) |
| Para RH | `src/pages/Landing.tsx:1399-1402` (acento slate) |
| FAQ | `src/pages/Landing.tsx:1423-1425` |

### Implementação

Edição inline em cada local (substituir o `<p>` ou `<span>` atual pelo bloco com linha + label). Sem criar componente novo — são 7 ocorrências e o markup é curto, mantém o arquivo legível. Nenhum H2, subtítulo, layout, ou conteúdo é alterado.

### Fora de escopo
- Não mexer nos H2 das seções
- Não trocar cores de acento das personas
- Não alterar espaçamento de seção nem fundos