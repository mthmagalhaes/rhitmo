# Skill: rhitmo-soul-editor

Skill local (drafted em `.agents/skills/rhitmo-soul-editor/`) que ensina futuras instâncias do agente a editar a alma da Rhitmo com segurança, evitando os bugs recorrentes (prompt inline, esquecer `regen-docs`, snapshot drift, paridade web↔slack quebrada).

## Quando vai disparar
Descrição focada em: "edit Rhitmo identity, guardrails, tone, mode, channel; modify `supabase/functions/_shared/soul/*.md`; add new mode or channel; debug prompt drift between web and Slack".

## Estrutura do diretório

```
.agents/skills/rhitmo-soul-editor/
├── SKILL.md                       # entrypoint curto + checklist
└── references/
    ├── architecture.md            # mapa do soul/ (00–08, modes/, channels/, loader, docs.generated, snapshots)
    ├── workflows.md               # 4 fluxos passo-a-passo
    └── anti-patterns.md           # bugs comuns + como evitar
```

## Conteúdo do SKILL.md (resumo)

- **Regra de ouro**: prompt inline em edge function = bug. Toda mudança começa por um `.md` em `supabase/functions/_shared/soul/`.
- **Checklist obrigatório após editar qualquer `.md`**:
  1. `deno run --allow-read --allow-write supabase/functions/_shared/soul/regen-docs.ts`
  2. `deno run --allow-read --allow-write supabase/functions/_shared/soul/regen-snapshots.ts`
  3. Revisar diff dos snapshots em `__snapshots__/`
  4. Rodar `loader_test.ts` (11 testes, paridade web↔slack)
  5. Commitar `.md` + `docs.generated.ts` + snapshots juntos
- Ponteiros para os 3 references conforme o tipo de mudança.

## Workflows cobertos (references/workflows.md)

1. **Editar bloco existente** (ex.: ajustar tom em `03-tone-and-format.md`)
2. **Adicionar novo modo** (criar `modes/X.md` + registrar em `MODE_BLOCKS` do `loader.ts` + adicionar em `FILES` do `regen-docs.ts` + atualizar `Mode` type)
3. **Adicionar novo canal** (criar `channels/X.md` + `CHANNEL_BLOCK` + `Channel` type + `FILES`)
4. **Migrar edge function com prompt inline** (substituir por `composeSystemPrompt({mode, channel, vars, appendices})`, deprecar `rhitmo-constitution.ts`)

## Anti-patterns (references/anti-patterns.md)

- Editar `.md` e esquecer `regen-docs.ts` → bundle desatualizado em runtime
- Adicionar modo no `loader.ts` mas não em `regen-docs.ts FILES` → "Missing doc" em produção
- Mudar snapshot sem revisar diff → drift silencioso entre web e Slack
- Recriar prompt inline em nova edge function (lista as 6 que ainda precisam migrar: `generate-brief`, `generate-formal-review`, `meu-rhitmo`, `self-reflection`, `slack-rhitmo-orchestrator`, `briefGenerator.ts`)
- Adicionar `extends memory/disc` em modo legado sem regenerar snapshot

## Hand-off
Após gravar os 4 arquivos, chamar `skills--apply_draft` com `.agents/skills/rhitmo-soul-editor` para ativar a skill no workspace.

## Não inclui
- Não cria novos modos/canais agora (só ensina o processo).
- Não migra as 6 edge functions pendentes (skill apenas documenta o caminho).
- Não altera nenhum `.md` da alma, nem `loader.ts`, nem código de produção.
