

## Melhorar Ícone da Extensão Chrome

O ícone atual é o mesmo arquivo para 48px e 128px, provavelmente pequeno/pouco visível na barra do Chrome. A barra de ferramentas usa ícones de 16-38px, então o design precisa ser bold e legível nesse tamanho.

### O que será feito

1. **Gerar novos ícones** em 4 tamanhos (16, 32, 48, 128px) usando um script Python com o logo Rhitmo — um "R" roxo bold com fundo arredondado, visível mesmo em 16px
2. **Atualizar `manifest.json`** para declarar todos os tamanhos (16, 32, 48, 128)
3. **Reempacotar o ZIP** em `public/rhitmo-recorder-extension.zip`

### Detalhes do design do ícone

- Fundo roxo Rhitmo (`#7c3aed`) com bordas arredondadas
- Letra "R" branca bold centralizada
- Legível em todos os tamanhos, especialmente 16-32px (toolbar)

### Arquivos alterados

| Arquivo | Ação |
|---------|------|
| `extension/icon-16.png` | Novo |
| `extension/icon-32.png` | Novo |
| `extension/icon-48.png` | Regenerado |
| `extension/icon-128.png` | Regenerado |
| `extension/manifest.json` | Adicionar tamanhos 16 e 32 |
| `public/rhitmo-recorder-extension.zip` | Reempacotar |

