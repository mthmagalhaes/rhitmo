

## Adicionar SELECT policy para linked members na tabela goals

### Resumo

Criar uma migration com uma unica policy de SELECT na tabela `goals` que permite membros vinculados (`linked_user_id`) verem seus proprios goals.

### Migration SQL

```text
CREATE POLICY "Linked members can view own goals"
ON public.goals FOR SELECT TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.team_members tm
    WHERE tm.id = goals.member_id
      AND tm.linked_user_id = auth.uid()
  )
);
```

### O que muda

- Uma nova policy RESTRICTIVE de SELECT na tabela `goals`
- Permite que um usuario autenticado cujo `auth.uid()` corresponda ao `linked_user_id` de um `team_member` veja os goals daquele membro

### O que NAO muda

- As 4 policies existentes de owner (SELECT, INSERT, UPDATE, DELETE)
- Nenhum componente de frontend
- Nenhuma outra tabela ou schema

