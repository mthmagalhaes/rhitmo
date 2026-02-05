

## Plano: Suporte a Apelidos e Variações de Nome

### Problema

As transcrições de reuniões frequentemente usam apelidos ou diminutivos (ex: "Yas" em vez de "Yasmin Nóbrega"). A IA não consegue mapear automaticamente essas variações, perdendo referências importantes.

---

### Solução

Adicionar um **Protocolo de Flexibilidade de Nomes** que extrai o primeiro nome e instrui a IA a aceitar variações comuns.

---

### Parte 1: Lógica de Extração de Nomes (TypeScript)

Criar uma função helper para extrair variações do nome:

```typescript
// Extrair primeiro nome e possíveis apelidos
const getNameVariations = (fullName: string) => {
  const firstName = fullName.split(' ')[0];
  return {
    fullName,
    firstName,
    // O prompt orientará a IA a inferir diminutivos comuns
  };
};
```

---

### Parte 2: Atualizar `generate-review/index.ts`

#### 2.1 Extrair variações do nome do membro

```typescript
// Após definir targetMemberName
const firstName = targetMemberName.split(' ')[0];
```

#### 2.2 Adicionar Protocolo de Flexibilidade ao System Prompt

Inserir após as "DIRETRIZES CRÍTICAS DE ATRIBUIÇÃO E ISOLAMENTO":

```text
### PROTOCOLO DE FLEXIBILIDADE DE NOMES

O MEMBRO AVALIADO É: **${targetMemberName}** (Primeiro Nome: **${firstName}**)

Nas transcrições, este membro pode ser citado como:
- **Nome Completo**: "${targetMemberName}"
- **Primeiro Nome**: "${firstName}"
- **Apelidos/Diminutivos Comuns**: Variações óbvias do primeiro nome (ex: se for "Yasmin", aceite "Yas", "Yasmim"; se for "Gabriela", aceite "Gabi", "Gabs"; se for "Matheus", aceite "Mat", "Theus")

**AÇÃO**: Considere todas essas variações como sendo a MESMA PESSOA. 
Se o texto diz "Yas: terminei a tarefa", atribua essa ação a ${targetMemberName}.
Se o texto diz "${firstName}: vou entregar amanhã", atribua a ${targetMemberName}.

**ATENÇÃO**: NÃO confunda variações do nome do gestor (${targetManagerName}) com variações de ${targetMemberName}.
```

---

### Parte 3: Atualizar `chat-mentor/index.ts`

#### 3.1 Extrair primeiro nome no início

```typescript
// Logo após receber memberName
const firstName = memberName.split(' ')[0];
```

#### 3.2 Adicionar Protocolo de Flexibilidade ao System Prompt

Inserir na seção "DADOS DO LIDERADO":

```text
## DADOS DO LIDERADO

**Nome Completo**: ${memberName}
**Primeiro Nome**: ${firstName}
**Cargo**: ${memberRole || 'Não informado'}

### PROTOCOLO DE FLEXIBILIDADE DE NOMES

Nas transcrições e notas, ${memberName} pode ser citado como:
- Nome Completo: "${memberName}"
- Primeiro Nome: "${firstName}"
- Apelidos/Diminutivos: Variações óbvias (ex: "Yas" para "Yasmin", "Gabi" para "Gabriela")

**IMPORTANTE**: Todas essas variações referem-se à MESMA PESSOA.
Se uma nota diz "Yas disse que..." e o liderado é Yasmin, considere como fala de Yasmin.
```

---

### Resumo das Alterações

| Arquivo | Alteração |
|---------|-----------|
| `supabase/functions/generate-review/index.ts` | Extrair `firstName`, adicionar Protocolo de Flexibilidade de Nomes no system prompt |
| `supabase/functions/chat-mentor/index.ts` | Extrair `firstName`, adicionar Protocolo de Flexibilidade de Nomes na seção de dados do liderado |

---

### Exemplos de Mapeamento Automático

| Transcrição | Nome Completo | Primeiro Nome | Apelido Aceito | Resultado |
|-------------|---------------|---------------|----------------|-----------|
| "Yas: terminei a tarefa" | Yasmin Nóbrega | Yasmin | Yas | ✅ Atribui a Yasmin |
| "Gabi: preciso de ajuda" | Gabriela Silva | Gabriela | Gabi | ✅ Atribui a Gabriela |
| "Mat: vou revisar" | Matheus Costa | Matheus | Mat | ✅ Atribui a Matheus |
| "Pedro: fiz o deploy" | Pedro Santos | Pedro | Pedro | ✅ Atribui a Pedro |

---

### Seção Técnica

**Por que a IA infere os apelidos?**

Em vez de criar um dicionário fixo de apelidos (que seria incompleto), instruímos a IA a:

1. Reconhecer o **primeiro nome** como variação válida
2. Aplicar **heurística linguística** para diminutivos óbvios:
   - Truncamentos: "Yasmin" → "Yas"
   - Sufixos carinhosos: "Gabriela" → "Gabi"
   - Variações fonéticas: "Matheus" → "Mat", "Theus"

**Vantagem**: A IA consegue lidar com apelidos novos sem precisar de código adicional.

**Cenários protegidos:**

| Cenário | Antes | Depois |
|---------|-------|--------|
| "Yas falou bem" (Yasmin é o alvo) | ❌ Não reconhecia | ✅ Atribui a Yasmin |
| "Gabi entregou o projeto" (Gabriela é o alvo) | ❌ Ignorava | ✅ Atribui a Gabriela |
| Mistura de apelidos e nome completo | ❌ Tratava como pessoas diferentes | ✅ Unifica corretamente |

