

## Remover Vídeo Demo → Quick Start Contextual por Perfil

### O que muda

Substituir a seção "Comece por aqui: Tour Completo" (iframe YouTube) por um **Quick Start Checklist** contextual que muda conforme a tab ativa (Líder, Liderado, RH Admin). Cada checklist mostra 3-4 passos essenciais com ícones e links para as funcionalidades.

### Novo bloco (substitui linhas 393-408)

```text
┌──────────────────────────────────────────────┐
│  🚀 Quick Start: [perfil ativo]              │
│                                              │
│  ✅ Passo 1 — Crie seu Workspace            │
│  ○  Passo 2 — Adicione seu primeiro liderado │
│  ○  Passo 3 — Registre uma nota              │
│  ○  Passo 4 — Peça orientação ao Mentor IA   │
│                                              │
│  Barra de progresso: 1/4 concluídos          │
└──────────────────────────────────────────────┘
```

**Conteúdo por perfil:**

- **Líder**: Criar workspace → Adicionar liderado → Registrar nota → Usar Mentor IA
- **Liderado**: Completar Rhitmo Sync → Explorar Career Compass → Ver avaliações → Configurar perfil
- **RH Admin**: Acessar painel RH → Gerenciar times → Configurar competências → Ver analytics

### Design
- Card com `bg-primary/5 border-primary/20 rounded-2xl`
- Ícone `Rocket` no header
- Steps com checkbox visual (completado/pendente) — puramente visual, sem persistência
- Exibido dentro de cada `TabsContent` (acima dos feature cards), não fora das tabs

### Arquivo

| Arquivo | Ação |
|---------|------|
| `src/pages/HelpCenter.tsx` | Remover bloco vídeo (linhas 393-408), adicionar Quick Start dentro de cada TabsContent |

