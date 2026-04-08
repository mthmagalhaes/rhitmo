

## Checklist de Lançamento — Rhitmo

### Estado atual: ~85% pronto

O app está funcional e visualmente polido. Os gaps abaixo são os itens que separam o estado atual de um lançamento público confiável.

---

### 1. Domínio customizado
- Atualmente publicado em `rhitmo.lovable.app`
- Para lançar profissionalmente: conectar `app.rhitmo.co` ou similar
- Ação: **Project Settings → Domains → Add custom domain**

### 2. Email transacional / verificação
- Atualmente os emails de verificação e reset de senha usam o template padrão (sem branding Rhitmo)
- Recomendação: configurar templates de email com a marca (logo, cores, footer legal)
- Também verificar se o domínio de email está configurado (evitar ir para spam)

### 3. Confirmação de email
- Verificar se auto-confirm está desativado (usuários devem confirmar email antes de entrar)
- Testar o fluxo completo: signup → email de verificação → confirmação → login

### 4. Testes end-to-end dos fluxos críticos
| Fluxo | O que testar |
|-------|-------------|
| Signup + verificação de email | Cria conta, recebe email, confirma, redireciona |
| Google OAuth | Login, primeiro acesso cria workspace, redireciona |
| Stripe checkout | Upgrade Pulse→Pro, webhook processa, limites atualizam |
| Stripe webhook | `checkout.session.completed` cria subscription no DB |
| Adicionar liderado + link | Convite por email, liderado faz signup, vê dashboard |
| Gravação de reunião | Upload áudio → transcrição → análise AI |
| Mentor Chat | Enviar mensagem, receber resposta AI com contexto |
| Avaliação formal | Gerar rascunho AI, editar, compartilhar com liderado |
| Dark mode | Todas as páginas + logo + waves adaptam |

### 5. Landing page — vídeo demo
- A seção "Veja Rhitmo em ação" existe mas precisa de um vídeo real (placeholder atualmente)
- Gravar um Loom/demo de 2 min ou remover a seção temporariamente

### 6. SEO e Open Graph
- Verificar `index.html` tem meta tags OG (título, descrição, imagem para compartilhamento)
- A imagem `rhitmo-social-twitter.png` pode ser usada como OG image

### 7. Analytics / tracking
- Configurar analytics básico (Google Analytics, Plausible, ou Posthog)
- Sem isso, não terá visibilidade sobre tráfego e conversão

### 8. Termos de Serviço e Privacidade
- Já existem (`/terms-of-service`, `/privacy-policy`) — revisar se o conteúdo jurídico está atualizado e aprovado por advogado

### 9. Rate limiting / abuse protection
- Edge functions de AI (chat-mentor, analyze-feedback) devem ter proteção contra abuso
- Verificar se os limites por plano (ex: 20 mensagens/mês no Pulse) estão sendo enforçados

### 10. Backup e recuperação
- A edge function `backup-data` existe — verificar se está rodando periodicamente
- Configurar um cron ou trigger para backup automático

---

### Prioridade de execução sugerida

```text
P0 (bloqueia lançamento)
├── Testar fluxo Stripe end-to-end (checkout + webhook)
├── Testar signup com verificação de email
├── Verificar meta tags OG no index.html
└── Conectar domínio customizado

P1 (lançar sem isso é ok, mas resolver em 1 semana)
├── Templates de email com branding
├── Vídeo demo ou remover seção
├── Analytics/tracking
└── Rate limiting nas edge functions AI

P2 (pós-lançamento)
├── Backup automático periódico
├── Revisão jurídica final dos termos
└── Monitoramento de erros (Sentry ou similar)
```

### Quer que eu implemente algum desses itens?
Posso começar pelos P0 — configurar meta tags OG, testar o fluxo Stripe, ou preparar os templates de email branded.

