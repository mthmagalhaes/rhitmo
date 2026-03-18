

## Adicionar suporte PT/EN na Landing page

### Abordagem

Criar um objeto `translations` com chaves `pt` e `en` contendo todos os textos da landing. Usar `useState` para o idioma atual com detecção automática via `navigator.language` e persistência em `localStorage('rhitmo-lang')`. Adicionar dropdown de idioma com ícone Globe no header.

### Implementação — arquivo único: `src/pages/Landing.tsx`

**1. Imports**: Adicionar `Globe` do lucide-react, `DropdownMenu` components.

**2. Objeto de traduções** no topo do componente:
```typescript
const translations = {
  pt: {
    // Header
    signIn: "Entrar",
    getStarted: "Começar grátis",
    toggleTheme: "Alternar tema",
    // Hero
    heroTitle: "Nunca mais escreva uma avaliação de desempenho do zero.",
    heroSubtitle: "Com Rhitmo, líderes ganham tempo e organização...",
    seePlans: "Ver planos",
    // Video
    videoTitle: "Veja Rhitmo em ação",
    videoSubtitle: "Transforme a gestão do seu time em menos de 2 minutos.",
    // Seção Líderes
    forLeaders: "Para Líderes",
    leadersTitle: "Automatize o operacional. Lidere com confiança.",
    leadersP1: "É como ter um livro de gestão...",
    leadersP2: "Eleve o impacto das suas 1:1s...",
    // Seção Liderados
    forReports: "Para Pessoas Lideradas",
    reportsTitle: "Avaliações justas. Carreira sem surpresas.",
    reportsP1: "Chega de ter seu esforço esquecido...",
    reportsP2: "Use essa clareza para crescer...",
    // Seção RH
    forHR: "Para RH",
    hrTitle: "Escale a cultura. Elimine o gargalo operacional.",
    hrP1: "Garanta avaliações objetivas...",
    hrP2: "Vá além dos treinamentos...",
    // Pricing
    pricingTitle: "Simples. Transparente.",
    pricingSubtitle: "Comece grátis. Evolua quando seu time crescer.",
    // Pulse
    pulseSubtitle: "Para o líder que quer começar...",
    pulseFree: "Grátis",
    pulseForever: "· para sempre",
    pulseCTA: "Começar grátis",
    pulseFeatures: ["Até 3 liderados", ...],
    pulseLocked: ["Meu Rhitmo para liderados", ...],
    // Pro
    proSubtitle: "Para líderes que gerenciam até 5...",
    proNote: "14 dias grátis · cancele quando quiser",
    proCTA: "Começar com 14 dias grátis",
    proBadge: "Mais popular",
    proFeatures: ["Até 5 liderados", ...],
    // Business
    businessSubtitle: "Para empresas que querem...",
    businessNote: "Mínimo 3 líderes · R$267/mês",
    businessCTA: "Falar com a equipe",
    businessFeatures: ["Até 8 liderados por líder", ...],
    // Mockup
    mentorChatLabel: "Liderada: Maria Santos",
    chatQuestion: "Como dar feedback sobre atrasos sem desmotivar?",
    chatAnswer: "Baseado no perfil da Maria, sugiro...",
    chatPlaceholder: "Como posso ajudar você hoje?",
    // Footer
    footerRights: "© 2025 Rhitmo. Todos os direitos reservados.",
    footerLogin: "Já tem conta? Entrar",
  },
  en: {
    signIn: "Sign in",
    getStarted: "Get started free",
    heroTitle: "Never write a performance review from scratch again.",
    heroSubtitle: "With Rhitmo, managers gain time and clarity...",
    seePlans: "See plans",
    // ... todas as traduções EN conforme especificado
    footerRights: "© 2025 Rhitmo. All rights reserved.",
    footerLogin: "Already have an account? Sign in",
  }
}
```

**3. Estado de idioma** dentro do componente `Landing`:
```typescript
const [lang, setLang] = useState<'pt' | 'en'>(() => {
  const saved = localStorage.getItem('rhitmo-lang');
  if (saved === 'pt' || saved === 'en') return saved;
  const browserLang = navigator.language || navigator.languages?.[0] || 'pt';
  return browserLang.startsWith('pt') ? 'pt' : 'en';
});

useEffect(() => {
  localStorage.setItem('rhitmo-lang', lang);
}, [lang]);

const t = translations[lang];
```

**4. Toggle no header** — Globe button com DropdownMenu ao lado do toggle de tema (desktop e mobile):
```tsx
<DropdownMenu>
  <DropdownMenuTrigger asChild>
    <Button variant="ghost" size="icon" className="rounded-full">
      <Globe className="h-[18px] w-[18px]" />
    </Button>
  </DropdownMenuTrigger>
  <DropdownMenuContent align="end">
    <DropdownMenuItem onClick={() => setLang('pt')}>
      🇧🇷 Português {lang === 'pt' && <Check className="ml-auto h-4 w-4" />}
    </DropdownMenuItem>
    <DropdownMenuItem onClick={() => setLang('en')}>
      🇺🇸 English {lang === 'en' && <Check className="ml-auto h-4 w-4" />}
    </DropdownMenuItem>
  </DropdownMenuContent>
</DropdownMenu>
```

**5. Substituir todas as strings hardcoded** por `t.chave` — hero, seções de features, pricing cards, mockup do chat, footer.

**6. SimpleChatMockup** receberá `t` como prop para traduzir textos internos.

### Arquivos afetados
- `src/pages/Landing.tsx` — único arquivo editado

### Sem alterações
- Imagens, design system, toggle de tema, animações, CTAs de href, outras páginas

