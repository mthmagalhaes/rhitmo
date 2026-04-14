

## Diagnóstico: por que a tela fica em branco ao sincronizar

### Causa raiz: crash silencioso no React (sem Error Boundary)

A edge function `fetch-calendar-events` **funciona corretamente** — os logs mostram:
- 9 eventos buscados do Google
- 5 reuniões casaram com liderados (incluindo a da Giovanna)
- Token renovado com sucesso

O problema está no frontend:

1. **`supabase.functions.invoke` pode retornar erro em formato inesperado.** Quando a edge function retorna status não-2xx, o SDK retorna um `FunctionsHttpError` (não um `Error` padrão). O `throw error` na queryFn pode lançar um objeto sem `.message`, causando crash no render quando o componente tenta acessar `(syncError as Error)?.message`.

2. **Sem Error Boundary.** O `UpcomingMeetingsCard` é renderizado diretamente no `Index.tsx` sem proteção. Se o componente crashar durante render, o React desmonta a **árvore inteira** — resultando na tela completamente em branco (só o background).

3. **Invalidações com chave antiga.** `useCalendarIntegration.ts` ainda usa `['upcoming-meetings']` (chave antiga) nos handlers de `disconnectCalendar` (linha 91) e `toggleAutoTranscribe` (linha 110), em vez de `['calendar-upcoming-meetings']`. Isso pode causar comportamento imprevisível no cache.

---

## Plano de correção

### 1. Proteger a queryFn contra erros não-padrão
**Arquivo:** `src/hooks/useCalendarIntegration.ts`

Na queryFn de `calendar-upcoming-meetings`:
- Tratar o retorno de `supabase.functions.invoke` de forma mais defensiva
- Se `error` for um `FunctionsHttpError`, extrair a mensagem do body
- Garantir que o `throw` sempre lance um `Error` com `.message` legível

### 2. Corrigir chaves de invalidação obsoletas
**Arquivo:** `src/hooks/useCalendarIntegration.ts`

- Linha 91: trocar `['upcoming-meetings']` por `['calendar-upcoming-meetings']`
- Linha 110: trocar `['upcoming-meetings']` por `['calendar-upcoming-meetings']`

### 3. Adicionar Error Boundary ao redor do card
**Arquivo:** `src/pages/Index.tsx`

- Envolver `<UpcomingMeetingsCard />` em um Error Boundary simples
- Se o card crashar, mostrar um fallback amigável em vez de derrubar a página inteira

### 4. Hardening do componente de meetings
**Arquivo:** `src/components/dashboard/UpcomingMeetingsCard.tsx`

- Adicionar try/catch defensivo no `getTimeBadge` para datas inválidas
- Garantir que `syncError?.message` nunca cause crash (safe access)

---

## Arquivos a modificar
- `src/hooks/useCalendarIntegration.ts` — error handling + chaves
- `src/pages/Index.tsx` — Error Boundary
- `src/components/dashboard/UpcomingMeetingsCard.tsx` — hardening defensivo

## Resultado esperado
- Clicar em "Sincronizar" mostra spinner e depois as 5 reuniões (incluindo Giovanna)
- Se houver erro, o card mostra a mensagem em vez de derrubar a página
- A tela nunca mais fica em branco por crash no card de reuniões

