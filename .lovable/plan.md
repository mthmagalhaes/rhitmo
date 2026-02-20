
## Indicador de Saude de Acompanhamento no TeamMemberCard

### Resumo

Adicionar um circulo colorido de 8px no canto superior direito de cada card de membro, indicando ha quantos dias o lider nao registra uma nota. O tooltip mostra a mensagem contextual.

### Implementacao

**Arquivo: `src/components/TeamMemberCard.tsx`**

1. Importar `differenceInDays` de `date-fns` e os componentes `Tooltip`, `TooltipTrigger`, `TooltipContent`, `TooltipProvider` de `@/components/ui/tooltip`

2. Calcular os dias desde a ultima nota usando `differenceInDays(new Date(), new Date(member.lastFeedback))`

3. Determinar cor e mensagem com base nas regras:
   - `feedbackCount === 0` -> cinza (`bg-muted-foreground/40`) + "Sem notas registradas"
   - `dias <= 7` -> verde (`bg-emerald-500`, usando tom de success) + "Ultima nota ha X dias"
   - `dias 8-14` -> amarelo (`bg-yellow-500`, tom de warning) + "Ultima nota ha X dias"
   - `dias > 14` -> vermelho (`bg-destructive`) + "Ultima nota ha X dias"

4. Posicionar o indicador com `position: relative` no Card (ja implicito) e o circulo com `absolute top-4 right-4` dentro do Card

5. Envolver o circulo em um Tooltip para mostrar a mensagem no hover

### Detalhes Tecnicos

O Card ja tem `relative` implicito por ser um `div`. O indicador sera um `span` com classes:

```text
absolute top-4 right-4 h-2 w-2 rounded-full
```

Mais a classe de cor dinamica. O tooltip usa o componente Shadcn ja existente.

Para o caso de `dias === 0`, a mensagem sera "Ultima nota hoje". Para `dias === 1`, "Ultima nota ha 1 dia".

**Nenhuma alteracao** em outros arquivos. O campo `lastFeedback` e `feedbackCount` ja estao disponiveis na prop `member`.
