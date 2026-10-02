# Conectar o Google Search Console ao rhitmo.co

## O que vai acontecer

1. **Autorizar a conta Google.** Vai aparecer um cartão de conexão. Você entra com a conta Google que deve ser dona do rhitmo.co no Search Console.
2. **Conferir o que já existe.** Se o rhitmo.co já estiver verificado nessa conta, uso essa propriedade e pulo para o passo 5.
3. **Provar que o site é seu.** Peço ao Google um código de verificação e coloco esse código no cabeçalho da página inicial. Nada visível muda no site.
4. **Publicar uma vez.** O código só vale quando está no ar. Vou pedir a sua aprovação para publicar. Depois disso, peço ao Google para confirmar.
5. **Enviar o mapa do site.** Envio `https://rhitmo.co/sitemap.xml`, que já lista a página inicial, as páginas Enterprise e Confiança, Recursos, os 3 guias, o modelo e o gerador.
6. **Relatório.** Digo se a verificação deu certo e se o mapa foi aceito. Os dados de buscas costumam levar alguns dias para aparecer.

## O que você precisa fazer

- Autorizar no cartão de conexão.
- Aprovar a publicação quando eu pedir, só se o código ainda não estiver no ar.

## Detalhes técnicos

- Propriedade: prefixo de URL `https://rhitmo.co/`, verificada pela meta tag (`META`). Ela não cobre `rhitmo.app` nem `www.rhitmo.app`. Uma propriedade de domínio com DNS fica como opção para depois.
- A meta tag entra em `index.html` sem remover nada que já exista. `robots.txt` e o sitemap já estão válidos e não mudam.
- Ordem: `GET /webmasters/v3/sites`, depois token, depois a tag no ar, depois `webResource` verify, depois `PUT` site, depois listar de novo e então `PUT` sitemap na propriedade exata que o Google devolver.
