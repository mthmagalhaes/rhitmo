# Três avisos do monitoramento: vale corrigir os três

Conferi os três no código. Todos são reais e nenhum deles apaga dados: são falhas de navegação, de exportação e de atualização de tela. Nenhum usuário, permissão ou controle de acesso é perdido em nenhum dos casos, e as correções propostas também não mexem em regras de acesso.

## 1. Botão "Conectar" do Slack na lista de primeiros passos do RH (corrigir)

Na tela inicial do RH, o passo do Slack manda a pessoa para uma tela que só líderes podem abrir. Quem é RH e não é dono da empresa é devolvido para a mesma tela de origem, e o passo nunca sai de "pendente".

Correção: levar esse passo para o lugar onde o RH realmente configura o Slack (o card de Slack dentro das configurações acessíveis ao RH). Se a pessoa também for líder, o caminho atual continua funcionando.

Risco de perder algo: nenhum. É só o destino de um botão.

## 2. Exportação de pessoas na Governança sai sem nome e sem cargo (corrigir)

O arquivo exportado hoje traz só e-mail, time e situação; as colunas de nome e cargo saem vazias, porque o relatório lê campos com nomes diferentes dos que o banco devolve.

Correção: ler os campos certos (nome completo e papéis da pessoa) e montar a coluna de cargo a partir da lista de papéis, como já é feito na tela de Pessoas.

Risco: nenhum. A consulta e as permissões continuam as mesmas; muda só como o arquivo é escrito.

## 3. Listas mostrando dados velhos depois de uma mudança (corrigir com cuidado)

Para deixar o app mais rápido, os dados passaram a ser considerados frescos por 5 minutos e as telas deixaram de recarregar ao voltar para elas. O efeito colateral: quando um líder cria um time em Pessoas, a lista e o filtro de times podem continuar sem o time novo por alguns minutos, dando a impressão de que não salvou.

Correção mínima, sem desfazer o ganho de velocidade:
- Incluir a lista de times do líder no conjunto de chaves que são atualizadas após criar, editar ou excluir.
- Fazer o bloco de times usar esse mesmo caminho de atualização, em vez da lista própria e incompleta que ele usa hoje.

Mantenho os 5 minutos e o não recarregar ao navegar; o que muda é que toda ação do próprio usuário passa a atualizar a tela na hora.

Risco de perder algo: nenhum. Atualizar a tela nunca apaga dado; o risco atual é o oposto, de a pessoa repetir a ação achando que não funcionou.

## Detalhes técnicos

- `HRSetupChecklist.tsx`: trocar `navigate('/lider/configuracoes?tab=integracoes')` por rota permitida ao persona `hr_admin` (guard em `RoleRouteGuard` redireciona para `/hr`).
- `HRGovernanca.tsx` `exportPeople()`: usar `full_name` e `roles: string[]` do RPC `get_workspace_people` (hoje lê `name`/`member_name`/`role`, inexistentes).
- `queryKeys.ts`: adicionar `teams-leader-scope` a `LEADER_PEOPLE_KEYS`; `Pessoas.tsx` (bloco de times, linha ~683) passa a chamar `invalidateLeaderPeople(qc)` em vez de invalidar três chaves soltas.
- Sem migração, sem mudança de RLS, sem mudança nos padrões do QueryClient.
