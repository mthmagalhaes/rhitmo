

## Edição do Rhitmo Sync no Portal do Liderado

### Resumo

Implementar um Dialog inline na tab "Meu Perfil" do DirectReportDashboard para que o liderado possa editar seu Rhitmo Sync diretamente, sem redirecionamento. Salvar via update direto na tabela `team_members` (RLS já permite linked users atualizarem seu próprio perfil). Atualizar badges com cores diferenciadas por tipo.

---

### Arquivo alterado

`src/components/dashboard/DirectReportDashboard.tsx`

---

### Detalhamento

#### 1. Novos imports

- `Dialog, DialogContent, DialogHeader, DialogTitle` de `@/components/ui/dialog`
- `Textarea` de `@/components/ui/textarea`
- `Label` de `@/components/ui/label`
- `Select, SelectContent, SelectItem, SelectTrigger, SelectValue` de `@/components/ui/select`
- `useQueryClient` de `@tanstack/react-query`

#### 2. Novo estado e lógica

```typescript
const [syncDialogOpen, setSyncDialogOpen] = useState(false);
const [syncSaving, setSyncSaving] = useState(false);
const [syncForm, setSyncForm] = useState({
  chronotype: linkedMember.chronotype || '',
  feedback_style: linkedMember.feedback_style || '',
  recognition_style: linkedMember.recognition_style || '',
  stress_signs: (linkedMember.work_style_data as any)?.stress_signs || '',
  motivators: (linkedMember.work_style_data as any)?.motivators || '',
});
const queryClient = useQueryClient();
```

#### 3. Função de save

- Update direto via `supabase.from('team_members').update(...)` onde `linked_user_id = auth.uid()` — a RLS policy "Linked users can update own basic profile" já autoriza isso
- Campos atualizados: `chronotype`, `feedback_style`, `recognition_style`, `work_style_data` (merge com dados existentes, adicionando `stress_signs` e `motivators`)
- **Não usar** `submit_rhitmo_sync_v2` porque ele bloqueia re-submissões (`WHERE work_style_data IS NULL`)
- On success: fechar dialog, toast de sucesso, invalidar query `['linked-member', ...]`
- On error: toast destructive
- Notificação ao líder: apenas `console.log` + toast (tabela `notifications` não existe)

#### 4. Dialog do formulário

Título: "Atualizar meu Rhitmo Sync", max-w-lg

5 campos:
| Campo | Tipo | Options |
|-------|------|---------|
| Cronotipo | Select | matutino, vespertino, noturno, variavel |
| Estilo de Feedback | Select | direto, contexto, particular, escrito |
| Estilo de Reconhecimento | Select | publico, particular, resultados, aprendizado |
| Sinais de estresse | Textarea | max 200 chars |
| Motivadores | Textarea | max 200 chars |

Pré-populados com dados existentes do `linkedMember`.

#### 5. Badges com cores diferenciadas

Substituir as 3 badges atualmente todas roxas por:
- `chronotype` → `bg-primary/10 text-primary` (roxo, como está)
- `feedback_style` → `bg-blue-50 text-blue-700`
- `recognition_style` → `bg-emerald-50 text-emerald-700`

Expandir labels para incluir novas opções do formulário.

#### 6. Botão "Atualizar Sync"

O `onClick` do botão existente passa a abrir o dialog: `setSyncDialogOpen(true)`.

#### 7. O que NÃO muda
- Estrutura das tabs, CareerCompassCard, FeedbackTimeline
- DirectReportGuard, rotas, nenhum outro arquivo
- Nenhuma migração de banco necessária

