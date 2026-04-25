## Escala de roxo (50→900) + shadows roxas para o design system

Adicionar uma escala completa de roxo como tokens HSL e shadows roxas para CTAs destacados. **Sem alterar `--primary` atual** (262 83% 58%) — apenas estender o sistema com novas variáveis e mapeá-las no Tailwind.

### Mudanças

**1. `src/index.css` — bloco `:root` (light)**

Adicionar dentro de `:root`, logo após o bloco `Primária — Roxo Rhitmo`:

```css
/* ── Escala de roxo (Primary scale) ── */
--primary-50:  262 100% 97%;
--primary-100: 262 90% 94%;
--primary-200: 262 85% 87%;
--primary-300: 262 83% 76%;
--primary-400: 262 83% 66%;
--primary-500: 262 83% 58%;   /* = --primary */
--primary-600: 262 75% 50%;
--primary-700: 262 70% 42%;
--primary-800: 262 65% 32%;
--primary-900: 262 60% 22%;
```

E também os tokens de shadow roxa, junto ao bloco de Shadows:

```css
--shadow-purple:    0 10px 30px -8px hsl(262 83% 58% / 0.35);
--shadow-purple-lg: 0 20px 50px -12px hsl(262 83% 58% / 0.4);
```

**2. `src/index.css` — bloco `.dark`**

No dark, a primária base é `263 86% 76%` (mais clara). Para preservar contraste, a escala dark é "invertida" — tons claros (50/100) são desaturados/escuros e tons escuros (800/900) ficam mais claros e vivos:

```css
/* ── Escala de roxo (dark) ── */
--primary-50:  263 30% 18%;
--primary-100: 263 35% 24%;
--primary-200: 263 45% 32%;
--primary-300: 263 60% 45%;
--primary-400: 263 75% 60%;
--primary-500: 263 86% 76%;   /* = --primary dark */
--primary-600: 263 88% 82%;
--primary-700: 263 90% 87%;
--primary-800: 263 92% 92%;
--primary-900: 263 95% 96%;
```

Shadows roxas no dark (mais sutis sobre fundo escuro):

```css
--shadow-purple:    0 10px 30px -8px hsl(263 86% 76% / 0.25);
--shadow-purple-lg: 0 20px 50px -12px hsl(263 86% 76% / 0.3);
```

**3. `tailwind.config.ts` — `theme.extend.colors.primary`**

Estender o objeto `primary` mantendo `DEFAULT` e `foreground` intactos:

```ts
primary: {
  DEFAULT:    "hsl(var(--primary))",
  foreground: "hsl(var(--primary-foreground))",
  50:  "hsl(var(--primary-50))",
  100: "hsl(var(--primary-100))",
  200: "hsl(var(--primary-200))",
  300: "hsl(var(--primary-300))",
  400: "hsl(var(--primary-400))",
  500: "hsl(var(--primary-500))",
  600: "hsl(var(--primary-600))",
  700: "hsl(var(--primary-700))",
  800: "hsl(var(--primary-800))",
  900: "hsl(var(--primary-900))",
},
```

**4. `tailwind.config.ts` — `theme.extend.boxShadow`**

Adicionar as shadows roxas ao mapa existente:

```ts
boxShadow: {
  // ... tokens existentes
  purple:    "var(--shadow-purple)",
  "purple-lg": "var(--shadow-purple-lg)",
},
```

### Como usar (hierarquia recomendada)

- `bg-primary-50` / `bg-primary-100` — superfícies sutis (badges, hover de itens)
- `bg-primary-200` / `text-primary-300` — bordas, dividers, decoração
- `bg-primary-500` / `bg-primary` — CTAs principais (mantido como hoje)
- `bg-primary-600` / `bg-primary-700` — hover/active de CTAs
- `bg-primary-800` / `bg-primary-900` — superfícies escuras com texto branco
- `shadow-purple` — CTAs destacados na landing (botão "Começar agora")
- `shadow-purple-lg` — heros e cards de pricing em destaque

### Garantias

- `--primary` atual (262 83% 58%) **não é alterado** — `bg-primary` continua exatamente igual
- Nenhum componente existente quebra (escalas são aditivas)
- Dark mode tem escala consistente com a inversão de luminância já usada na primary do `.dark`
- Sem mudança em código de componentes — apenas novos tokens disponíveis
