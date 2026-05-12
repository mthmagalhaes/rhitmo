## Mudança

Renomear o item "Convidar membros" do dropdown do WorkspaceSwitcher (sidebar, abaixo de "Refazer tour de boas-vindas") para **"Adicionar liderado(a)"**.

## Arquivos afetados

- `src/i18n/locales/pt-BR.json`
  - `sidebar.workspace.inviteMembers` → `"Adicionar liderado(a)"`
- `src/components/sidebar/WorkspaceSwitcher.tsx`
  - Atualizar o fallback inline do `t(...)` para `"Adicionar liderado(a)"` (mantém i18n consistente)
- `src/i18n/locales/en.json` e `es.json` (se a chave existir): traduzir equivalentes ("Add direct report" / "Añadir liderado(a)") para não quebrar consistência multi-idioma

Sem mudanças de comportamento — o dialog acionado continua sendo o `NewMemberDialog` individual estilo líder (memo `workspace-switcher-actions`).  
  
Garantir que a mudança esteja nos outros idomas

## Fora de escopo

- Não mexer em `nav.lider.cta.convidar_membros` (chave 1327) sem confirmar onde é usada — provavelmente outro contexto (ex: Pessoas/bulk).