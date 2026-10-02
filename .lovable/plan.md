# Conteúdo orgânico que gera leads no rhitmo.co (primeira leva)

## Objetivo
Criar no rhitmo.co uma área de conteúdo voltada a líderes e RH de empresas. Ela atrai visitantes pelo Google e pelo LinkedIn e transforma esses visitantes em leads, que caem direto na sequência de e-mails do teste.

## O que entra

### 1. Gerador de texto para avaliação de desempenho (ferramenta grátis com IA)
- Página: `rhitmo.co/ferramentas/gerador-avaliacao-desempenho`.
- O visitante informa o cargo do liderado, de 3 a 5 fatos observados e o tom desejado (desenvolvimento, reconhecimento ou correção).
- A Rhitmo devolve um rascunho estruturado com forças, pontos de desenvolvimento e próximos passos, escrito sem vieses comuns como recência ou generalização.
- A primeira parte do rascunho aparece na hora. Para ver o texto completo e copiá-lo, a pessoa informa nome, e-mail e empresa.
- No fim, aparece o convite: "Imagine isso com as evidências reais do seu time, sem digitar nada. Teste 14 dias grátis."
- Limite de uso por e-mail e por dia, para conter o custo de IA.

### 2. Modelo de avaliação de desempenho (material para baixar)
- Página: `rhitmo.co/modelos/avaliacao-de-desempenho`.
- O visitante vê uma prévia do modelo, que tem competências, escala, evidências, plano de desenvolvimento e um roteiro da conversa.
- Ao informar o e-mail, libera o modelo completo para copiar ou baixar em PDF.
- Inclui também um bônus: o roteiro de 1:1 em uma página.

### 3. Três guias completos
1. "Avaliação de desempenho: guia prático para líderes", incluindo "o que escrever", com exemplos de frases.
2. "Reunião 1:1 (one on one): como fazer, pauta e erros comuns".
3. "PDI na prática: como montar um plano de desenvolvimento que sai do papel".

Cada guia tem índice, perguntas frequentes, links para o gerador e para o modelo, e o convite para o teste no fim. Os textos são originais, sem números, depoimentos ou estatísticas inventados.

### 4. Página "Recursos"
`rhitmo.co/recursos` reúne guias, modelos e a ferramenta. Ganha link no topo e no rodapé da página inicial.

### 5. Destino dos leads
- Todo lead fica salvo com a origem (gerador, modelo ou guia) e a data.
- Você recebe um aviso a cada lead novo, usando o aviso que já existe para novos contatos.
- No painel admin, uma nova lista "Leads de conteúdo" permite filtrar por origem.
- Cada lead recebe um e-mail com o material e o convite para o teste. Quem já tem conta não recebe esse e-mail.

### 6. Base para o Google
- Cada página tem título, descrição e marcação própria (Artigo, Perguntas frequentes, Ferramenta).
- O mapa do site e o arquivo de orientação para IAs são atualizados com as páginas novas.
- Conectar o Google Search Console e enviar o mapa depende de você autorizar. Vou abrir o cartão de conexão no final.

## O que você precisa fazer
- Autorizar o Google Search Console quando o cartão aparecer.
- Revisar os 3 guias antes de publicar. Posso ajustar o tom ao seu jeito de falar.
- Publicar o site e divulgar cada guia no seu LinkedIn (posso escrever os posts).

## Detalhes técnicos
- As rotas públicas `/recursos`, `/guias/:slug`, `/modelos/avaliacao-de-desempenho` e `/ferramentas/gerador-avaliacao-desempenho` ficam lazy em `routeLoaders`. O conteúdo dos guias fica em `src/content/guias/*.ts`, de onde saem o Helmet, o JSON-LD e o sitemap.
- Nova tabela `content_leads` (name, email, company, source, utm, created_at), com GRANT INSERT para anon/authenticated via edge function apenas. A RLS libera a leitura só para super admin. A inserção passa pela edge function `content-lead` (Zod, limite por email/IP/dia), que chama `notify-admin-new-lead` e enfileira o e-mail transacional `content-lead-welcome` (o template entra no registry).
- A edge function `generate-review-draft-public` recebe Zod e o lead, usa o Lovable AI Gateway com prompt vindo de `_shared/soul/modes/public-review-generator.md` (a regra da alma é que nenhum prompt fique inline) e tem limite de 3 por e-mail/dia e 20 por IP/dia.
- A aba admin `LeadsDeConteudo` em `/admin` usa uma RPC security definer, restrita a super admin.
- Atualizações em `public/sitemap.xml` e `public/llms.txt`, com links em `Landing.tsx` (nav e rodapé).
- Ao final, `standard_connectors--connect` com `google_search_console`, seguido da verificação e do envio do sitemap.
