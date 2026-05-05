Em `src/components/AppSidebar.tsx`:

1. Remover o bloco do CTA que está acima da navegação (`<div className="px-2 pb-2"><SidebarFooterCTA persona={persona} /></div>`).
2. Inserir o CTA logo após o `</SidebarMenu>` da navegação principal (depois do item "Contexto"), antes do bloco do HR context switcher:

```tsx
{persona === 'leader' && (
  <div className="px-2 pt-3">
    <SidebarFooterCTA persona={persona} />
  </div>
)}
```

Resultado: Workspace → Início → 1:1s → Diário → Objetivos → Avaliações → Pulse → Contexto → **Pergunte ao Mentor** → (HR switcher / footer).

Sem mudanças em outros arquivos.