# Consistência de texto, headings e metadados da landing

## O que verifiquei

- As últimas edições ("Conheça a Ana, / e a jornada dela com a Rhitmo.", FAQ de onboarding, blocos de RH) vivem apenas no objeto de traduções de `src/pages/Landing.tsx` e são renderizadas como copy visual. Nenhuma delas alimenta título, descrição ou dados estruturados.
- Hierarquia de headings está correta: um único `<h1>` (hero), e as seções (jornada da Ana, comparativo, CTA final) usam `<h2>`. O título da jornada quebra em dois `<span class="block">` dentro do mesmo `<h2>`, então a frase continua sendo um heading único e legível para leitores de tela.
- Metadados vivem em `index.html` + um `<Helmet>` na landing que só define o canonical.

## Inconsistências encontradas

1. **Promessa de tempo divergente.** Título e descrição em `index.html` dizem "avaliação em 30s", mas o copy atual da página fala em "2 minutos" e "poucos minutos". Buscador e página passam a prometer coisas diferentes.
2. **og:image em domínio antigo.** `og:image` aponta para `https://rhitmo.lovable.app/og-image.png` enquanto canonical e `og:url` usam `https://rhitmo.co`. Compartilhamentos ficam presos ao domínio antigo.
3. **`og:url` sem barra final.** `https://rhitmo.co` vs canonical `https://rhitmo.co/` — pequena divergência de auto-referência.
4. **Sem JSON-LD.** A landing tem seção de FAQ real e nenhuma marcação `FAQPage` nem `Organization`.

## Mudanças propostas

- Alinhar `title`, `description`, `og:*` e `twitter:*` em `index.html` ao discurso atual ("2 minutos", não "30s"), mantendo o título abaixo de 60 caracteres e a descrição abaixo de 160.
- Trocar o host do `og:image`/`twitter:image` para `https://rhitmo.co` e normalizar `og:url` para `https://rhitmo.co/`.
- Adicionar JSON-LD `Organization` em `index.html` e `FAQPage` via `<Helmet>` na landing, gerado a partir do mesmo array `faqItems` que já renderiza o acordeão (fonte única, sem texto duplicado à mão).
- Nenhuma alteração no copy visível nem na estrutura de headings.

## Detalhes técnicos

- Arquivos: `index.html` e `src/pages/Landing.tsx` (bloco `<Helmet>` existente na linha ~1000).
- O JSON-LD de FAQ usa `translations[lang].faqItems`, então segue o idioma ativo automaticamente.
- Pré-visualizações sociais já cacheadas por LinkedIn/Slack só atualizam quando essas plataformas re-buscarem o link, ou via o debugger de preview de cada uma.
