

## Plano: Refatoracao Visual Bento Grid / Soft UI

Refatoracao puramente visual do `DirectReportDashboard` e `CareerCompassCard`. Nenhuma logica de dados sera alterada.

---

## Mudancas por Arquivo

### 1. `src/components/dashboard/DirectReportDashboard.tsx`

**Fundo da pagina**
- `bg-background` passa a `bg-muted/30` (cinza suave como base Bento)

**Header**
- Remover `border-b bg-card` e usar apenas um container limpo
- Titulo: adicionar `tracking-tight` e aumentar para `text-3xl`
- Subtitulo: leve e menor

**Layout principal (Bento Grid)**
- Substituir o layout atual (stack + grid 2 cols) por um CSS Grid unico:
  ```
  grid-cols-1 lg:grid-cols-3
  ```
- Career Compass: `lg:col-span-3` (full width, destaque)
- Meu Perfil: `lg:col-span-1` (coluna estreita)
- Minhas Anotacoes: `lg:col-span-2` (coluna larga)

**Estilo dos Cards (containers)**
- Substituir `<Card className="p-6">` por containers com:
  - `rounded-2xl` (bordas organicas)
  - `bg-card border-0 shadow-[0_2px_20px_rgba(0,0,0,0.04)]` (sombra soft, sem borda)
  - Hover: `hover:-translate-y-1 hover:shadow-lg transition-all duration-300`
- Titulos dos cards: `tracking-tight font-bold` (editorial)
- Tags de interesse: `rounded-xl` em vez de `rounded-md`

### 2. `src/components/dashboard/CareerCompassCard.tsx`

**Card externo**
- Remover `border-primary/20` 
- Adicionar: `rounded-2xl border-0 shadow-[0_2px_20px_rgba(0,0,0,0.04)] bg-gradient-to-br from-card to-primary/5`
- Hover: `hover:-translate-y-1 hover:shadow-lg transition-all duration-300`

**Titulo**
- `tracking-tight font-bold text-xl` (editorial)

**Bloco de summary**
- `rounded-xl` em vez de `rounded-lg`

**Progress bar**
- `rounded-full` (ja e padrao, manter)

---

## Resumo Visual (Antes vs Depois)

```text
ANTES:                          DEPOIS:
+---------------------------+   +-------------------------------+
| [Career Compass] full     |   | [Career Compass] full width   |
+---------------------------+   |  gradient sutil, sem borda     |
| [Perfil] | [Anotacoes]    |   |  rounded-2xl, shadow soft     |
| 50/50    | 50/50          |   +-------------------------------+
+---------------------------+   | [Perfil]  |  [Anotacoes]      |
                                |  1/3      |  2/3              |
                                |  hover    |  hover lift       |
                                +-------------------------------+
```

---

## Arquivos Modificados

| Arquivo | Tipo | Descricao |
|---------|------|-----------|
| `DirectReportDashboard.tsx` | Modificar | Layout Bento Grid + estilos Soft UI |
| `CareerCompassCard.tsx` | Modificar | Rounded-2xl, shadow soft, hover lift |

Nenhuma logica de dados ou props sera alterada. Apenas classes Tailwind e estrutura JSX de containers.

