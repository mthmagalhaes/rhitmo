

## Correção do Google SSO Login

### Problema

O `Auth.tsx` usa `supabase.auth.signInWithOAuth({ provider: 'google' })` diretamente. No Lovable Cloud, isso não funciona corretamente — é necessário usar o módulo gerenciado `lovable.auth.signInWithOAuth("google", ...)`.

O diretório `src/integrations/lovable/` não existe ainda, o que confirma que o módulo Cloud Auth nunca foi configurado.

### Solução

1. **Configurar Social Login** via a ferramenta `configure-social-auth` do Lovable Cloud, que gera automaticamente o módulo em `src/integrations/lovable/` e instala o pacote `@lovable.dev/cloud-auth-js`.

2. **Atualizar `src/components/Auth.tsx`**: Substituir a chamada direta ao Supabase pela chamada gerenciada:

   **Antes:**
   ```typescript
   const { error } = await supabase.auth.signInWithOAuth({
     provider: 'google',
     options: { redirectTo: `${window.location.origin}/dashboard` }
   });
   ```

   **Depois:**
   ```typescript
   import { lovable } from "@/integrations/lovable/index";
   // ...
   const { error } = await lovable.auth.signInWithOAuth("google", {
     redirect_uri: window.location.origin,
   });
   ```

### Escopo

| Arquivo | Alteração |
|---------|-----------|
| src/integrations/lovable/ | Gerado automaticamente pela ferramenta |
| src/components/Auth.tsx | Substituir `supabase.auth.signInWithOAuth` por `lovable.auth.signInWithOAuth` |

Nenhuma outra alteração. O fluxo de email/senha permanece usando o Supabase client normalmente.

### Nota importante

O Google Calendar OAuth (dedicado, com `calendar.readonly` scope) **não é afetado** por essa mudança — ele usa um fluxo OAuth completamente separado via Edge Function.

