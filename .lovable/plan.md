

# Slack — atualização dos comandos pós-mudanças das últimas 24h

## TL;DR

**Sim, vale atualizar — mas pouca coisa.** O conjunto de slash commands (`/rhitmo`, `/nota`, `/kudos`, `/brief`, `/mentor`, `/meu-pdi`, `/meu-rhitmo`) cobre bem o uso conversacional e **nenhuma feature nova das últimas 24h** justifica criar comando novo. As mudanças foram em UI da web (ícone do Google Calendar, fix de timezone dos recaps, redesenho do passo 2 da Avaliação Formal) — fluxos que **acontecem dentro do app**, não no Slack.

O que precisa de ajuste é **menu `/rhitmo` + copy** para refletir que existem novos artefatos consultáveis e empurrar o usuário pro lugar certo no app.

## Estado atual (mapeado em `supabase/functions/slack-bot/index.ts`)

| Persona | Comandos hoje |
|---|---|
| **Líder** | `/rhitmo`, `/nota`, `/kudos`, `/brief`, `/mentor` |
| **Liderado** | `/rhitmo`, `/meu-pdi`, `/meu-rhitmo` |
| **HR Admin** | `/rhitmo` (só mostra botão "Abrir Dashboard HR") |

Privacidade já protegida: `/nota`, `/brief`, `/review`, `/meu-pdi`, `/mentor`, `/meu-rhitmo` em canal público disparam aviso "use DM".

## Gaps identificados

### 1. Líder — menu `/rhitmo` não cita Avaliação Formal nem Rhitmo Mensal/Trimestral
O menu menciona "nota / kudos / brief / mentor / rhitmo" mas o líder hoje tem dois novos artefatos críticos:
- **Avaliação Formal v2** (Briefing → Sheet com Markdown + emojis)
- **Rhitmo Mensal/Trimestral** (recaps automáticos)

Esses fluxos são **multi-step e visuais demais pro Slack** (sheet lateral, tabs, edição inline). Não faz sentido criar `/avaliacao` ou `/recap` — faz sentido **adicionar atalhos no menu** que abrem direto a tela certa no app.

### 2. Liderado — menu não cita "Meu Rhitmo Mensal"
Liderado também recebe recaps mensais compartilhados. O menu só fala de PDI e perfil. Falta atalho para "Minhas avaliações" (quando o líder compartilha) e "Meu histórico mensal".

### 3. HR Admin — menu praticamente vazio
Só tem 1 botão. Hoje o HR Admin tem analytics avançado, gestão de membros, alertas de risco. Vale acrescentar 2-3 atalhos de deep-link.

### 4. Copy desatualizada
- "Acesse seu PDI, feedbacks e **reviews**" → trocar "reviews" por "**avaliações de desempenho**" (alinhado com a UI nova)
- Dica final ("você receberá notificações antes de 1:1s") está genérica — pode reforçar Smart Nudges do Activity Center

## O que **não** vou criar

- ❌ `/avaliacao` ou `/review` para líder — fluxo é UI-heavy (Sheet, tabs, Markdown editor). Slack seria UX pior.
- ❌ `/recap` — recaps são longos e renderizam mal em texto puro. Melhor enviar **notificação** quando recap fica pronto (já existe via `notify-review-shared` para avaliações; podemos espelhar pra recaps depois, mas não nessa task).
- ❌ Novos slash commands na config do Slack App — zero mudança no manifest, só código no `slack-bot/index.ts`.

## Mudanças propostas (1 arquivo, ~40 linhas)

**Arquivo:** `supabase/functions/slack-bot/index.ts` — função `buildRhitmoMenu`

### Líder (linhas 356-364)
```
*📋 Gestão de Time*
[✍️ Adicionar nota]  [👏 Enviar kudos]  [📊 Avaliação Formal →app]  [📅 Rhitmo Mensal →app]

*💬 Comandos rápidos:*
• /nota @membro texto — Feedback privado
• /kudos @membro texto — Reconhecimento público
• /brief @membro — Resumo pré-1:1
• /mentor <pergunta> — Consultar mentor de IA
• /rhitmo — Este menu
```

### Liderado (linhas 365-374)
```
*👤 Seu Desenvolvimento*
[📋 Meu PDI]  [📊 Minhas avaliações →app]  [🚀 Abrir Rhitmo]

*💬 Comandos rápidos:*
• /meu-pdi — Plano de Desenvolvimento
• /meu-rhitmo — Perfil, feedbacks e Rhitmo Mensal
• /rhitmo — Este menu
```

Adicional: dentro de `handleMeuRhitmoCommand`, **acrescentar uma seção** "📅 Último Rhitmo Mensal disponível" com link pro app (sem renderizar o conteúdo no Slack).

### HR Admin (linhas 375-381)
```
*📈 Analytics Organizacional*
[📊 Dashboard HR]  [🚨 Alertas de Risco]  [👥 Membros]

*💬 Atalhos:*
• /rhitmo — Este menu
(sem comandos próprios — gestão é feita no painel web)
```

### Copy/footer
- Trocar "reviews" → "avaliações de desempenho" (linha 368)
- Atualizar dica final: "💡 *Dica:* Notificações automáticas chegam antes de 1:1s, quando uma avaliação é compartilhada e quando um Rhitmo Mensal fica pronto."

## Critério de aceite

