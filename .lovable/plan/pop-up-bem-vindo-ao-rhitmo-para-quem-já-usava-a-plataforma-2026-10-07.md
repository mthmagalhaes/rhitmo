# Pop-up "Bem-vindo ao Rhitmo" para quem já usava a plataforma

## O que descobri
Não é falha. A conta mth.magalhaes@gmail.com não está ligada a nenhuma empresa hoje: não é dona de empresa, não lidera time, não é liderado e não tem convite pendente. O último acesso antes de hoje foi em maio. A empresa que ela usava foi apagada ou trocou de dono, por isso o sistema trata a conta como cadastro novo e pede o nome da empresa.

O que aparece por trás do pop-up também está vazio: "Workspace", 0 liderados, 0 reuniões. É só a moldura da tela, sem nenhum dado salvo.

O que assusta é o texto: ele fala com um cliente novo e não com quem já usou a Rhitmo, e não deixa outra saída além de criar uma empresa.

## O que vou mudar
1. **Texto que muda conforme a conta**:
   - Conta criada hoje: mantém as boas-vindas.
   - Conta antiga sem empresa: "Sua conta não está ligada a nenhuma empresa no momento", com o e-mail visível, para a pessoa notar se entrou com a conta errada.
2. **Três saídas no pop-up**:
   - "Criar minha empresa" (o fluxo de hoje).
   - "Fui convidado por alguém": explica que basta pedir um novo convite para este e-mail.
   - "Entrar com outra conta": sai da conta atual e volta para o login.
3. **Tela de fundo desfocada** enquanto o pop-up estiver aberto, para não parecer que já existe uma configuração por trás.
4. **Termos do produto**: "empresa" em vez de "workspace", sem emoji, no estilo creme da Rhitmo.

Nenhuma mudança em dados ou permissões.

## Para a sua conta pessoal
Se essa conta deveria estar na Faster ou em outra empresa, me diga qual. Eu confiro se existe um convite antigo para ela, ou você usa a matheus.magalhaes@fstr.co, que está ligada normalmente.

## Detalhes técnicos
- `src/components/WorkspaceOnboarding.tsx`: recebe `user.created_at` e `email`; conta com mais de 24h usa o texto de "conta sem empresa"; botões para `supabase.auth.signOut()` e para as instruções de convite.
- `src/components/AppLayout.tsx`: passa os dados da conta e aplica `blur-sm pointer-events-none` no conteúdo enquanto `needsWorkspaceSetup` estiver ativo.
- Conferência visual entrando com uma conta sem empresa.
