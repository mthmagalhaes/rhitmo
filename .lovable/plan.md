# Trocar "Transcrição automática" por "Google Calendar" na sidebar

## Mudança

Na seção **Integrações** da sidebar lateral (`AppSidebar.tsx`), o botão atual abre a Central de Conhecimento explicando o recurso. Vamos transformá-lo em um **conector direto** do Google Calendar — alinhado ao padrão do botão Slack ao lado.  
  
Garante que o Google Calendar tenha o logo real da Google Calendar

## Comportamento novo

- **Label**: "Google Calendar" (em vez de "Transcrição automática")
- **Ícone**: `Calendar` do lucide-react (em vez de `FileAudio`), mantendo o `text-primary`
- **Ação ao clicar**:
  - Se **não conectado** → dispara `connectCalendar()` do `useCalendarIntegration` (redireciona para o OAuth do Google)
  - Se **já conectado** → navega para `/help#l-auto-transcription` (Central de Conhecimento, onde o usuário pode ver detalhes e gerenciar)
- **Indicador visual**: badge sutil "Conectado" (verde, mesmo padrão do card de integrações em Billing) quando `isConnected === true`

## Arquivos modificados

1. `**src/components/AppSidebar.tsx**`
  - Trocar import `FileAudio` → `Calendar`
  - Usar hook `useCalendarIntegration()` para obter `isConnected` e `connectCalendar`
  - Atualizar o botão (linhas 258-264) com lógica condicional de clique e badge "Conectado"
  - Trocar `t('sidebar.autoTranscription')` → `t('sidebar.googleCalendar')`
2. `**src/i18n/locales/pt-BR.json**`, `**en.json**`, `**es.json**`
  - Adicionar nova chave `sidebar.googleCalendar`:
    - PT-BR: "Google Calendar"
    - EN: "Google Calendar"
    - ES: "Google Calendar"
  - Adicionar `sidebar.connected`: "Conectado" / "Connected" / "Conectado"
  - Manter `autoTranscription` (ainda usado em outros lugares)

## O que NÃO muda

- Card "Próximas Reuniões" no dashboard (`UpcomingMeetingsCard.tsx`) continua com seu próprio toggle "Transcrição automática"
- Página da Central de Conhecimento (`HelpCenter.tsx`) e seu artigo `l-auto-transcription` permanecem
- Botão Slack ao lado fica idêntico
- Hook `useCalendarIntegration` já existe e expõe tudo que precisamos — sem alterações

## Validação

- Usuário sem Calendar conectado: clicar no botão deve abrir o consent screen do Google
- Usuário já conectado: clicar deve levar para `/help#l-auto-transcription` e mostrar badge "Conectado" verde
- Verificar nos 3 idiomas (PT-BR / EN / ES)