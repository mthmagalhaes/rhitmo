
Objetivo: resolver o problema do “Copiar Token” pela arquitetura do fluxo da extensão, não por CSS/z-index.

O que encontrei
- Hoje existem 2 fluxos diferentes para a mesma tarefa:
  - `src/components/AppSidebar.tsx`: modal da extensão com helper próprio de cópia
  - `src/components/ProfileSettingsDialog.tsx`: cópia direta com `navigator.clipboard.writeText`
- Isso já mostra drift de implementação: qualquer correção feita num lugar não garante o outro.
- No modal do sidebar, o botão já é um `Button` normal dentro de `Dialog`; pelo código e pela ausência de erros de runtime, isso não parece ser só “botão sem clique”.
- O fallback atual usa `window.prompt`, que é frágil em preview/iframe e ruim para suporte.
- A raiz mais séria: a extensão depende do `access_token` da sessão web. Isso é frágil por expiração, opaco para o usuário e difícil de diagnosticar.
- Há mais um sinal de drift end-to-end: `extension/offscreen.js` envia `audio`, mas `upload-meeting` espera `file`.

Plano
1. Unificar a jornada da extensão
- Criar um componente/hook compartilhado para:
  - baixar ZIP
  - obter token
  - copiar token
  - mostrar instruções
- Reusar no menu lateral e em configurações.
- Remover lógica duplicada de cópia.

2. Trocar “copiar access token da sessão” por “token dedicado da extensão”
- Criar uma tabela própria para tokens da extensão, com:
  - `user_id uuid` (sem FK para `auth.users`)
  - hash do token
  - `created_at`, `last_used_at`, `revoked_at`
- Criar uma função backend para gerar/rotacionar o token e devolver o valor apenas uma vez.
- O botão passa a copiar esse token dedicado, e não mais o JWT bruto da sessão.

3. Tornar o fallback visível e confiável
- No modal, exibir um campo readonly com o token (mascarado por padrão, com “mostrar”).
- O botão “Copiar Token” usa clipboard API, mas se falhar o token continua selecionável/copiável manualmente no próprio modal.
- Remover dependência de `window.prompt`.

4. Alinhar extensão + backend
- Atualizar `extension/popup.js` e `extension/offscreen.js` para o novo token.
- Corrigir o contrato de upload para usar o campo esperado pelo backend (`file`).
- Ajustar `supabase/functions/upload-meeting/index.ts` para aceitar:
  - JWT atual (compatibilidade)
  - novo token da extensão
- Registrar `last_used_at` para diagnóstico.

5. Fechar o loop de suporte
- Exibir estados claros no modal:
  - token copiado
  - token inválido/revogado
  - sessão expirada
- Exibir mensagens melhores no popup da extensão quando a autenticação falhar.
- Atualizar a Central de Conhecimento e os textos dos modais para refletir o fluxo novo.

Detalhes técnicos
- Frontend:
  - refatorar `src/components/AppSidebar.tsx`
  - refatorar `src/components/ProfileSettingsDialog.tsx`
  - criar algo como `src/components/extension/ChromeExtensionSetupDialog.tsx`
  - criar algo como `src/hooks/useExtensionToken.ts`
- Backend:
  - nova migration para tabela de tokens da extensão com RLS e armazenamento por hash
  - nova função backend para gerar/rotacionar token
  - ajuste em `supabase/functions/upload-meeting/index.ts`
- Extensão:
  - atualizar `extension/popup.js`
  - atualizar `extension/offscreen.js`
  - reempacotar `public/rhitmo-recorder-extension.zip`

Critérios de sucesso
- O botão volta a funcionar no preview e no app publicado.
- Mesmo se a cópia automática falhar, o token continua copiável manualmente no modal.
- Não existem mais duas implementações divergentes para esse fluxo.
- A extensão autentica e envia gravações com o contrato correto.
- Usuários já conectados não quebram durante a transição.
