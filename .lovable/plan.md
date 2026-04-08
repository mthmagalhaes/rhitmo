

## Roadmap: Pricing + Comunicação + Proposta de Valor

Dado o tamanho das mudanças, divido em **3 fases independentes** para implementar de forma segura sem quebrar nada existente.

---

### FASE 1 — Pricing Enterprise (backend + página dedicada)
*Pode ser implementada isoladamente, sem tocar na landing atual.*

**1.1 Migration: tabela `enterprise_leads`**
```sql
CREATE TABLE enterprise_leads (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  full_name TEXT NOT NULL,
  email TEXT NOT NULL,
  company TEXT NOT NULL,
  job_title TEXT NOT NULL,
  company_size TEXT NOT NULL,
  phone TEXT,
  message TEXT,
  consent BOOLEAN DEFAULT false,
  status TEXT DEFAULT 'new',
  created_at TIMESTAMPTZ DEFAULT now()
);
ALTER TABLE enterprise_leads ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Admins can read" ON enterprise_leads FOR SELECT TO authenticated USING (public.is_admin());
```

**1.2 Edge Function: `enterprise-contact/index.ts`**
- Valida input com Zod (email corporativo, telefone BR, nome com 2+ palavras)
- Insere em `enterprise_leads` via service_role
- Envia email de notificação para equipe via template transacional existente
- Retorna 200 com mensagem de sucesso

**1.3 Página: `src/pages/Enterprise.tsx`**
- Hero com tom corporativo (navy blue `#1e3a8a`, emerald CTAs `#10b981`)
- Seção de diferenciais enterprise (SSO, API, CSM, SLA, LGPD, SAP/TOTVS)
- Card de pricing: "A partir de R$15/colaborador/mês, mínimo 100"
- Formulário com validações (email corporativo, telefone BR, nome completo)
- Layout: 2 colunas desktop (conteúdo + form), stack mobile
- Toast de sucesso/erro

**1.4 Rota: `src/App.tsx`**
- Adicionar `<Route path="/enterprise" element={<Enterprise />} />`

**1.5 Landing (mínimo): Adicionar card Enterprise na seção pricing**
- 4o card ao lado de Pulse/Pro/Business
- Grid muda de `md:grid-cols-3` para `md:grid-cols-4` (ou 2x2 mobile)
- CTA: "Falar com Vendas" → link para `/enterprise`
- Header: adicionar link "Enterprise" no nav

| Arquivo | Ação |
|---------|------|
| `supabase/migrations/...` | Nova tabela `enterprise_leads` |
| `supabase/functions/enterprise-contact/index.ts` | Nova edge function |
| `src/pages/Enterprise.tsx` | Nova página |
| `src/App.tsx` | Nova rota |
| `src/pages/Landing.tsx` | Card Enterprise + link header |

---

### FASE 2 — Comunicação (rewrite do conteúdo da landing)
*Altera apenas textos e adiciona seções. Nenhuma mudança de backend.*

**2.1 Hero: Subhead mais agressivo**
- Substituir subhead genérico por: "O que levava 4 horas agora leva 2 minutos. Rhitmo e o unico parceiro AI-nativo de lideranca que transforma suas conversas em reviews prontas."
- Badge abaixo dos CTAs: "AI-Native desde o dia 1 — Nao e um add-on"

**2.2 Nova seção: "Antes vs. Depois"** (logo após hero)
- 2 colunas: "Sem Rhitmo" (cinza, lista negativa) vs. "Com Rhitmo" (roxo, lista positiva)
- Itens com numeros concretos (4h, 70%, 30 seg)

**2.3 Nova seção: "Rhitmo vs. Outros"** (comparison table)
- Tabela: Planilhas / Qulture.Rocks / Lattice / Rhitmo
- 6 linhas de features com check/X/parcial
- Mobile: cards colapsáveis

**2.4 Nova seção: "Numeros Concretos"**
- 3 cards: "4h → 2min" / "38x mais vies" / "R$49 vs R$108"

**2.5 Nova seção: "O que so Rhitmo faz"** (3 USPs)
- IA que escreve / Detecção de vies / Transcrição automática

**2.6 Tom de voz: limpar textos genéricos**
- Atualizar translations pt + en removendo frases institucionais
- Substituir por frases com números e comparações

**2.7 Footer: links comparativos**
- "Rhitmo vs. Qulture.Rocks" / "vs. Feedz" / "vs. Lattice" (placeholder links)

| Arquivo | Ação |
|---------|------|
| `src/pages/Landing.tsx` | Rewrite de translations + 4 novas seções + footer |

---

### FASE 3 — Proposta de Valor (positioning + novas páginas)
*Adiciona seções de positioning e páginas auxiliares.*

**3.1 Nova seção: "Para quem e Rhitmo"** (3 cards: Lider / PME / Enterprise)

**3.2 Nova seção: "O que Rhitmo NÃO é"** (positioning honesto)
- Lista do que não faz ainda (360°, OKRs, clima) com timeline
- Tom construtivo, não defensivo

**3.3 Nova seção: "Positioning Statement"** (manifesto)
- Background gradient escuro, texto bold central

**3.4 Componente: `AINativeBadge.tsx`**
- Reutilizável, adicionado em hero, header, footer, comparison table

**3.5 Nova seção: "Como funciona"** (3 passos)
- Timeline horizontal desktop / vertical mobile
- Registre 1:1s → IA analisa → Review pronta

**3.6 FAQ section**
- 4-5 perguntas honestas com respostas diretas
- Accordion colapsável

**3.7 Página: `src/pages/Roadmap.tsx`**
- Timeline visual com quarters (Q2-Q4/2026 + 2027)
- Cada item com status (done/wip/planned)
- Rota: `/roadmap`

**3.8 Meta tags SEO**
- Atualizar title/description em `index.html`

| Arquivo | Ação |
|---------|------|
| `src/components/ui/AINativeBadge.tsx` | Novo componente |
| `src/pages/Landing.tsx` | 4 novas seções + FAQ + badge |
| `src/pages/Roadmap.tsx` | Nova página |
| `src/App.tsx` | Rota `/roadmap` |
| `index.html` | Meta tags SEO |

---

### Ordem de execução recomendada

```text
FASE 1 (Pricing)     → independente, pode ir primeiro
FASE 2 (Comunicação) → depende de nada, pode ir em paralelo
FASE 3 (Prop. Valor) → idealmente após Fase 2 (mesma página)
```

Sugiro implementar **Fase 1 primeiro** (é autocontida: tabela + edge function + página + card), depois **Fases 2 e 3 juntas** (ambas editam Landing.tsx, melhor fazer de uma vez para evitar conflitos).

### O que NÃO muda
- Planos Pulse/Pro/Business: intactos (pricing, features, checkout)
- Página `/billing`: sem alterações
- `usePlanLimits.ts`: sem alterações
- Guardrails existentes: preservados
- Design system do app (sidebar, dashboard): sem alterações
