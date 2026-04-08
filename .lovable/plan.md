

## Enxoval de Marca Rhitmo — Artefatos Visuais + Design System no App

### Parte 1: Gerar Artefatos Visuais (PDFs/PNGs)

Usar o **canvas-design skill** e **AI image generation** para criar 5 artefatos de alta qualidade salvos em `/mnt/documents/`:

#### 1. Brand Board (PDF, 1 página)
Composição editorial com todos os elementos da marca em um único board:
- Logo principal + variações (horizontal, vertical, ícone)
- Paleta de cores com HEX/HSL (Primary #7C3AED, Secondary #1A1035, Background #F5F3EE, Success #059669, Warning #D97706, Destructive #DC2626, Info #0EA5E9)
- Tipografia: Inter (body), Lora (headlines), Space Mono (dados)
- Hierarquia tipográfica (H1-H5, body, caption)
- Logo "rhythm wave" como motivo visual
- Estilo: editorial, fundo creme, tipografia serifada para títulos

#### 2. Logo Variations (PNG, 4 versões)
- **Horizontal**: Texto "Rhitmo" + wave line ao lado
- **Vertical/Stacked**: Texto em cima, wave embaixo
- **Ícone**: Apenas a wave line estilizada em círculo
- **Monocromática**: Versão branca para fundos escuros

Gerar via AI image generation (gemini-3-pro-image-preview) com prompt detalhado da identidade.

#### 3. Color Palette Doc (PDF, 1 página)
Documento técnico com:
- Cores primárias, secundárias, semânticas
- Swatches grandes com HEX, HSL, RGB
- Exemplos de uso (botões, cards, backgrounds)
- Regras de contraste e acessibilidade

#### 4. Typography Hierarchy (PDF, 1 página)
- Specimen de Inter (400, 500, 600, 700)
- Specimen de Lora (400, 500, 600, 700)
- Specimen de Space Mono (400, 700)
- Escala tipográfica: 11px → 48px com line-heights
- Exemplos de uso em contexto

#### 5. Social Media Templates (PNG, 3 peças)
- Instagram post (1080x1080)
- LinkedIn banner (1584x396)
- Twitter/X header (1500x500)
Todos usando a paleta Rhitmo, logo, e estilo editorial creme/bento.

### Parte 2: Página "Design System" no App

Criar uma nova rota `/design-system` acessível apenas para o usuário `matheus@rhitmo.co` (admin master), com link no sidebar.

#### Conteúdo da página:
- **Hero**: "Rhitmo Brand Kit" com download dos artefatos
- **Seção Cores**: Swatches interativos com copy-to-clipboard (HEX)
- **Seção Tipografia**: Specimens live das 3 fontes
- **Seção Logo**: Preview das variações com download
- **Seção Templates**: Preview dos social media templates com download
- **Seção Uso**: Guidelines de aplicação (do/don't)

#### Acesso restrito:
Verificar `user.email === 'matheus@rhitmo.co'` para mostrar o item no sidebar e permitir acesso à rota.

### Arquivos

| Arquivo | Ação |
|---------|------|
| `/mnt/documents/rhitmo-brand-board.pdf` | Novo — Brand Board completo |
| `/mnt/documents/rhitmo-logo-horizontal.png` | Novo — Logo horizontal |
| `/mnt/documents/rhitmo-logo-vertical.png` | Novo — Logo vertical |
| `/mnt/documents/rhitmo-logo-icon.png` | Novo — Logo ícone |
| `/mnt/documents/rhitmo-logo-mono.png` | Novo — Logo monocromática |
| `/mnt/documents/rhitmo-color-palette.pdf` | Novo — Paleta documentada |
| `/mnt/documents/rhitmo-typography.pdf` | Novo — Hierarquia tipográfica |
| `/mnt/documents/rhitmo-social-instagram.png` | Novo — Template Instagram |
| `/mnt/documents/rhitmo-social-linkedin.png` | Novo — Template LinkedIn |
| `/mnt/documents/rhitmo-social-twitter.png` | Novo — Template Twitter |
| `src/pages/DesignSystem.tsx` | Novo — Página do Design System |
| `src/App.tsx` | Adicionar rota `/design-system` |
| `src/components/AppSidebar.tsx` | Adicionar link condicional para matheus@rhitmo.co |

### Execução
1. Gerar design philosophy (.md) via canvas-design skill
2. Criar Brand Board PDF com reportlab (tipografia real, composição editorial)
3. Gerar logo variations via AI image generation
4. Criar Color Palette e Typography PDFs com reportlab
5. Gerar Social Media templates via AI image generation
6. QA visual de todos os artefatos
7. Criar página DesignSystem.tsx com previews e downloads
8. Adicionar rota e link no sidebar

