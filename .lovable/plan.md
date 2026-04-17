

# Refinamentos do dashboard do líder

Dois ajustes pontuais no `src/pages/Index.tsx` + a sidebar.

## 1. Substituir "Conector Chrome" por atalho de transcrição

A captura do Chrome é hoje feita pelo bot Recall.ai (entra automaticamente nas reuniões via Google Calendar) — o conector Chrome perdeu o protagonismo como meio de captura. O card `l-auto-transcription` na Central de Conhecimento já documenta tudo (toggle no card de Próximas Reuniões, fluxo do bot, transcrição automática no Diário de Bordo).

**Mudança em `src/components/AppSidebar.tsx` (linhas 254-277, grupo "Conectores"):**

- **Remover** o botão "Conector Chrome" (`setExtensionDialogOpen`).
- **Substituir** por um botão "Transcrição automática" que navega para `/help#l-auto-transcription` (Central de Conhecimento, ancorado no card específico). Ícone: `FileAudio` (já usado lá).
- Manter o botão "Conector Slack" intacto.
- O label do grupo "Conectores" passa a ser "Reuniões" (ou "Integrações") — vou usar **"Integrações"** porque continua valendo para Slack.
- Adicionar suporte a hash anchor no `HelpCenter.tsx`: ao montar, se `location.hash === '#l-auto-transcription'`, fazer scroll suave para o accordion correspondente e abri-lo.

**Limpeza secundária:** o `ChromeExtensionSetupDialog` continua disponível em outros pontos (ex.: Configurações), então **não removo o componente** — apenas tiro o atalho da sidebar. Se nenhum outro ponto chamar, removemos depois (vou checar com `code--search_files` no momento da execução para confirmar).

**Adições à i18n:** novas chaves `sidebar.integrations` e `sidebar.autoTranscription` em PT-BR / EN / ES (replico o padrão das demais chaves do grupo).

## 2. Remover seção "ALERTAS" do dashboard

A seção `Nudges` (linhas 624-642 em `Index.tsx`) duplica exatamente o que já aparece no sino (`ActivitySheet`), que consome a mesma tabela `leader_nudges`.

**Mudança em `src/pages/Index.tsx`:**

- **Remover** o bloco `{nudges.length > 0 && (...)}` (linhas 624-642).
- **Remover** a query `nudges` (linhas 386-401) — não é usada em nenhum outro lugar do arquivo após a remoção.
- **Ajustar** o empty state (linha 750): mudar `meetings.length === 0 && nudges.length === 0` para apenas `meetings.length === 0` (já que nudges deixa de ser referenciado).

O sino no header continua o ponto único de notificações — alinhado com o pedido.

## Arquivos

- `src/components/AppSidebar.tsx` — substituir botão Chrome por "Transcrição automática" com `navigate('/help#l-auto-transcription')`.
- `src/pages/Index.tsx` — remover seção Nudges, query `nudges` e referência no empty state.
- `src/pages/HelpCenter.tsx` — abrir accordion correspondente quando houver hash `#l-auto-transcription`.
- `src/i18n/locales/{pt-BR,en,es}.json` — chaves `sidebar.integrations` e `sidebar.autoTranscription`.

Zero impacto em RLS, rotas, dados ou no `ChromeExtensionSetupDialog` (mantido para outros usos).

