# Site público com um visual só e menu simples

## 1. Menu superior único (landing e páginas novas)

Mesmo menu em todas as páginas públicas (início, Integrações, Blog, guias, ferramentas):

```text
Rhitmo   Como funciona   Integrações   Blog   Preços   FAQ        Entrar   [Começar teste grátis]
```

- Some o "Recursos" duplicado e o menu separado "Integrações / Blog / Recursos".
- "Como funciona", "Preços" e "FAQ" levam às seções da página inicial (de qualquer página, volta para o início e rola até a seção).
- "Integrações" e "Blog" abrem as páginas próprias.
- Guias, modelo e gerador grátis saem do menu superior e ficam no rodapé e dentro do Blog (bloco "Materiais grátis"). A página /recursos continua no ar para não perder links e buscas.
- No celular, o mesmo menu dentro do botão de menu.

## 2. Novo nome para "Impacto"

"Impacto" soa vago. Em ferramentas do mesmo mercado (Lattice, Culture Amp, Windmill, Qulture.Rocks) o padrão é nomear pelo que a pessoa quer entender: **Produto**, **Plataforma** ou **Como funciona**.

Proposta: **Como funciona** no menu, com o título da seção reforçando a proposta de valor, por exemplo "Do que acontece nas conversas a uma avaliação com fatos". O endereço antigo `#impacto` continua funcionando.

## 3. Visual da landing em todas as páginas

- Botões principais pretos, iguais ao "Começar teste grátis" da landing (sai o roxo da plataforma).
- Mesmo fundo, tipografia, cartões e rodapé usados em #impacto, #pricing e #faq.
- Integrações, cada página de integração, Blog, cada artigo, guias, modelo e gerador passam a usar esse visual. Conteúdo não muda.

## 4. Blog: pautas novas

Adicionar como rascunhos de artigo as 5 pautas que propus (incluindo "Blindagem trabalhista e gestão ética"), sem números ou depoimentos inventados, assinadas por você. Você revisa antes de publicar.

## O que não muda

App logado, preços, textos das seções existentes, endereços das páginas, lista de páginas para o Google.

## Detalhes técnicos

- Extrair o header/rodapé da `Landing.tsx` para um componente público compartilhado e usar em `ContentLayout.tsx`; links de seção viram `/#como-funciona`, `/#pricing`, `/#faq` com scroll após navegação.
- Renomear `featuresNav` (pt/en) e adicionar `id="como-funciona"` mantendo um alias `#impacto`.
- Trocar `Button` padrão por variante preta da landing em `ContentLayout`, `TrialCta`, `Recursos`, `Integracoes`, `Integracao`, `Blog`, `BlogPost` e páginas de guia/ferramenta; só tokens semânticos.
- Novos posts em `src/content/blog.ts`; atualizar `sitemap.xml` se entrarem slugs novos.
- Verificar com Playwright no desktop e celular: início, /integracoes, /blog, um artigo e a rolagem para Preços vindo do Blog.
