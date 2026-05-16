Diagnóstico

O problema não parece ser a API do Slack nem OAuth. O Slack está funcionando até o ponto de receber a DM e chamar a função interna `chat-mentor`.

O erro real está em `chat-mentor`:

```text
path not found: /var/tmp/sb-compile-edge-runtime/functions/_shared/soul/00-identity.md
```

Fluxo que quebrou:

```text
Slack DM
  -> slack-bot recebe a mensagem
  -> chama chat-mentor em modo leader_self
  -> chat-mentor monta o prompt via composeSystemPrompt
  -> loader.ts tenta ler arquivos .md com Deno.readTextFile
  -> runtime publicado não encontra os .md no bundle
  -> chat-mentor retorna 500
  -> slack-bot mostra: "Tive um problema ao puxar o contexto..."
```

Causa provável

A centralização da “alma” da Rhitmo em arquivos `.md` está correta como arquitetura, mas o loader atual depende de leitura de filesystem em runtime:

```ts
Deno.readTextFile(new URL(relPath, import.meta.url))
```

No ambiente das funções publicadas, esses `.md` não estão disponíveis como arquivos físicos no caminho esperado. Por isso o Slack falha sempre que o `chat-mentor` precisa compor o prompt.

Plano de correção

1. Tornar os prompts `.md` parte explícita do bundle
   - Criar um módulo TypeScript gerado, por exemplo `supabase/functions/_shared/soul/docs.generated.ts`.
   - Esse arquivo exporta um map estático:

```ts
export const SOUL_DOCS = {
  "00-identity.md": `...conteúdo...`,
  "modes/leader-self.md": `...conteúdo...`,
  "channels/slack.md": `...conteúdo...`,
}
```

2. Ajustar `loader.ts`
   - Remover `Deno.readTextFile` do caminho de produção.
   - Fazer `readDoc(relPath)` buscar em `SOUL_DOCS[relPath]`.
   - Manter remoção de frontmatter e cache em memória.
   - Se faltar documento, lançar erro claro com a chave ausente.

3. Criar/ajustar script de geração
   - Atualizar `regen-snapshots.ts` ou criar um script pequeno para regenerar `docs.generated.ts` a partir dos `.md`.
   - Assim a fonte editorial continua sendo `.md`, preservando a regra da memória: mudanças de alma começam nos `.md`.

4. Reforçar teste contra regressão
   - Adicionar teste em `loader_test.ts` garantindo que `composeSystemPrompt({ mode: "leader-self", channel: "slack" })` não depende de `Deno.readTextFile` em runtime.
   - Manter snapshots existentes.

5. Validar o caminho que falhou
   - Rodar teste da função/loader localmente.
   - Depois verificar logs de `chat-mentor` e `slack-bot`: o erro `path not found ... soul/00-identity.md` deve desaparecer.

Fora de escopo

- Não mudar o comportamento conversacional da Rhitmo.
- Não alterar OAuth, manifest, comandos Slack ou permissões.
- Não mexer em RLS ou banco.
- Não desfazer a arquitetura da alma centralizada em `.md`; apenas tornar o carregamento compatível com o runtime publicado.