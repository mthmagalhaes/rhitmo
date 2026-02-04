

## Plano: Profissionalização do PDF de Avaliação

### Objetivo

Gerar um PDF limpo, profissional, com margens brancas, sem artefatos de navegador (URLs, datas de impressão) e com cabeçalho rico mostrando o período avaliado.

---

### Estado Atual

| Item | Situação |
|------|----------|
| PDF Export | Mostra "about:blank", headers/footers do browser |
| Período Avaliado | Não é exibido no PDF (não está salvo no banco) |
| Página em Branco | PDF gera página final vazia |
| Tabela `performance_reviews` | Não tem colunas `period_start` e `period_end` |

---

### Parte 1: Migração do Banco de Dados

Adicionar colunas para armazenar as datas do período avaliado:

```sql
ALTER TABLE performance_reviews
ADD COLUMN period_start TIMESTAMPTZ,
ADD COLUMN period_end TIMESTAMPTZ;
```

**Justificativa**: Sem essas colunas, não há como exibir "Período Avaliado: 01/10/2025 a 31/12/2025" no PDF.

---

### Parte 2: Alterações no NewReviewDialog.tsx

Salvar as datas do período ao criar a avaliação:

```typescript
const { error } = await supabase
  .from('performance_reviews')
  .insert({
    member_id: memberId,
    title: title.trim(),
    content: content.trim(),
    coaching_tip: coachingTip,
    period_type: generatedMonths ? periodTypeMap[generatedMonths] : 'manual',
    period_start: dateRange?.from?.toISOString(),  // NOVO
    period_end: dateRange?.to?.toISOString()       // NOVO
  });
```

---

### Parte 3: Alterações na Interface PerformanceReview

Atualizar a interface em ambos os arquivos para incluir as novas propriedades:

```typescript
interface PerformanceReview {
  id: string;
  title: string;
  content: string;
  coaching_tip?: string | null;
  period_type: string;
  period_start?: string | null;  // NOVO
  period_end?: string | null;    // NOVO
  created_at: string;
}
```

---

### Parte 4: Alterações no PerformanceReviewList.tsx

Adicionar as colunas no SELECT:

```typescript
const { data, error } = await supabase
  .from('performance_reviews')
  .select('id, title, content, coaching_tip, period_type, period_start, period_end, created_at')
  .eq('member_id', memberId)
  .order('created_at', { ascending: false });
```

---

### Parte 5: Profissionalização do PDF (ReviewViewDialog.tsx)

**5.1 - Remover Artefatos do Navegador:**

```css
@page {
  margin: 0;
  size: auto;
}

@media print {
  html, body {
    margin: 0;
    padding: 0;
    -webkit-print-color-adjust: exact;
    print-color-adjust: exact;
  }
  
  /* Container principal sem quebra forçada */
  .content-wrapper {
    height: auto !important;
    display: block;
    page-break-after: avoid;
  }
}
```

**5.2 - Cabeçalho Rico com Período Avaliado:**

