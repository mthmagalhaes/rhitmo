## Objetivo

Construir `onboarding-rhitmo-lider-v1.pptx` — deck autoexplicativo de boas-vindas para líderes que acabaram de criar conta, mostrando a plataforma Rhitmo atual (Sprint 17) ponta a ponta.

## Por que mockups vetoriais (e não screenshots reais)

Para tirar screenshots de `/lider/*` precisaria de login válido na preview, o que o sandbox não tem. Solução: desenhar as telas em pptxgenjs (vetores) seguindo fielmente o Design System Creme/Bento — exatamente como no deck `tour-60s` anterior, mas com fidelidade maior e específico de cada feature. Resultado: 100% on-brand, escalável, sem depender de capturas reais.

## Estrutura — 11 slides

```
1.  Capa — "Bem-vindo ao Rhitmo"
2.  O que é Rhitmo (manifesto: Service-as-Software / AI-Native Leadership Partner)
3.  Mapa rápido — sidebar com as 6 áreas + tour 60s (CTA)
4.  Diário & Magic Paste (cole transcrição → IA extrai feedback/ações)
5.  Contexto unificado (timeline + Rede/ONA + citations [doc:UUID])
6.  1:1s + Brief automático (Recall.ai + Slack DM 18h antes)
7.  Mentor Chat (3 camadas RAG, Auto vs Manual, multimodal)
8.  Pulse Surveys + Network Signals (sinais ambientes do Slack)
9.  Avaliações 360° (self + peer + upwards + formal review com evidências)
10. Integrações (Slack, Google Calendar, Recall, Chrome Extension)
11. Próximos passos — checklist de ativação + links (Help Center, Slack)
```

## Sistema visual aplicado

- **Paleta Creme/Bento**: fundo `#F5F0E6` (creme), cartões `#FFFFFF`, primário Rhitmo `#3B82F6`/azul-onda + acento coral `#E85D3A`, texto `#1F1A14`
- **Tipografia**: Lora (serif) para títulos editoriais, Inter para corpo
- **Cartões**: `rounded-3xl` (radius alto), sombras ultra-suaves simuladas com retângulos translúcidos
- **Layout Bento**: cada slide com 1 coluna de copy (esquerda) + mockup grande (direita), exceto capa/manifesto/checklist
- **RhythmWave**: pequenas ondas decorativas (3 linhas curvas) como assinatura visual recorrente
- **Sem em-dashes**, tom Early Adopter PT-BR

## Mockups por slide (vetoriais, fiéis ao produto atual)

| Slide | Mockup |
|---|---|
| 3 | Sidebar floating completa (Início, Pessoas, Diário, 1:1s, Contexto, Avaliações) + área principal com Bento Grid de /lider/inicio (AccountSetup, Próximas 1:1s, Mentor History, Team Pulse) |
| 4 | Master-detail: lista de liderados (260px) + editor com bloco "Magic Paste" + chips de tags geradas |
| 5 | Timeline /lider/contexto com cards datados, chip de fonte (Slack/Recall/Manual) + CitationChip [doc:…] highlightado |
| 6 | Card de 1:1 + preview de DM Slack do brief com bloco "Vozes de pares" e "Contexto de rede" |
| 7 | Thread do Mentor Chat com balões usuário/Rhy + toggle Auto/Manual + ícone de imagem |
| 8 | TeamPulseBento com sinais (cor amarelo/coral) + modal SendPulseButton |
| 9 | Lista Reviews com pílulas Self / Peer / Upwards / Formal + sheet Tiptap com citations |
| 10| Grid 2x2 de cards de integração (Slack, Calendar, Recall, Chrome) com status "Conectado" |

## Conteúdo / copy

Tom Early Adopter, frases curtas, foco em outcome (não em feature). Cada slide:
- **Eyebrow** (tag pequena maiúscula, ex: "INTELIGÊNCIA")
- **Título Lora 32–40pt**
- **3 bullets** ou 1 parágrafo curto + 1 micro-CTA contextual ("Abra /lider/diario", "Conecte o Slack em Configurações → Integrações")

## Entrega

- `/mnt/documents/onboarding-rhitmo-lider-v1.pptx` (16:9, 1920×1080 equivalente)
- QA visual obrigatório: converter via LibreOffice → PDF → JPGs, inspecionar **todos** os 11 slides, corrigir overlaps/cortes, re-renderizar até passar limpo
- Nada de placeholders genéricos; cada mockup específico da feature

## Detalhes técnicos

- `pptxgenjs` em Node, slide master 13.333×7.5 in
- Cores e fontes parametrizadas no topo do script (theme object)
- Funções utilitárias: `card()`, `sidebar()`, `chip()`, `wave()`, `pillTag()` para reuso
- Sem imagens raster (mantém arquivo leve e nítido em qualquer zoom)
