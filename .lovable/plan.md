

## Ajustes na Central de Conhecimento

### 1. Renomear menu "Guia Rhitmo" → "Central de Conhecimento"

**Arquivo:** `src/components/AppSidebar.tsx`
- Linha 41: trocar `title: 'Guia Rhitmo'` para `title: 'Central de Conhecimento'`
- Linha 44: atualizar `leaderOnlyItems` com o novo nome

### 2. Adicionar card "Gravação de Reuniões" nos cards do Líder

**Arquivo:** `src/pages/HelpCenter.tsx`
- Adicionar novo card no array `leaderCards` (após o card de "Reuniões 1:1"):

```
{
  id: 'l-recording',
  icon: Mic,
  title: 'Gravação de Reuniões',
  subtitle: 'Grave reuniões e obtenha transcrições automáticas',
  steps: [
    'No perfil do liderado, clique em "Gravar Reunião".',
    'Uma janela popup será aberta — selecione a aba do Chrome com a reunião.',
    'A gravação roda na janela separada. Você pode continuar usando o Rhitmo normalmente.',
    'Ao parar a gravação, o áudio é transcrito automaticamente e as notas são classificadas pela IA.',
    'Atenção: não feche a janela do popup durante a gravação.',
  ],
}
```

### 3. Remover Quick Start dos 3 perfis

**Arquivo:** `src/pages/HelpCenter.tsx`
- Remover os 3 blocos `<QuickStartCard ... />` das TabsContent de leader, member e hr (linhas 396-404, 408-416, 420-428)

### Arquivos afetados

| Arquivo | Ação |
|---------|------|
| `src/components/AppSidebar.tsx` | Renomear item do menu |
| `src/pages/HelpCenter.tsx` | Remover Quick Starts + adicionar card de gravação |

