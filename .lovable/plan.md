## Plano: Refinos de Navegação do Líder

Aplicar duas pequenas melhorias de UX para fechar as lacunas identificadas na auditoria.

### 1. Adicionar "Início" à sidebar do Líder

Arquivo: `src/lib/navigation.ts`

Adicionar um novo item como primeiro elemento de `LEADER_NAV_ITEMS`:

- id: `inicio`
- labelKey: `nav.lider.inicio`
- icon: `Home` (lucide-react)
- to: `/lider/inicio`

Também adicionar a chave `nav.lider.inicio` ("Início") nos arquivos de tradução PT-BR e EN do namespace `nav` para evitar fallback.

### 2. CTA de download do Conector Chrome

Arquivo: `src/pages/lider/Configuracoes.tsx`

No card do "Conector Chrome" (linhas 72–78 / render no map):

- Adicionar um botão "Instalar extensão" no `CardContent`, ao lado do status.
- O botão dispara um download via fetch+blob de `/rhitmo-recorder-extension.zip` (já existe em `public/`).
- Abrir um popover/dialog curto com instruções (Unzip → `chrome://extensions` → Developer mode → Load unpacked).

Para manter o `items` como array genérico, vou converter o card do Chrome em renderização customizada (ou adicionar um campo opcional `action?: ReactNode` em cada item e renderizá-lo dentro de `CardContent`).

### Arquivos a editar

- `src/lib/navigation.ts` (adicionar item Início)
- `src/locales/pt-BR/nav.json` e `src/locales/en/nav.json` (chave `lider.inicio`)
- `src/pages/lider/Configuracoes.tsx` (CTA Chrome com download + instruções)

### Fora de escopo

- UI de gestão de bots Recall.ai (gap menor, fica para sprint futura junto com a integração de Calendar).
- Mudanças em rotas, RLS ou Edge Functions.