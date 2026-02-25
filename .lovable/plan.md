

## Correção de dois bugs na tab "Meu Perfil"

### Arquivo alterado
`src/components/dashboard/DirectReportDashboard.tsx`

### Fix 1 — Toast do botão "Editar" no card Informações da Funcao (linha 367)

Substituir:
```typescript
onClick={() => toast('Em breve você poderá editar seu Rhitmo Sync diretamente aqui')}
```
Por:
```typescript
onClick={() => toast('Em breve você poderá atualizar suas informações de função diretamente aqui.', { description: 'Edição de perfil' })}
```

Ou, usando o padrão `toast()` com title/description invertidos para ficar mais claro:
```typescript
onClick={() => toast('Edição de perfil', { description: 'Em breve você poderá atualizar suas informações de função diretamente aqui.' })}
```

### Fix 2 — Labels dos badges traduzidos (linhas 49-64)

Expandir os 3 mapas de labels para cobrir TODAS as keys usadas no banco (incluindo as em ingles que vem do wizard):

```typescript
const chronotypeLabels: Record<string, string> = {
  'early_bird': 'Madrugador (5h-14h)',
  'madrugador': 'Madrugador (5h-14h)',
  'commercial': 'Horario Comercial',
  'comercial': 'Horario Comercial',
  'night_owl': 'Noturno (depois das 18h)',
  'noturno': 'Noturno (depois das 18h)',
  'variable': 'Variavel',
};

const feedbackStyleLabels: Record<string, string> = {
  'direct': 'Direto',
  'direto': 'Direto',
  'empathetic': 'Empatico / Sanduiche',
  'empatico': 'Empatico / Sanduiche',
  'written': 'Escrito',
  'escrito': 'Escrito',
  'private': 'Em particular',
  'privado': 'Em particular',
  'context': 'Com contexto e exemplos',
};

const recognitionStyleLabels: Record<string, string> = {
  'public': 'Reconhecimento Publico',
  'publico': 'Reconhecimento Publico',
  'private': 'Reconhecimento Privado',
  'privado': 'Reconhecimento Privado',
  'results': 'Por Resultados',
  'learning': 'Por Aprendizado',
};
```

Adicionar helper `getLabel`:
```typescript
const getLabel = (map: Record<string, string>, value: string) =>
  map[value] || value.charAt(0).toUpperCase() + value.slice(1);
```

Aplicar `getLabel` nos 3 badges (linhas 461, 471, 481) para que valores nao mapeados tambem sejam capitalizados em vez de exibir o valor bruto.

### O que NAO muda
- Dialog syncDialog, layout das tabs, CareerCompassCard, FeedbackTimeline
- Linhas de contexto dos badges (ja estao corretas pois os context maps ja cobrem as keys em ingles)
- Nenhum outro arquivo

