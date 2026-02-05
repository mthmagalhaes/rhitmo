

## Plano: Protocolo de Identidade Blindada (Mentor Chat)

### Problema

O Mentor Chat atual possui o Protocolo de Flexibilidade de Nomes (reconhece apelidos), mas **NÃO possui o filtro para ignorar falas de outros participantes**. Isso causa alucinações onde a IA atribui ações de outras pessoas (ex: "Matheus fez o deploy") ao liderado.

### Análise do Gap

| Funcionalidade | Status Atual | Ação Necessária |
|----------------|--------------|-----------------|
| Reconhece apelidos (Yas → Yasmin) | ✅ Implementado | Manter |
| Sabe quem é o gestor | ❌ Não recebe `managerName` | Frontend precisa enviar |
| Ignora falas de outros | ❌ Não implementado | Adicionar protocolo |
| Tratamento de dúvidas | ❌ Não implementado | Adicionar protocolo |

---

### Parte 1: Frontend - Enviar `managerName` (MentorChat.tsx)

Atualizar a chamada da API para incluir o nome do gestor logado:

```typescript
// Antes de fazer o fetch, obter dados do usuário
const { data: { user: currentUser } } = await supabase.auth.getUser();
const managerName = currentUser?.user_metadata?.full_name || 
                    currentUser?.user_metadata?.name || 
                    'Gestor';

const response = await fetch(
  `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/chat-mentor`,
  {
    method: 'POST',
    headers: { ... },
    body: JSON.stringify({
      question: finalMessage,
      feedbacks: feedbacks,
      memberName: memberName,
      memberRole: memberRole,
      managerName: managerName,     // ← NOVO
      workStyleData: workStyleData,
      keyObjectives: keyObjectives
    }),
    signal: controller.signal
  }
);
```

---

### Parte 2: Edge Function - Receber e Usar `managerName` (chat-mentor/index.ts)

#### 2.1 Receber o novo parâmetro

```typescript
const { question, feedbacks, memberName, memberRole, managerName, workStyleData, keyObjectives } = await req.json();

// Fallback
const targetManagerName = managerName || 'o gestor';
const managerFirstName = targetManagerName.split(' ')[0];
```

#### 2.2 Substituir o Protocolo Atual pelo "Protocolo de Identidade Blindada"

O bloco atual (linhas 298-313) será substituído por um protocolo mais completo:

```text
## PROTOCOLO CRÍTICO DE IDENTIDADE E ATRIBUIÇÃO

### 1. O PROTAGONISTA (QUEM VOCÊ ANALISA)

- **Nome Completo**: ${memberName}
- **Primeiro Nome**: ${firstName}
- **Variações Aceitas**: Considere apelidos óbvios derivados de "${firstName}" 
  (ex: "Yas" para Yasmin, "Gabi" para Gabriela, "Mat" para Matheus) como sendo a MESMA PESSOA.

### 2. O FILTRO DE RUÍDO (QUEM VOCÊ IGNORA)

As notas contêm transcrições com múltiplas pessoas (incluindo o gestor **${targetManagerName}** e outros colegas).

**Regras de Ouro**:
- Atribua ações, falas e sentimentos **APENAS** quando a origem for claramente de ${memberName} ou suas variações
- **Não Roube Créditos**: Se o texto diz "${managerFirstName}: Eu fiz o deploy", NÃO diga que ${memberName} fez o deploy
- **Tratamento de Contexto**: Falas de outras pessoas são apenas CONTEXTO para entender a reação de ${memberName}
- **Não confunda**: Se houver "Matheus", "Gabi", "Pedro" etc. que NÃO sejam variações de "${firstName}", ignore as ações deles

### 3. EM CASO DE DÚVIDA

Se a transcrição não tiver identificação clara de quem falou:
- Assuma que é uma observação do gestor SOBRE o liderado
- Use linguagem cautelosa: "O registro sugere...", "Há menção de...", "Parece que..."
- NUNCA afirme com certeza se não houver indicação clara de autoria
```

---

### Resumo das Alterações

| Arquivo | Alteração |
|---------|-----------|
| `src/components/MentorChat.tsx` | Obter nome do usuário logado e enviar `managerName` para a Edge Function |
| `supabase/functions/chat-mentor/index.ts` | Receber `managerName`, substituir protocolo atual pelo "Protocolo de Identidade Blindada" completo |

---

### Fluxo de Dados Atualizado

```text
MentorChat.tsx
      │
      ├── memberName: "Yasmin Nóbrega"
      ├── managerName: "Matheus Silva" ← NOVO
      │
      ▼
Edge Function (chat-mentor)
      │
      ├── firstName = "Yasmin"
      ├── managerFirstName = "Matheus"
      │
      ▼
System Prompt com Protocolo Blindado
      │
      ├── "ANALISA: Yasmin, Yas"
      ├── "IGNORA: Matheus, Mat, Gabi, Pedro..."
      │
      ▼
IA responde com atribuição correta
```

---

### Seção Técnica

**Cenários protegidos após a correção:**

| Cenário | Antes | Depois |
|---------|-------|--------|
| "Yas entregou o relatório" | ✅ Atribuía a Yasmin | ✅ Continua funcionando |
| "Matheus: Fiz o deploy" (Gestor) | ❌ Atribuía a Yasmin | ✅ Ignora (ação do gestor) |
| "Gabi ajudou no projeto" (Colega) | ❌ Atribuía a Yasmin | ✅ Ignora (ação de outra pessoa) |
| Transcrição sem identificação | ❌ Inventava autoria | ✅ Usa linguagem cautelosa |

**Integração com generate-review:**

O mesmo padrão já foi implementado no `generate-review/index.ts`. Esta alteração garante **consistência** entre as duas funções de IA.

