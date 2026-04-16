

## Fluidez e Edição no Mentor Chat / Meu Rhitmo

### Problemas atuais
1. **Visual estático/travado**: O Dialog usa bordas duras, espaçamento rígido, sem animações de entrada/transição nas mensagens. O chat parece um formulário, não uma conversa fluida.
2. **Sem edição de mensagens do usuário**: Não existe forma de editar uma mensagem enviada (como no ChatGPT/Claude). O usuário precisa enviar uma nova mensagem para corrigir.

### Referências visuais (Claude e ChatGPT)
- Menu contextual nas mensagens do usuário com opções de **editar** e **copiar**
- Edição inline: ao clicar "editar", a mensagem vira um textarea editável com botões Salvar/Cancelar
- Ao salvar edição, reenvia a mensagem e gera nova resposta da IA
- Animações suaves de entrada nas mensagens (fade-in + slide-up)

### Plano de implementação

**1. Animações de entrada nas mensagens**
- Adicionar `animate-in` CSS (fade + translateY) nas mensagens ao renderizar
- Transição suave no loading indicator (bouncing dots já existe, manter)
- Smooth scroll behavior no container de mensagens

**2. Edição de mensagens do usuário**
- Adicionar menu hover nas mensagens do usuário com ícones de **Editar** (Pencil) e **Copiar** (Copy)
- Estado `editingMessageId` + `editingContent` para controlar edição inline
- Ao clicar "Editar": substituir o balão por um `<textarea>` com o conteúdo original + botões "Salvar" e "Cancelar"
- Ao salvar:
  - Atualizar o conteúdo da mensagem no banco (`supabase.from('mentor_messages').update(...)`)
  - Deletar todas as mensagens subsequentes na thread (a resposta da IA e mensagens depois)
  - Reenviar a mensagem editada para a Edge Function para gerar nova resposta
  - Invalidar queries para atualizar a UI

**3. Melhorias visuais de fluidez**
- Balões de mensagem com `transition-all duration-200` 
- Hover effects mais suaves nos botões da sidebar
- Input area: adicionar `transition-all duration-300` no focus state (já tem parcialmente)
- Remover rigidez visual: bordas mais sutis, sombras mais difusas nos balões

### Arquivo modificado
- `src/components/MentorChat.tsx`
- `src/index.css` (adicionar keyframe de animação se necessário)

### Detalhes técnicos
- Edição trunca o histórico: ao editar mensagem N, deleta mensagens N+1 em diante do banco e reenvia
- A edição usa o mesmo `handleSend` existente, passando o `selectedThreadId` para manter a thread
- Animação CSS: `@keyframes message-in { from { opacity: 0; transform: translateY(8px); } to { opacity: 1; transform: translateY(0); } }` com `.animate-message-in { animation: message-in 0.3s ease-out; }`

