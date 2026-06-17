Tornar o botão "Chamar bot agora" (ícone de microfone) sempre visível no card de próximas 1:1s, em vez de aparecer só no hover.

## Mudança
Em `src/components/dashboard/UpcomingMeetingsCard.tsx`, no botão de microfone (linhas ~385-395):
- Remover as classes `opacity-0 group-hover:opacity-100 transition-opacity` para que o ícone fique fixo ao lado do badge "Auto ✓" e do link externo.
- Manter o `Tooltip` já existente ("Chamar bot agora — útil se ele não entrou ou foi removido") que abre ao passar o mouse sobre o ícone, exatamente como o usuário pediu.
- Manter um leve `text-muted-foreground hover:text-primary` para que o ícone continue discreto e não compita visualmente com o badge de status.

Nenhuma mudança em lógica, condições de exibição (continua oculto quando `bot.status` é `recording`/`done` ou sem `meet_link`) ou backend.
