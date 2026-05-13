## O que muda

**Renomeação puramente de UI/copy.** Nenhuma rota, ID, tipo de tabela, campo no banco ou nome de componente muda — só os textos visíveis ao usuário e os ícones de menu. Isso evita risco e mantém a base estável.


| Onde aparece hoje                                           | Vira                                                   |
| ----------------------------------------------------------- | ------------------------------------------------------ |
| Sidebar líder: item "Rhitmo" (→ `/lider/avaliacoes`)        | "Avaliações"                                           |
| Sidebar líder: CTA "Pergunte ao Mentor" (→ `/lider/mentor`) | "Pergunte a Rhitmo"                                    |
| Título do chat no modal/full-page ("Mentor Chat")           | "Rhitmo"                                               |
| Card no dashboard "Histórico do Mentor Chat"                | "Histórico Rhitmo"                                     |
| Botão "Pergunte ao Mentor" (dashboard, empty states)        | "Pergunte à Rhitmo" (já é o padrão em `/lider/mentor`) |
| Aba "Mentor Chat" em `/member/:id`                          | "Rhitmo"                                               |
| Onboarding/checklist: "Abra o Mentor Chat"                  | "Abra a Rhitmo"                                        |
| Billing/Upgrade: "Mensagens Mentor Chat"                    | "Mensagens da Rhitmo"                                  |
| Landing: bloco "Mentor Chat" + browser frame                | "Rhitmo"                                               |
| Privacy/Terms: menções a "Mentor Chat"                      | "Rhitmo (assistente de IA)"                            |
| Help Center: "Mentor Chat IA" e FAQ                         | "Rhitmo"                                               |


Aplicar nas 3 línguas (`pt-BR.json`, `en.json`, `es.json`):

- `nav.lider.avaliacoes`: "Rhitmo" → "Avaliações" (PT/EN/ES)
- `nav.liderado.avaliacoes`: já é "Avaliações que recebi" / "Reviews I received" — manter.
- Chaves com "Mentor"/"Mentor Chat" passam para "Rhitmo" / "a Rhitmo" (PT), "Rhitmo" (EN), "Rhitmo" (ES).
- `mentor.title` ("Mentor de Liderança") → "Rhitmo".
- `setup.openMentorChat`, `setup.mentorChatAction`, `setup.askMentor` etc.: trocar "Mentor"/"Mentor Chat" por "Rhitmo".

Para textos não-i18n (hardcoded em PT) nas páginas listadas (`MentorChat.tsx` `title`, `MentorHistoryCard.tsx`, `MemberDetails.tsx` aba, `HelpCenter.tsx`, `PrivacyPolicy.tsx`, `TermsOfService.tsx`, `Landing.tsx`, `Index.tsx` empty state, `UpgradeBanner.tsx`, `SetupChecklist.tsx`, `dashboard/DirectReportDashboard.tsx`, `LeaderSyncWizard.tsx`, `MentorContextPanel.tsx` se houver string visível): substituir literal "Mentor Chat" / "Mentor" → "Rhitmo" / "à Rhitmo" conforme o contexto da frase.

## O que NÃO muda (de propósito)

- **Rotas:** `/lider/mentor`, `/lider/avaliacoes`, `/liderado/avaliacoes` continuam iguais.
- **Componentes/arquivos:** `MentorChat.tsx`, `MentorHistoryCard.tsx`, `pages/lider/Mentor.tsx`, `MentorThread.tsx`, `MentorContextPanel.tsx` mantêm nome no código (refator de nomes ficaria caro e não muda nada para o usuário).
- **Banco/types:** `chat_threads.type='mentor'`, colunas, RPCs, edge functions — todos mantêm os nomes atuais.
- **Recap "Rhitmo Mensal" / "Rhitmo Trimestral":** mantêm o nome. Eles vivem **dentro** da seção Avaliações como artefatos do produto (calibrações periódicas), e o usuário só pediu para renomear o item de menu, não esse conceito.
- **App Slack:** continua se chamando "Rhitmo" (já está alinhado).

## Detalhes técnicos

Estimativa: ~30 linhas alteradas em 3 JSONs de i18n + ~15 substituições em strings hardcoded espalhadas em ~12 arquivos.

Ordem da execução:

1. Atualizar `src/i18n/locales/{pt-BR,en,es}.json` (chaves `nav.lider.avaliacoes`, `mentor.*`, `setup.*Mentor*`, `pricing.*Mentor*`, `nav.lider.pergunte_mentor`).
2. Substituir literais "Mentor Chat" → "Rhitmo" em `MentorChat.tsx`, `MentorHistoryCard.tsx`, `MemberDetails.tsx`, `Index.tsx`, `HelpCenter.tsx`, `PrivacyPolicy.tsx`, `TermsOfService.tsx`, `Landing.tsx`, `UpgradeBanner.tsx`, `SetupChecklist.tsx`, `AppSidebar.tsx` (comentário + tooltip).
3. Verificar visual: sidebar líder agora mostra "Avaliações" no lugar de "Rhitmo", e o CTA logo abaixo vira "Rhitmo".
4. Atualizar `mem://product/brand-voice-and-localization-strategy` com a nova nomenclatura.

## Pontos abertos (decida antes ou eu sigo o default)

1. **Manter "Rhitmo Mensal" / "Rhitmo Trimestral"?** Default: sim. (Posso renomear para "Avaliação Mensal/Trimestral" se preferir consistência total — diga.)
2. **Tom do CTA:** "Pergunte à Rhitmo" (atual) ou só "Rhitmo" no botão grande? Default: manter "Pergunte à Rhitmo" no CTA do sidebar, e usar "Rhitmo" como título da tela e do menu.