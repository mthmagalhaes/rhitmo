# Deixar claro o que cada seletor faz nas Próximas 1:1s

Hoje o card tem dois controles que parecem a mesma coisa. O rótulo "Transcrição automática" fica na esquerda e o toggle correspondente na direita, colado no link "Chamar bot em outra reunião" — o que faz o toggle parecer pertencer ao link. Nas linhas de reunião de equipe há um segundo toggle, sem explicação do porquê só aparece ali.

## O que muda

**1. Toggle global junto do rótulo**

O interruptor de transcrição automática passa a ficar imediatamente ao lado de "Transcrição automática", com uma linha de apoio:

- Título: "Transcrição automática"
- Apoio: "O bot entra sozinho nas suas 1:1s da agenda."

**2. "Chamar bot em outra reunião" vira ação separada**

Sai do agrupamento com o toggle e passa a ser um botão discreto alinhado à direita, com tooltip: "Reunião fora da agenda ou já em andamento? Cole o link e o bot entra agora."

**3. Microcopy no toggle das reuniões de equipe**

Nas linhas com badge "Equipe", o rótulo passa a explicar a exceção:

- Desligado: "Sem bot" com tooltip "Reuniões de equipe não recebem bot automático. Ative para transcrever esta."
- Ligado: "Transcrever esta"

**4. Nota de rodapé no card**

Uma linha discreta abaixo da lista: "Reuniões de equipe precisam ser ativadas uma a uma."

## Detalhes técnicos

Alteração restrita a `src/components/dashboard/UpcomingMeetingsCard.tsx` (bloco do cabeçalho de transcrição, linhas ~278-298, e o bloco do toggle por reunião, ~356-373) e ao texto do gatilho em `src/components/dashboard/AdHocBotDialog.tsx`. Nenhuma mudança de comportamento, mutations ou backend: só reposicionamento e texto, usando `Tooltip` do shadcn já disponível no projeto.
