# Onboarding Rhitmo — Diagnóstico + Proposta de Fluxo

## Objetivo

Gerar um **documento (.docx)  e  apresentação de onboardin (.pptx) entregável em** `/mnt/documents/` com:

1. Diagnóstico da experiência atual do líder novo (rotas exploradas no preview).
2. Oportunidades e dores mapeadas, por tela.
3. Proposta de fluxo de onboarding (ativação dia-1 → semana-1 → semana-2).
4. Wireframes em ASCII + recomendações de copy/CTA (estilo "Service-as-Software" + Bento Creme).  


Sem mudanças de código nesta etapa — é um **artifact estratégico** para servir de base ao próximo sprint de Activation/Onboarding.

## O que foi observado na navegação (líder Matheus, workspace Faster Ops)


| Tela                                        | Estado atual                                                                                             | Dor / oportunidade                                                                                                                                               |
| ------------------------------------------- | -------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `/lider/inicio`                             | Bento com `AccountSetup` (Slack, Liderados, Canais Slack, Calendar) + Próximas 1:1s + Mentor + TeamPulse | Setup já está tudo "Conectado" para esta conta — **não há tour para quem chega zero**. Sem checklist de "primeira nota / primeiro brief / primeira pauta".       |
| `/lider/1on1s`                              | Master-detail vazio, exige selecionar liderado para ver Sugestões da Rhitmo                              | Empty state genérico ("Selecione um liderado"). Não explica o que vai aparecer, nem porquê o mentor depende de evidências.                                       |
| `/lider/diario`                             | Master-detail vazio com cadeado                                                                          | Mensagem boa ("Notas privadas"), mas sem CTA para criar a primeira nota nem exemplo de uso (Magic Paste).                                                        |
| `/lider/objetivos`                          | Master-detail vazio                                                                                      | Sem template de objetivo, sem onboarding sobre o modelo (meta + indicador + data).                                                                               |
| `/lider/avaliacoes` (item "Rhitmo" no menu) | Master-detail vazio explicando Mensal/Trimestral/Formal                                                  | **Naming conflict**: item do menu é "Rhitmo" mas a página fala "Avaliações". `/lider/rhitmo` retorna 404. Confusão imediata.                                     |
| `/lider/pulse`                              | Empty state com CTA "Criar primeiro Pulse"                                                               | Bom CTA. Falta exemplo / template inicial visível antes do clique.                                                                                               |
| `Ask the Mentor`                            | Página rica (Coaching pessoal + atalhos + sugestões + recentes)                                          | Excelente — mas o líder novo cai aqui sem evidências; sugestões como "Quem está em risco esta semana?" vão dar respostas pobres.                                 |
| Workspace switcher → Settings → Integrações | Slack + Calendar com badge "Conectado"                                                                   | Nenhum onboarding inline para conectar pela primeira vez (já estavam conectados). Falta CTA contextual no Bento de Home explicando o que destrava cada conector. |
| Convite de liderados                        | Pelo dropdown da org (NewMemberDialog individual) e em /lider/pessoas (BulkOnboardDialog)                | Está "escondido" dentro do dropdown do workspace para o caminho 1-a-1. Líder novo não descobre.                                                                  |


## Dores transversais

1. **Sem "primeiro uso" guiado** — o `AccountSetupBento` só vira checklist depois que algo está pendente; não há narrativa de jornada (Conectar Calendar → Importar 1ª 1:1 → Receber 1º Brief).
2. **Empty states inconsistentes** — três das cinco telas internas mostram só "Selecione um liderado". Cliente novo não entende o valor antes de gerar dados.
3. **Naming "Rhitmo" vs "Avaliações"** — quebra a régua ("Rhitmo" no menu, "Rhitmo" no header da página, mas é o módulo de Avaliações). E `/lider/rhitmo` 404.
4. **Conectores fora de contexto** — Slack/Calendar moram em Settings. Falta explicar **o que** muda quando conecta (brief automático, captura por DM, transcrição Recall).
5. **Mentor sem evidências** — chat é o WOW, mas funciona mal sem dados; precisa de um "modo demo" ou de redirect para ações que geram contexto.
6. **Convite de liderados pouco visível** — primeiro CTA do líder novo deveria ser convidar/mapear o time, hoje está num dropdown.

## Estrutura proposta do documento (.docx)

Capa + 6 seções, formato editorial, fonte Lora (títulos) / Inter (corpo) — alinhado ao Design System V2.

```
1. Capa — "Onboarding Rhitmo: do convite ao primeiro Brief"
2. Sumário executivo (1 página)
   - Métricas-alvo: TTV (time-to-first-brief) ≤ 7 dias; D7 retention; setup completion ≥ 80%
3. Mapa do estado atual
   - Tabela tela × dor × oportunidade (a de cima)
   - Screenshot ASCII do AccountSetupBento atual
4. Princípios do novo onboarding
   - "Conectar antes de cadastrar"
   - "Mostrar valor antes de pedir trabalho" (Magic Paste demo)
   - "1 ação por dia nos primeiros 7 dias"
5. Fluxo proposto (jornada Dia 0 → Dia 14)
   Dia 0 (signup) → Wizard 3 passos:
     a. Quem é você (cargo, tamanho do time)
     b. Conectar Calendar (obrigatório) + Slack (recomendado)
     c. Importar/cadastrar 3 primeiros liderados
   Dia 1 → DM Slack da Rhy: "Importe sua primeira 1:1 com Magic Paste"
   Dia 2 → Primeira nota no Diário (template guiado)
   Dia 3 → Primeiro Pulse (template Energia/Clareza)
   Dia 7 → Primeiro Brief automático antes da 1:1
   Dia 14 → Primeiro Rhitmo Mensal sugerido
6. Recomendações por tela (com mocks ASCII)
   - Home: trocar AccountSetup por "Onboarding Tracker" com 5 milestones
   - 1:1s/Diário/Objetivos: empty states com Magic Paste + exemplo real
   - Avaliações: renomear menu para "Rhitmo (Avaliações)" e redirect 404
   - Mentor: gating + sugestões adaptativas ao volume de evidência
   - Convite de liderados: CTA fixo no AccountSetup + atalho global ⌘K
7. Anexo: copy do wizard + DMs Slack (PT-BR Early Adopter)
```

## Como vou produzir

1. Usar a **skill DOCX** (`docx-js`):
  - Página A4, fonte Lora 14pt títulos, Inter 11pt corpo, paleta crème (`#F5F3EE` fundo, `#0d0d0d` texto, accent roxo Rhitmo).
  - Tabelas com `WidthType.DXA`, dual width.
  - Wireframes ASCII em blocos `Consolas` 9pt dentro de parágrafos com shading `#F0EBE3`.
2. Validar com `validate_document.py`.
3. Converter para PDF com LibreOffice + `pdftoppm` para QA visual de cada página.
4. Salvar em `/mnt/documents/onboarding-rhitmo-diagnostico-v1.docx`.
5. Emitir `<lov-artifact>` para download.

## Fora do escopo (próximo passo, não agora)

- Implementar o wizard, refatorar empty states ou renomear o menu.
- Mexer em edge functions / DMs de onboarding via Slack.
- Editar memórias.

Aprove para eu sair do plan mode e gerar o documento.