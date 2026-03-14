

## Landing: Default Light com Toggle Manual

### Alteração única: `src/pages/Landing.tsx`

**1. Estado local de tema na Landing**

Adicionar `useState` para `landingTheme` inicializado a partir de `localStorage.getItem('theme')` — se não existir, default `'light'`. Um `useEffect` aplica/remove a classe `dark` no `document.documentElement` e salva no localStorage ao mudar.

Substituir o wrapper hardcoded `className="light"` por lógica condicional baseada no estado.

**2. Toggle no header**

Adicionar botão ghost/icon com `Moon` (em light) ou `Sun` (em dark) antes do botão "Entrar", tanto no desktop quanto no menu mobile.

```text
Desktop: [Logo] ·········· [🌙/☀️] [Entrar] [Começar grátis]
Mobile:  [Logo] ·········· [🌙/☀️] [☰]
```

**3. Cleanup ao desmontar**

No `useEffect`, ao desmontar (usuário navega para `/auth` ou `/dashboard`), restaurar o tema do ThemeProvider global para não interferir com a experiência logada. Ler o tema salvo do ThemeProvider ou simplesmente não fazer cleanup — o ThemeProvider global já gerencia ao montar nas páginas internas.

**Imports adicionais:** `useState` de react, `Moon`, `Sun` de lucide-react.

Nenhum outro arquivo alterado.

