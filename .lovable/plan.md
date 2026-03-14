

## Alterações de Lançamento — 2 tarefas

### 1. Remover Badge "Beta"

| Arquivo | Alteração |
|---|---|
| `src/components/AppSidebar.tsx` (linha 85) | Remover a linha `{open && <Badge ...>Beta</Badge>}` e o import de `Badge` |

O badge na Billing page (`src/pages/Billing.tsx`) não será alterado pois faz parte do conteúdo de billing/beta-tester — escopo diferente conforme instrução.

### 2. Landing Page — CTA de Cadastro

**`src/pages/Landing.tsx`** — substituir referências à waitlist por fluxo direto:

- Remover state `waitlistOpen` e import de `WaitlistDialog`
- **Hero CTA** (linha 200): `"Entrar na Lista de Espera"` → `"Começar grátis"` com `onClick={() => navigate('/auth?mode=signup')}`
- **Navbar desktop** (linha 148): `"Lista de Espera"` → `"Começar grátis"` com `Link to="/auth?mode=signup"`
- **Navbar mobile** (linha 171): Mesmo ajuste
- Adicionar **CTA secundário** ao Hero: `"Ver planos"` com `variant="outline"` e `href="#pricing"` (âncora para seção futura)
- Remover `<WaitlistDialog>` do final do componente
- Remover import de `WaitlistDialog`

Nenhuma outra seção ou componente é alterado.

