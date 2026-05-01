---
name: Workspace Switcher Actions
description: WorkspaceSwitcher (sidebar topo) concentra Settings, Central de Ajuda e Convidar membros — padrão Windmill/Linear; convite NÃO deve ser duplicado em headers de páginas internas
type: design
---

O dropdown do `WorkspaceSwitcher` (canto superior esquerdo da sidebar) é o ponto único de ações de organização:

1. **Workspaces** (lista, só aparece se houver >1)
2. **Configurações** → navega para `/lider/configuracoes` ou `/liderado/configuracoes` conforme persona
3. **Central de Ajuda** → navega para `…/configuracoes?tab=ajuda`
4. **Convidar membros** → abre `BulkOnboardDialog` (somente persona = `leader`, via prop `onOpenInvite` passada pelo `AppSidebar`)

**Regras:**
- O dropdown é renderizado **sempre**, mesmo com 1 workspace (porque tem ações úteis).
- O dialog `BulkOnboardDialog` é instanciado UMA ÚNICA VEZ no `AppSidebar` — outras telas chamam via callback, não duplicam o dialog no DOM.
- **Não duplicar** o botão "Convidar membros" em headers de páginas (Diário, Objetivos, Avaliações, Pessoas). A página `/lider/pessoas` mantém o botão dentro da aba "Convites" (contexto operacional), mas removeu do header global.
- O rodapé da sidebar NÃO tem mais botão de Convidar — fica só Configurações + Suporte (LifeBuoy) + perfil.