- `/rhitmo` como líder mostra os 2 novos atalhos (Avaliação Formal, Rhitmo Mensal) abrindo deep-links no app
- `/rhitmo` como liderado mostra "Minhas avaliações" e a seção do `/meu-rhitmo` lista o último recap mensal
- `/rhitmo` como HR Admin mostra 3 atalhos (Dashboard, Alertas, Membros)
- Zero mudança em `manifest.json` do Slack App / scopes — só código
- Comandos existentes (`/nota`, `/kudos`, `/brief`, `/mentor`, `/meu-pdi`, `/meu-rhitmo`) continuam funcionando idênticos
- Copy não menciona mais "reviews" como termo solto

## O que fica fora desta task (registrar como follow-ups)

1. **Notificação Slack quando Rhitmo Mensal/Trimestral fica pronto** — já existe infra (`dispatchNotification` em `_shared/notifications.ts`), mas precisa cron disparar. Vale uma task separada.
2. **Notificação Slack quando líder compartilha Avaliação Formal** — análogo ao item 1.
3. **App Home tab redesign** — o menu hoje só aparece via `/rhitmo`. Poderia espelhar no Home tab.

</plan><lov-plan>

# Slack: o que precisa atualizar depois das mudanças das últimas 24h

## Diagnóstico: o que mudou no produto vs. o que o Slack expõe

Mapeei os comandos atuais (`/rhitmo`, `/nota`, `/kudos`, `/brief`, `/mentor`, `/meu-pdi`, `/meu-rhitmo`) contra o que mudamos recentemente (Rhitmo Mensal/Trimestral com fix de timezone, Avaliação Formal v2 em 2 passos com Markdown + emojis, etc.).

**Conclusão:** o Slack não precisa de nenhum comando novo, mas tem 4 ajustes pequenos no menu `/rhitmo` para refletir a realidade atual e tirar promessas quebradas.

| Persona | Estado atual no Slack | Problema |
|---|---|---|
| **Líder** | Menu OK, mas cita "reviews" só no copy do liderado | Não menciona Avaliação Formal nem Rhitmo Mensal/Trimestral que existem |
| **Liderado** | Botão "📋 Meu PDI" + cita "reviews" no texto | Promete "reviews" mas não tem botão pra abrir avaliação compartilhada; PDI direciona pra fluxo que mudou |
| **HR Admin** | Só botão "Abrir Dashboard HR" | Subutilizado — não menciona Analytics avançado, Health Score, alertas de risco |
| **Todos** | Comando `/review` listado em `SENSITIVE_COMMANDS` e `DM_ONLY_COMMANDS` | **Comando não existe no switch** — se alguém digitar dá "Comando desconhecido". Código morto. |

## O que vou ajustar

### 1. Líder — menu `/rhitmo`

Adicionar 1 linha no bloco "Comandos rápidos":
- Manter tudo que existe (`/nota`, `/kudos`, `/brief`, `/mentor`)
- **Adicionar referência ao "Rhitmo Mensal" e "Avaliação Formal"** com link direto pro app, sem criar slash command novo (esses fluxos vivem no app por design — são longos, multi-step, exigem leitura de evidências).

Texto novo:
```
📊 *No Rhitmo Web:*
• Rhitmo Mensal & Trimestral — recaps automáticos do time
• Avaliação Formal — gerar com IA em 2 passos
→ <https://rhitmo.co|Abrir Rhitmo>
```

### 2. Liderado — menu `/rhitmo`

- Trocar copy de "Acesse seu PDI, feedbacks e **reviews**" → **"Acesse seu PDI e suas avaliações compartilhadas"** (palavra "review" em PT é confusa)
- Adicionar botão **"📄 Minhas Avaliações"** que abre `https://rhitmo.co/avaliacoes` (usuário vê apenas avaliações com status `shared` — RLS já garante)
- Manter `/meu-pdi` e `/meu-rhitmo`

### 3. HR Admin — menu `/rhitmo` (mais carente)

Hoje é só 1 botão. Expandir pra refletir o que HR Admin realmente faz:
```
📊 Analytics Organizacional
• Health Score do workspace
• Alertas de risco (turnover, viés, silêncio de líder)
• Visão consolidada de PDIs e avaliações

[📊 Dashboard HR] [🚨 Alertas de Risco] [📈 Analytics Avançado]
```
Os 3 botões viram `url` direto (`/hr`, `/hr/alerts`, `/hr/analytics`) — HR Admin não tem comandos slash dedicados (consumo é visual, não conversacional).

### 4. Limpeza: remover `/review` morto

- Tirar `/review` de `SENSITIVE_COMMANDS` (linha 14)
- Tirar `/review` de `DM_ONLY_COMMANDS` (linha 15)
- Não há case `/review` no switch — confirmado código morto

## O que **não** vou mexer (e por quê)

- **`/nota`, `/kudos`, `/brief`, `/mentor`**: handlers funcionando, lógica não foi tocada nas últimas 24h
- **Não criar `/avaliacao` ou `/recap-mensal`**: fluxos exigem UI rica (tabs, edição de texto, gráficos) — slash command degrada UX
- **Não mexer em `slack-link`, OAuth, privacidade**: nada mudou no fluxo de autenticação

## Arquivos alterados

- `supabase/functions/slack-bot/index.ts` — `buildRhitmoMenu` (linhas 334–390) + constantes (linhas 14–15)

## Critério de aceite

- [ ] `/rhitmo` como líder mostra referência a Rhitmo Mensal + Avaliação Formal com link pro app
- [ ] `/rhitmo` como liderado mostra botão "Minhas Avaliações" + copy ajustado
- [ ] `/rhitmo` como HR Admin mostra 3 botões (Dashboard, Alertas, Analytics)
- [ ] `/review` removido dos arrays de privacidade (sem regressão funcional)
- [ ] Nenhum handler novo, nenhum comando novo, nenhuma migração

