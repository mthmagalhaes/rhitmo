

## Plano: Refinamento Bento/Soft UI na Tela de Login

A tela de login ja possui o split layout 50/50 com hero image e overlay violeta. Este plano aplica os refinamentos Soft UI para alinhar com o design system Bento.

---

### Arquivo: `src/components/Auth.tsx`

**1. Coluna Esquerda - Copy do Hero (linhas 142-150)**
- Titulo: mudar para "Sua Lideranca, em outro Rhitmo." com destaque emerald em "Rhitmo."
- Subtitulo: mudar para "A plataforma que transforma conversas em performance."

**2. Coluna Direita - Container do formulario (linha 155)**
- Adicionar `animate-fade-in` ao wrapper `max-w-md` para entrada suave

**3. Inputs - Estilo Soft (todas as instancias)**
- Adicionar classe override em cada Input: `rounded-xl bg-muted/30 border-0 ring-1 ring-input focus-visible:ring-2 focus-visible:ring-primary`

**4. Botoes principais (linhas 223, 319)**
- De: `className="w-full"`
- Para: `className="w-full h-12 rounded-xl font-bold text-base"`

**5. Botao Google (linhas 239-265, 335-361)**
- Adicionar: `rounded-xl h-12`

**6. Invite banner (linha 174)**
- De: `rounded-lg`
- Para: `rounded-xl`

**7. Divider "ou continue com" (linhas 228-237, 324-333)**
- Background span: manter `bg-background` (funciona com ambos os temas)

---

### Arquivos Modificados

| Arquivo | Tipo | Descricao |
|---------|------|-----------|
| `src/components/Auth.tsx` | Modificar | Copy hero, inputs rounded-xl, botoes h-12, animate-fade-in |

Nenhuma logica de autenticacao sera alterada. Apenas classes Tailwind e texto de copy.
