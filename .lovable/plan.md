

## Adicionar Extensão Chrome ao Menu Lateral e Central de Conhecimento

### O que será feito

1. **Novo item no menu lateral do líder** — Adicionar "Extensão Chrome" com ícone `Chrome`/`Download` entre "Central de Conhecimento" e "Assinatura", que abre um dialog com instruções de instalação e link para download do ZIP.

2. **Novo card na Central de Conhecimento** — Adicionar card "Extensão Chrome" na lista `leaderCards` do HelpCenter com passos de instalação, configuração do token e uso automático.

### Arquivos alterados

| Arquivo | Mudança |
|---------|---------|
| `src/components/AppSidebar.tsx` | Novo item "Extensão Chrome" no `menuItems` do líder, abre dialog com instruções + botão download ZIP |
| `src/pages/HelpCenter.tsx` | Novo card `l-extension` em `leaderCards` com steps de instalação e uso |

### Detalhes

**Menu Lateral (AppSidebar.tsx)**
- Adicionar item com ícone `Download` ou `Chrome` (usar `Download` do Lucide) no array `menuItems`
- Ao invés de navegar para uma rota, abre um dialog inline com:
  - Botão "Baixar Extensão" (fetch+blob do `/rhitmo-recorder-extension.zip`)
  - Passos: (1) Descompacte, (2) Abra chrome://extensions, (3) Ative modo dev, (4) Carregue descompactado
  - Botão "Copiar Token" para autenticação
- Esse item só aparece para líderes (não para `isUser`)

**Central de Conhecimento (HelpCenter.tsx)**
- Novo card com id `l-extension`, ícone `Download`, título "Extensão Chrome", subtitle "Grave reuniões automaticamente no Google Meet"
- Steps detalhando download, instalação, token e uso automático

### O que NÃO muda
- Arquivos da extensão em si
- Edge functions
- Nenhuma migration