```typescript
const handleExportPDF = () => {
  const printWindow = window.open('', '_blank');
  if (!printWindow) { /* erro */ }

  const htmlContent = review.content.includes('</')
    ? review.content
    : marked(review.content);

  // Formatar período
  const periodStart = review.period_start 
    ? new Date(review.period_start).toLocaleDateString('pt-BR', { day: '2-digit', month: 'long', year: 'numeric' })
    : null;
  const periodEnd = review.period_end 
    ? new Date(review.period_end).toLocaleDateString('pt-BR', { day: '2-digit', month: 'long', year: 'numeric' })
    : null;
  
  const periodText = periodStart && periodEnd 
    ? `${periodStart} a ${periodEnd}` 
    : 'Período não especificado';

  printWindow.document.write(`
    <!DOCTYPE html>
    <html>
      <head>
        <title>${review.title}</title>
        <style>
          @page {
            margin: 0;
            size: A4;
          }
          
          * {
            box-sizing: border-box;
          }
          
          html, body {
            margin: 0;
            padding: 0;
            font-family: 'Segoe UI', Arial, sans-serif;
            line-height: 1.6;
            color: #333;
            -webkit-print-color-adjust: exact;
            print-color-adjust: exact;
          }
          
          .document {
            padding: 2cm;
            max-width: 100%;
            height: auto;
          }
          
          /* Header */
          .header {
            border-bottom: 3px solid #7C3AED;
            padding-bottom: 20px;
            margin-bottom: 30px;
          }
          
          h1 {
            color: #222;
            margin: 0 0 16px 0;
            font-size: 24px;
          }
          
          .metadata {
            color: #666;
            font-size: 0.9em;
          }
          
          .metadata p {
            margin: 4px 0;
          }
          
          .period-highlight {
            background-color: #F3F4F6;
            padding: 8px 12px;
            border-radius: 4px;
            margin-top: 12px;
            display: inline-block;
          }
          
          /* Content Styles */
          h2 { 
            color: #444; 
            margin-top: 28px;
            margin-bottom: 12px;
            font-size: 18px;
          }
          
          h3 {
            color: #555;
            margin-top: 20px;
            margin-bottom: 10px;
            font-size: 16px;
          }
          
          ul, ol { 
            padding-left: 24px;
            margin: 12px 0;
          }
          
          li {
            margin: 6px 0;
          }
          
          p {
            margin: 10px 0;
          }
          
          strong {
            color: #222;
          }
          
          /* Evitar página em branco */
          .content {
            height: auto !important;
            page-break-inside: auto;
          }
          
          @media print {
            .document {
              padding: 1.5cm;
            }
          }
        </style>
      </head>
      <body>
        <div class="document">
          <div class="header">
            <h1>${review.title}</h1>
            <div class="metadata">
              <p><strong>Colaborador:</strong> <!-- Nome se disponível --></p>
              <p><strong>Data de Criação:</strong> ${new Date(review.created_at).toLocaleDateString('pt-BR', { 
                day: '2-digit', 
                month: 'long', 
                year: 'numeric' 
              })}</p>
              <div class="period-highlight">
                <strong>📅 Período Avaliado:</strong> ${periodText}
              </div>
            </div>
          </div>
          <div class="content">
            ${htmlContent}
          </div>
        </div>
      </body>
    </html>
  `);
  
  printWindow.document.close();
  setTimeout(() => {
    printWindow.print();
  }, 300);
};
```

---

### Parte 6: Passar o Nome do Membro para o PDF

Atualizar as props do `ReviewViewDialog` para receber `memberName`:

```typescript
// PerformanceReviewList.tsx
<ReviewViewDialog
  ...
  memberName={memberName}  // NOVO
/>

// ReviewViewDialog.tsx
interface ReviewViewDialogProps {
  ...
  memberName?: string;  // NOVO
}
```

E usar no cabeçalho:

```html
<p><strong>Colaborador:</strong> ${memberName || 'Não informado'}</p>
```

---

### Resumo das Alterações

| Arquivo | Alteração |
|---------|-----------|
| `migrations/` | Adicionar colunas `period_start` e `period_end` |
| `NewReviewDialog.tsx` | Salvar datas ao criar avaliação |
| `PerformanceReviewList.tsx` | Buscar novas colunas, passar `memberName` |
| `ReviewViewDialog.tsx` | Interface atualizada, PDF profissionalizado |

---

### Seção Técnica

**CSS para Remover Headers/Footers do Browser:**

O problema é que navegadores automaticamente adicionam URL, data e hora em prints. A solução é usar `@page { margin: 0 }` que remove a área onde esses headers são renderizados, e então usar padding interno no documento.

**Prevenção de Página em Branco:**

A página em branco geralmente é causada por:
1. `height: 100vh` ou `min-height: 100vh` no container
2. `flex: 1` que ocupa espaço restante
3. Margens ou padding excessivos

A solução é usar `height: auto !important` no container de conteúdo e evitar `page-break-after` desnecessários.

**Fluxo de Dados:**

```text
1. Usuário seleciona período no DateRangePicker
2. Clica "Salvar Avaliação"
3. NewReviewDialog salva period_start/period_end no banco
4. PerformanceReviewList busca dados incluindo novas colunas
5. ReviewViewDialog recebe período e memberName
6. handleExportPDF gera HTML com cabeçalho rico
7. PDF é gerado sem artefatos de navegador ✓
```

