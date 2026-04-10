

## Plano: Ícones específicos do Chrome e Slack nos botões de conectores

### Problema
Os botões "Conector Chrome" e "Conector Slack" usam ícones genéricos do Lucide (`Globe` e `MessageSquare`), que não identificam visualmente as plataformas.

### Solução
Criar dois componentes SVG inline (`ChromeIcon` e `SlackIcon`) com os logos oficiais simplificados e usá-los nos 3 locais onde aparecem:

1. **`src/components/AppSidebar.tsx`** — botões na sidebar (linhas 212, 219)
2. **`src/components/extension/ChromeExtensionSetupDialog.tsx`** — header do dialog (linha 62)
3. **`src/components/slack/SlackConnectorDialog.tsx`** — header do dialog (linha 26)

### Implementação
- Criar `src/components/icons/ChromeIcon.tsx` — SVG do logo Chrome (círculo colorido com centro azul)
- Criar `src/components/icons/SlackIcon.tsx` — SVG do logo Slack (hashtag colorida)
- Substituir `Globe` por `ChromeIcon` e `MessageSquare` por `SlackIcon` nos 3 arquivos
- Manter tamanho `h-5 w-5` e `shrink-0` para consistência

