

## Adicionar Seção de Pricing na Landing Page

### Alteração única: `src/pages/Landing.tsx`

Inserir uma nova `<section id="pricing">` entre a seção "Para RH" (linha 355) e o Footer (linha 357).

**Imports adicionais:** `Check`, `Lock` de `lucide-react`

**Estrutura da seção:**

```text
┌─────────────────────────────────────────────┐
│  "Simples. Transparente."                   │
│  "Comece grátis. Evolua quando..."          │
│                                             │
│  ┌─────────┐  ┌──────────┐  ┌──────────┐   │
│  │  Pulse  │  │▲ Pro ▲   │  │ Business │   │
│  │  Grátis │  │ R$69/mês │  │ R$89/mês │   │
│  │         │  │ -translate│  │          │   │
│  │ ✓ feat  │  │  -y-2    │  │ ✓ feat   │   │
│  │ 🔒 bloq │  │ border-2 │  │          │   │
│  │         │  │ primary  │  │          │   │
│  └─────────┘  └──────────┘  └──────────┘   │
└─────────────────────────────────────────────┘
```

- Grid: `grid-cols-1 md:grid-cols-3 gap-8`
- Card Pro: `border-2 border-primary md:-translate-y-2` com badge "Mais popular" acima
- Features bloqueadas no Pulse: `opacity-50` + `Lock` icon + `text-muted-foreground`
- Fundo da seção: `bg-muted/30` para alternar com a seção anterior (fundo branco)
- Cards: `bg-card rounded-2xl shadow-sm p-8`
- CTAs: Pulse e Pro → `navigate('/auth?mode=signup')`, Business → `mailto:matheus@rhitmo.co`

Dados dos planos definidos como array constante inline para manter tudo autocontido no arquivo. Nenhum outro arquivo alterado.

