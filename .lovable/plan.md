# Slides de Onboarding — Turma FAP (Programa Fundadores)

Vou gerar um arquivo PPTX usando `pptxgenjs` seguindo a identidade visual da Rhitmo (Creme/Bento, ondas roxas, tipografia editorial). O arquivo final ficará em `/mnt/documents/rhitmo-onboarding-fap.pptx`.

## Identidade visual

- **Paleta:** creme (`#FAF7F2`) como fundo principal, roxo Rhitmo (`#7C3AED` / `262 83% 58%`) como cor primária, navy escuro (`#1A1B3A`) para slides "premium" de abertura/encerramento, cinza grafite (`#2D2D3A`) para texto.
- **Tipografia:** Georgia (headlines, editorial) + Calibri (corpo). Títulos 36-44pt bold tracking-tight, body 16-18pt.
- **Motivo visual:** Rhythm Wave (ondas senoidais roxas em camadas) usadas como detalhe sutil em rodapés e slides de transição.
- **Layout:** Bento Grid (cards com `rounded` simulado via shapes), sombras suaves, generoso whitespace, alternância dark/light (sandwich).

## Estrutura dos slides (12 slides)

1. **Capa — Boas-vindas FAP** *(dark navy)*
   Título: "Bem-vindos, Fundadores FAP" · Subtítulo: "Programa Fundadores · Onboarding Sync · Abril 2026" · Logo Rhitmo + ondas decorativas.

2. **Programa Fundadores** *(creme)*
   3 cards bento: "6 meses Pro grátis" · "Acesso direto ao time fundador" · "Voz ativa no roadmap". Stat callout: "R$ 0 pelos próximos 6 meses".

3. **O que é a Rhitmo** *(creme, two-column)*
   Coluna esquerda: definição editorial — *"Parceiro de IA para liderança baseada em evidências"*. Coluna direita: 3 pilares com ícones em círculos roxos: Brief (preparação) · Bias (qualidade) · Nudges (consistência).

4. **A dor que resolvemos** *(creme, stat-driven)*
   Headline grande: "21h/semana" com label "tempo médio que líderes gastam com gestão de pessoas". Bullets: avaliações sem evidência · feedbacks esquecidos · 1:1s sem contexto · decisões enviesadas.
   Comparativo "Antes Rhitmo / Com Rhitmo".

5. **Primeiros passos · Configuração** *(creme, numbered steps)*
   1. Aceitar convite e definir senha · 2. Completar perfil (estilo de liderança + DISC) · 3. Conectar Google Calendar · 4. Personalizar notificações (Perfil → Notificações).

6. **Primeiros passos · Adicionar liderados** *(creme, two-column)*
   Esquerda: passo a passo (Time → Adicionar membro → enviar convite por e-mail/Slack). Direita: card destaque "Cadastro em massa" (até 100 por vez) e "Sync via Slack" (vinculação automática).

7. **Capturando notas · Visão geral** *(creme, 2x2 bento)*
   4 cards com ícones: **Magic Paste** (colar de Tactiq/Meet/Fireflies) · **Gravação manual** (até 30h/mês no Pro) · **Bot Recall.ai** (entra automaticamente na reunião) · **Slack** (`/nota`, `/kudos`, classificação ambiente).

8. **Capturando notas · Detalhes** *(creme, two-column)*
   Esquerda: tabela comparativa rápida (quando usar cada método). Direita: destaque para **Extensão Chrome** (gravação no Google Meet) e **comandos Slack** (`/nota`, `/kudos`, `/brief`, `/meu-rhitmo`).

9. **IA do dia a dia** *(creme, 3 cards)*
   Brief pré-1:1 · Mentor Chat (RAG das suas notas) · Avaliação formal baseada em evidências. Reforça: "Tudo privado por padrão. Compartilhar é uma ação explícita."

10. **Suporte & SLA** *(creme, two-column)*
    Esquerda: canais — e-mail `suporte@rhitmo.co` · Slack do Programa Fundadores · WhatsApp direto com fundadores. Direita: card grande "SLA: resposta em até 24h úteis" + "Bugs críticos: prioridade imediata".

11. **Próximos passos** *(creme, checklist)*
    ☐ Hoje: aceitar convite + completar perfil · ☐ Esta semana: adicionar primeiros 3 liderados + 1ª nota · ☐ Em 7 dias: 1ª 1:1 com brief · ☐ Em 30 dias: 1ª avaliação formal. CTA final: "Vamos construir juntos."

12. **Q&A — Obrigado** *(dark navy)*
    "Perguntas?" grande · contatos do time fundador · ondas roxas decorativas · logo Rhitmo.

## Implementação técnica

- Script Node.js usando `pptxgenjs` (já documentado no skill/pptx).
- Cada slide usa shapes `rectangle` com `rectRadius` para simular `rounded-2xl`, sombras suaves via `shadow: { type: 'outer', blur: 20, opacity: 0.08 }`.
- Ondas decorativas via `addShape` com tipo `curvedConnector` ou imagem PNG gerada à parte.
- Font pairing: `Georgia` (headers) + `Calibri` (body) — universalmente disponíveis.
- Após gerar: converter para PDF com LibreOffice e inspecionar cada slide como JPG (QA visual obrigatório do skill PPTX) antes de entregar.
- Entregar via `<lov-artifact path="rhitmo-onboarding-fap.pptx" mime_type="application/vnd.openxmlformats-officedocument.presentationml.presentation">`.

## O que NÃO está no escopo

- Não vou alterar código do app (é apenas geração de artifact).
- Não vou criar uma rota web nem integrar os slides ao Rhitmo.
- Não vou incluir vídeo embarcado (PPTX terá só elementos estáticos + shapes).
