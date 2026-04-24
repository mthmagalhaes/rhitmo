## Deletar usuário `my@rhitmo.co`

**Contexto:** Usuário existe (ID `d3f9c74c-d64d-4e90-b007-1f4b836224e6`) mas não tem dados associados (0 workspaces, times, feedbacks ou tokens Google). Deleção é segura.

## Execução

Criar uma migration única com:

```sql
DELETE FROM auth.users WHERE id = 'd3f9c74c-d64d-4e90-b007-1f4b836224e6';
```

O `ON DELETE CASCADE` cuida das tabelas relacionadas (identities, sessions, refresh_tokens, profiles, user_roles).

## Validação pós-deleção

Rodar query de verificação:
```sql
SELECT id, email FROM auth.users WHERE email = 'my@rhitmo.co';
```

Esperado: 0 linhas. Email liberado para cadastro novo via fluxo OAuth do Google.

## Próximo passo (você)

1. Ir em `https://rhitmo.co` (ou app-rhitmo.lovable.app)
2. Clicar em "Entrar com Google"
3. Escolher `my@rhitmo.co`
4. Passar pelo fluxo de consentimento OAuth → este é o momento de **gravar o vídeo** que falta pra Central de Verificação do Google
