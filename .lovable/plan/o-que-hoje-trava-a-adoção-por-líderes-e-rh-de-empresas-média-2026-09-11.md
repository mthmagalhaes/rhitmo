# O que hoje trava a adoção por líderes e RH de empresas médias e grandes

Diagnóstico feito agora sobre o app real: varredura de segurança, políticas de acesso ao banco, funções de servidor, textos legais e telas de configuração. O produto não tem falha grave aberta. O que falta é a camada de confiança que uma área de TI/Segurança e um jurídico exigem antes de aprovar uma ferramenta que lê 1:1s, transcrições e avaliações.

## O que já está bem

- Todos os dados ficam isolados por empresa, com regras de acesso no próprio banco (não só na tela).
- Notas privadas do líder só viram compartilhadas por ação explícita; transcrição bruta nunca vai para o liderado.
- A rede de colaboração mostra só intensidade, nunca conteúdo de mensagem.
- Política de Privacidade em LGPD, com base legal, direitos do titular e contato do encarregado.
- Acesso de super admin a contas de cliente já é registrado em trilha de auditoria.
- A varredura de segurança automática não encontrou nenhum problema de nível alto.

## Os cinco bloqueios reais

### 1. Login corporativo (o bloqueio nº 1)
Hoje só existe e-mail/senha e Google. Empresa média/grande exige entrar pelo provedor de identidade da companhia (Microsoft Entra/Okta) e, idealmente, provisionamento automático de usuários. Sem isso, TI barra na primeira reunião.
Encaminhamento: habilitar login por SSO corporativo por empresa, com Microsoft como primeiro alvo; provisionamento automático fica para depois.

### 2. Segundo fator e política de senha
Não há verificação em duas etapas nem bloqueio de senhas vazadas. Para uma ferramenta com conteúdo de avaliação de pessoas, isso costuma ser item de checklist.
Encaminhamento: ligar proteção contra senha vazada e oferecer verificação em duas etapas opcional (obrigatória para donos de conta e RH).

### 3. Trilha de auditoria visível para o cliente
Existe registro de acesso do nosso time, mas o cliente não consegue ver quem, dentro da empresa dele, leu ou exportou dados sensíveis. RH pergunta isso sempre.
Encaminhamento: registrar acessos e exportações sensíveis e criar uma tela de auditoria para o dono da conta.

### 4. Ciclo de vida do dado nas mãos do cliente
Não há, no app, exportação completa dos dados da empresa, exclusão de conta/colaborador com prazo definido, nem escolha de por quanto tempo guardar transcrições. Gravações têm limpeza automática, mas o restante é implícito.
Encaminhamento: painel de dados com exportação completa, exclusão sob demanda e escolha de retenção de transcrições.

### 5. Pacote de confiança
Falta a documentação que o jurídico e a segurança pedem antes do piloto: contrato de tratamento de dados, lista de fornecedores usados (IA, transcrição, e-mail, Slack), onde o dado fica hospedado, o que a IA faz e não faz com o conteúdo, e um resumo de práticas de segurança.
Encaminhamento: uma página pública de Confiança e Segurança mais o contrato de tratamento de dados pronto para assinar.

## Um ajuste técnico pontual encontrado

A visibilidade da rede de colaboração permite que um líder veja a intensidade de relação quando apenas uma das duas pessoas é do time dele. Não expõe conteúdo, mas expõe padrão de relacionamento de gente que ele não gerencia. Vale restringir ou anonimizar a contraparte.

## Ordem sugerida

1. Pacote de confiança e ajuste da rede (rápido, destrava conversa comercial).
2. Segundo fator e política de senha.
3. Trilha de auditoria para o cliente.
4. Painel de dados: exportação, exclusão e retenção.
5. Login corporativo por SSO.

## Detalhes técnicos

- SSO: Supabase SAML por domínio de e-mail, mapeando para workspace; SCIM fica fora do primeiro corte.
- MFA: `supabase.auth.mfa` (TOTP) + `configure_auth` para senha vazada/força mínima; enforcement por papel no `AccountContext`.
- Auditoria: nova tabela `access_audit_log` (ator, workspace, recurso, ação, timestamp) alimentada por triggers/edge nas leituras sensíveis (transcrições, reviews, exportações CSV) + tela em `/hr`.
- Retenção: coluna de política em `workspaces` + cron reaproveitando o padrão de `purge-recall-recordings`.
- Rede: endurecer `can_view_network_pair` (exigir ambos os endpoints sob gestão do líder ou anonimizar a contraparte).
- Revisar as 34 funções com `verify_jwt = false`: separar as legítimas (webhooks Stripe/Recall/Slack, OAuth, crons com segredo) das que dependem só de checagem interna, e documentar cada uma.
