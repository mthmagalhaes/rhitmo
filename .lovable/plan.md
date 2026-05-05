# Limpeza da ficha do liderado (`/member/:id`)

Dois ajustes pontuais em `src/pages/MemberDetails.tsx`. Sem mudanças de schema, sem outras páginas afetadas.

## 1. Remover "Gravar Reunião" do menu "Mais ações"
Foco de captura passou a ser **Magic Paste + Bot Recall.ai + (futuro) integrações nativas**. A gravação de tela direta deixou de fazer sentido na ficha individual.

- Remover o `DropdownMenuItem` "Gravar Reunião" (linhas 504-507).
- Remover o `MeetingRecorder` montado nesta página + estado `recorderOpen` + import `Monitor`.
- Manter o componente `MeetingRecorder.tsx` no repo por ora (ainda referenciado em outros pontos como Diário/extension popup) — só desconectamos da ficha.
- Resultado: dropdown passa a ter apenas **Mentor Chat** (e "Nova Nota" quando `cameFromReviews`). Se sobrar só 1 item visível na maioria dos casos, mantenho o dropdown mesmo assim para consistência visual com outras páginas.

## 2. Remover o accordion "Objetivos / Metas" da ficha
Objetivos agora vivem no menu lateral **Objetivos → seleciona membro** (`/lider/objetivos`, layout master-detail Windmill já implementado). Duplicar aqui confunde a navegação.

- Remover o `AccordionItem value="objectives"` inteiro (linhas 739-750), incluindo `<GoalsManager memberId={...} />`.
- Remover imports não usados (`GoalsManager`, ícone `Target` se não for usado em outro lugar do arquivo).
- O accordion `Rhitmo Sync` permanece como item único — vou trocar `Accordion type="multiple"` para `type="single" collapsible` para manter o comportamento natural com 1 item.

## Fora de escopo
- Não mexer no `MeetingRecorder.tsx` em si.
- Não mexer em `/lider/objetivos` (já está pronto e é a fonte única de objetivos agora).
- Próxima rodada: transformar o Bot Rhitmo no Slack em LLM conversacional (Sprint 12.5), conforme combinado.
