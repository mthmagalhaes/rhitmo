

## Corrigir Flickering de Avatares e Design System no Dashboard

### Diagnóstico

Existem **dois problemas** causando inconsistência:

**1. Cadeia de fallback de avatares quebrada**
Há 3 sistemas de avatar competindo:
- `Index.tsx` (linha 587): gera fallback DiceBear se `member.avatar` é null → passa para `TeamMemberCard`
- `MemberAvatar.tsx`: tem seu próprio fallback via Boring Avatars (API externa instável)
- Se ambas as APIs externas falham → mostra iniciais (GL, GB, GC)

O resultado: dependendo de qual API responde primeiro (ou falha), o avatar muda visualmente. A `source.boringavatars.com` é particularmente instável.

**2. Fallback DiceBear genérico no Index.tsx**
Na linha 587, quando `member.avatar` é null, o código cria um DiceBear com seed do nome — isso gera avatares aleatórios sem consistência de gênero. Mas os membros que já escolheram avatar na biblioteca mostram o correto.

### Solução

**A. Unificar cadeia de fallback no `MemberAvatar.tsx`**
- Remover o fallback Boring Avatars (API instável)
- Usar DiceBear como fallback único e confiável (já funciona em toda a app)
- Manter iniciais como último recurso

**B. Remover fallback redundante no `Index.tsx`**
- Linhas 587 e 607: parar de gerar DiceBear URL no Index — deixar o `MemberAvatar` cuidar do fallback
- Passar `member.avatar` diretamente (pode ser null)

**C. Mesmo fix no `DirectReportDashboard.tsx`**
- Linha 891: usar `MemberAvatar` em vez de `<img>` com fallback DiceBear manual

**D. Fix no `NewMemberDialog.tsx`**
- Linha 177: remover atribuição de avatar DiceBear na criação do membro — deixar null e o componente cuida do fallback visual

### Arquivos afetados

| Arquivo | Ação |
|---------|------|
| `src/components/MemberAvatar.tsx` | Trocar Boring Avatars → DiceBear como fallback |
| `src/pages/Index.tsx` | Remover fallback DiceBear nas linhas 587 e 607, passar avatar direto |
| `src/components/dashboard/DirectReportDashboard.tsx` | Usar `MemberAvatar` em vez de `<img>` manual |
| `src/components/NewMemberDialog.tsx` | Remover avatar DiceBear na criação (deixar null) |

### Resultado
Avatar sempre consistente: mostra o avatar escolhido na biblioteca, ou um DiceBear determinístico baseado no nome, ou iniciais — sem depender de APIs externas instáveis.

