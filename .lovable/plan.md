

# Trocar "Enterprise" do header por "Preços" e "FAQ"

## O que muda

No header da landing (`src/pages/Landing.tsx`), substituir o botão **Enterprise** por dois links de âncora: **Preços / Pricing / Precios** e **FAQ**. Aplicar tanto no menu desktop quanto no Sheet mobile.

A página `/enterprise` continua existindo e acessível pelo botão **"Fale com Vendas"** dentro do card Enterprise (na seção de pricing) e pelo card "Empresas estruturadas" mais abaixo. Só perde o atalho do header.

## Detalhes

**1. Strings (i18n inline do `Landing.tsx`, blocos `pt` e `en`)**

Adicionar em cada bloco de tradução, ao lado de `enterpriseNav`:

- PT: `pricingNav: "Preços"`, `faqNav: "FAQ"`
- EN: `pricingNav: "Pricing"`, `faqNav: "FAQ"`
- (Quando o ES da landing for ativado: `pricingNav: "Precios"`, `faqNav: "FAQ"`)

`enterpriseNav` permanece nas strings (ainda é usado no card de pricing/CTA), só não é mais renderizado no header.

**2. Header desktop (linhas ~836-840)**

Remover o `<Link to="/enterprise">…{t.enterpriseNav}…</Link>` e colocar antes de "Entrar":

```
<a href="#pricing"><Button variant="ghost" size="sm" …>{t.pricingNav}</Button></a>
<a href="#faq"><Button variant="ghost" size="sm" …>{t.faqNav}</Button></a>
```

**3. Header mobile / Sheet (linhas ~886-892)**

Mesma troca: remover o item "Enterprise" e adicionar dois `SheetClose` com `<a href="#pricing">` e `<a href="#faq">`, mantendo `variant="outline"` e `min-h-[44px]`.

**4. Adicionar `id="faq"` na seção FAQ (linha ~1321)**

A seção `#pricing` já tem id. A seção FAQ ainda não — adicionar `id="faq"` no `<section className="py-24 bg-muted/30">` para o link âncora funcionar.

**5. Scroll suave**

Verificar se `html { scroll-behavior: smooth }` está em `src/index.css`. Se não estiver, adicionar — caso contrário o salto fica seco. (Adição de 1 linha.)

## Não muda

- Página `/enterprise` continua publicada e linkada via "Fale com Vendas" no card de pricing e no card "Empresas estruturadas" da seção "Pra quem é".
- Conteúdo da seção de pricing (3 cards: Pulse, Pro, Enterprise) intocado.
- Conteúdo do FAQ intocado.
- Nenhum arquivo além de `src/pages/Landing.tsx` (e possivelmente `src/index.css` para o scroll suave).

## Critério de aceite

- Header desktop e mobile mostram **Preços** e **FAQ** no lugar de Enterprise, em PT e EN.
- Clicar em "Preços" rola até a seção de planos; "FAQ" rola até as perguntas.
- Botão "Fale com Vendas" no card Enterprise continua levando para `/enterprise`.
- Sem regressão visual no resto do header (toggle de tema, idioma, Entrar, Começar grátis).

