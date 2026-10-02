# Central de Conectores (estilo marketplace)

## Objetivo
Transformar o item "Conectores" do menu numa central parecida com a do Notion, Linear e HubSpot. Todas as integrações ficam num só lugar, separadas por categoria, com status e conexão em um clique. Junto, entram os novos note takers.

## O que já existe
- O item "Conectores" já está no menu lateral.
- Granola e Fireflies já funcionam com chave pessoal.
- Google Agenda e Slack ficam escondidos em Configurações.

## Como vai ficar

```text
Conectores
[ Buscar app...                    ]  [Todos] [Conectados] [Note takers] [Agenda] [Comunicação]

Conectados (2)
[Granola  ● Conectado]  [Google Agenda ● Conectado]

Note takers
[Gemini no Meet  Novo]  [tl;dv]  [Fathom]  [Fireflies]  [Granola]
Agenda e reuniões
[Google Agenda]  [Zoom  Em breve]  [Microsoft Teams  Em breve]
Comunicação
[Slack]
Não tem conector? -> Colar transcrição (Magic Paste)
```

- Cada app aparece num cartão com logo, uma frase de benefício, um selo de status (Conectado, Disponível, Em breve, Novo) e o rótulo "Não gasta horas de bot" nos note takers.
- Ao clicar no cartão, abre um painel lateral com o passo a passo, o campo da chave (ou o botão de login do Google), a última sincronização e as opções de sincronizar agora e desconectar.
- Os cartões "Em breve" têm o botão "Quero esse". Cada clique fica registrado, para sabermos a demanda real.
- Granola e Fireflies continuam funcionando como hoje, só mudam de visual.
- O item do menu ganha um contador discreto quando alguma conexão precisa de atenção (chave expirada ou agenda desconectada).

## Novos conectores
1. **Gemini no Google Meet:** lê as anotações automáticas que o Google salva no Drive do líder. Usa o login Google que já existe, com uma permissão a mais (somente leitura das anotações do Meet).
2. **tl;dv:** funciona com chave pessoal, como o Granola. Exige plano pago do tl;dv, e o cartão avisa isso.
3. **Fathom:** funciona com chave pessoal, como o Granola.
4. **Zoom e Microsoft Teams:** entram como "Em breve" e servem para medir interesse.

Todos os novos aproveitam o que já existe: a sincronização a cada 30 minutos, o reconhecimento do liderado pelo título, a atribuição automática com opção de corrigir e o botão Importar em Anotações & Evidências.

## Pontos de atenção
- Para ler as anotações do Meet, o Google pode exigir uma nova revisão do app de login. Até ela sair, o conector funciona para até 100 usuários de teste. Se a revisão demorar, o cartão aparece como "Beta".
- As anotações do Gemini só existem para quem tem Google Workspace com Gemini ativo. O cartão explica isso.
- Configurações deixa de mostrar Agenda, Slack e note takers e passa a ter um link para a Central de Conectores.

## Detalhes técnicos
- `src/lib/connectorsCatalog.ts`: um catálogo único com id, categoria, tipo (byok | google_oauth | slack | coming_soon), status e logo. Ele substitui o uso direto de `NOTE_TAKER_PROVIDERS` na página.
- Reescrita de `src/pages/v2/Conectores.tsx` (rota `/lider/conectores`): busca, chips de filtro, seções por categoria, `ConnectorTile` e `ConnectorDetailSheet`. Os cards de Granola e Fireflies passam a ser reaproveitados dentro do sheet.
- Em `_shared/notetakers/`, entram os adapters `tldv.ts` (API pública, x-api-key, meetings + transcript) e `fathom.ts` (API externa, X-Api-Key, meetings com transcript/summary), registrados em `index.ts`. O tipo `NoteTakerProviderId` passa a incluir `tldv | fathom`.
- Adapter `google_meet.ts`: Meet REST API (`conferenceRecords` → `transcripts`/`smartNotes`) mais o export de docs pelo Drive, com o refresh token do `google-calendar-oauth`. Novo escopo, `meetings.space.readonly` + `drive.meet.readonly`, e fluxo de "reautorizar Google" quando o escopo estiver faltando.
- Migração: a tabela `connector_interest (user_id, connector_id, created_at)` com GRANT e RLS (só o próprio usuário insere e lê). A coluna `provider` passa a aceitar os novos valores, caso exista um check.
- Contador no menu: um hook `useConnectorHealth` (conexões com erro ou `needs_reconnect`) mostrado em `navigation.ts`.
- Deploy de `note-taker-connect` e `sync-note-taker`.
