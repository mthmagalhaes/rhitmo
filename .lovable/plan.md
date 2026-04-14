

## Plano: "Esqueci minha senha" — Fluxo Completo

### O que será feito

1. **Link "Esqueci minha senha"** no formulário de login (`Auth.tsx`)
   - Abaixo do campo de senha, adicionar um link que alterna para um mini-formulário de "recuperação"
   - O usuário digita o email e clica "Enviar link de recuperação"
   - Chama `supabase.auth.resetPasswordForEmail(email, { redirectTo: origin + '/reset-password' })`
   - Exibe toast de confirmação

2. **Página `/reset-password`** (novo arquivo `src/pages/ResetPassword.tsx`)
   - Detecta `type=recovery` no hash da URL (Supabase redireciona com isso)
   - Exibe formulário para definir nova senha (reutiliza o visual do Auth — split screen com RhythmWave)
   - Chama `supabase.auth.updateUser({ password })` para salvar
   - Após sucesso, redireciona para `/dashboard`

3. **Rota no `App.tsx`**
   - Adicionar `<Route path="/reset-password" element={<ResetPassword />} />` como rota pública

### Arquivos a modificar

| Arquivo | Mudança |
|---------|---------|
| `src/components/Auth.tsx` | Adicionar estado `isForgotPassword`, mini-formulário de recuperação, link "Esqueci minha senha" |
| `src/pages/ResetPassword.tsx` | **Novo** — página de redefinição de senha |
| `src/App.tsx` | Adicionar rota `/reset-password` |

### Resultado
- Login → "Esqueci minha senha" → digita email → recebe email (já usa o template `recovery.tsx` existente) → clica no link → página `/reset-password` → define nova senha → redirecionado ao dashboard.

