# Consistência do nome "Anotações & Evidências"

A troca no menu esquerdo não quebra nada funcional: a rota continua sendo `/lider/diario`, a chave de tradução continua `nav.lider.diario` e as tabelas/queries não usam o rótulo. O que sobrou é **inconsistência de nome** em ~20 pontos onde o usuário ainda lê "Diário de Bordo" — inclusive em telas do RH, no tour de onboarding, no Slack e nas respostas da IA.

## O que ajustar

**Telas do líder**
- Atalho "Diário de bordo" no painel do liderado (MemberAdminSheet)
- Tour de onboarding do líder: título e texto do passo 2
- Mentor Chat: filtro de contexto "Apenas notas/diário"
- Página de Contexto: descrição da timeline
- Gravador de reunião: mensagens de sucesso
- Card de transcrições pendentes: texto de reprocessamento
- Configurações do Slack ambiente: "Frequência do resumo no Diário"
- Chips de evidência nos recaps
- Rótulo "Diário" na legenda de fontes de contexto

**Telas do RH**
- Preview das telas do líder (título, card de exemplo e aviso de privacidade)
- Página BP Rhythm: "diários dos líderes"

**Billing / Landing**
- Item de plano "Diário de bordo + resumo mensal automático"

**Slack e IA (Edge Functions)**
- Descrições de comandos em `_shared/slackCommands.ts`
- Textos do `slack-bot`, `slack-weekly-rollup`, `summarize-transcript`, `noteTakerSync`
- Documento de alma `channels/whatsapp.md` (e regeneração de `docs.generated.ts`), para a IA nunca mais dizer "diário de bordo" ao usuário

**Traduções**
- `en.json`: `nav.lider.diario` → "Notes & Evidence"
- `es.json`: `nav.lider.diario` e `diary` → "Notas y Evidencias"

## Notas técnicas

- Rota, chaves i18n, nomes de arquivos (`src/components/leader/diario/*`) e query keys ficam como estão — renomear isso traria risco sem ganho visível.
- Apenas strings visíveis ao usuário mudam; nenhuma lógica, RLS ou schema é tocada.
- Após editar `soul/channels/whatsapp.md`, o arquivo gerado `docs.generated.ts` precisa ser atualizado no mesmo passo para a mudança valer nas Edge Functions.
