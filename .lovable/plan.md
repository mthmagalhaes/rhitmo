

# Slack aparece como "não conectado" no primeiro momento — fix para todos os usuários

## Diagnóstico

O botão **Conector Slack** na sidebar (`AppSidebar.tsx`, linhas 293-299) é o único ponto que o usuário vê **antes** de abrir o diálogo. Hoje ele **não consulta** o status da conexão — sempre renderiza sem badge, parecendo desconectado, mesmo quando o `slack_integrations` já existe no banco.

Comparativo:
- ✅ **Google Calendar** (linha 287-291): renderiza badge "CONECTADO" quando `calendarConnected === true`.
- ❌ **Slack** (linha 293-299): nunca renderiza badge. Status só aparece **dentro** do diálogo, depois de o usuário clicar.

Bônus: o hook `useSlackConnection` usa `useAuth().user.id` direto, enquanto o resto do app (calendar, etc.) usa `useEffectiveUser()` para respeitar impersonação de admin. Pequena inconsistência que vale alinhar.

## Mudanças (3 arquivos)

### 1. `src/components/AppSidebar.tsx`

- Importar `useSlackConnection`.
- Após `useCalendarIntegration`, ler `const { isConnected: slackConnected, isLoading: slackLoading } = useSlackConnection();`.
- No botão Slack (linha 293), espelhar o padrão do Google Calendar:
  - Adicionar `flex-1 text-left` no `<span>` do nome (paridade visual).
  - Renderizar o badge "CONECTADO" quando `slackConnected && !slackLoading`, usando exatamente o mesmo estilo do badge do Calendar (verde esmeralda, `t('sidebar.connected')`).
- Não mostrar nada (nem "desconectado", nem skeleton) durante `slackLoading` — evita flash incorreto. O badge aparece quando confirmado.

### 2. `src/hooks/useSlackConnection.ts`

- Trocar `useAuth` por `useEffectiveUser` (consistência com calendar e correto sob impersonação de admin).
- Manter o restante intacto. `staleTime` de 60s já é razoável.

### 3. `src/components/slack/SlackConnectorDialog.tsx`

- Pequeno polish: enquanto `isLoading` for true, desabilitar o botão "Conectar/Reconectar" e ocultar o aviso de "Slack conectado com sucesso!" (que hoje aparece como "não conectado" durante o fetch). Trivial — adicionar `if (isLoading) return <Loader2 spinning/>` no ramo de status no topo do conteúdo.

## O que NÃO mudo

- `useSlackConnection` query key e tabela: corretas.
- Badge styling: reuso exato do padrão do Calendar (sem desviar do Design System).
- RLS, edge functions, OAuth: fora do escopo — não há problema lá, apenas UX.
- i18n: chaves `sidebar.connected` e `sidebar.slackConnector` já existem em PT/EN/ES.

## Critério de aceite

- [ ] Usuário com `slack_integrations` populado vê badge "CONECTADO" no botão Slack da sidebar **antes** de abrir o diálogo.
- [ ] Usuário sem conexão vê o botão sem badge (estado atual preservado).
- [ ] Durante o fetch inicial, nenhum estado "errado" pisca — badge aparece só quando confirmado.
- [ ] Admin impersonando outro usuário vê o status do Slack do **usuário impersonado**, não o próprio.
- [ ] Diálogo do Slack mostra loader enquanto verifica, não o ramo "Conectar" antes da confirmação.

