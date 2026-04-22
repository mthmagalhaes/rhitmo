

# Reordenar header da landing + adicionar botão "Recursos"

## O que muda

Reorganizar a ordem dos itens no header da landing (`src/pages/Landing.tsx`) e adicionar um novo link "Recursos" como primeiro item dos links de navegação. Aplicar tanto no menu desktop quanto no Sheet mobile.

## Ordem final (esquerda → direita, depois do logo)

1. **Recursos** (novo) → âncora `#impacto`
2. **Preços** (já existe) → âncora `#pricing`
3. **FAQ** (já existe) → âncora `#faq`
4. Ícone Light/Dark (já existe)
5. Ícone de língua (já existe)
6. **Entrar** (já existe)
7. **Começar grátis** (já existe)

## Detalhes

**1. Strings i18n (blocos `pt` e `en` em `Landing.tsx`)**

Adicionar ao lado de `pricingNav` / `faqNav`:
- PT: `featuresNav: "Recursos"`
- EN: `featuresNav: "Features"`
- (ES futuro: `featuresNav: "Recursos"`)

**2. Identificar âncora da seção "Impacto mensurável"**

Verificar na seção correspondente (próximo das stats de ROI / "21 horas/semana") se já existe `id`. Se não, adicionar `id="impacto"` no `<section>` apropriado para o link funcionar.

**3. Header desktop**

Antes do botão "Preços", inserir:
```
<a href="#impacto"><Button variant="ghost" size="sm" …>{t.featuresNav}</Button></a>
```
Garantir que a sequência fique: Recursos → Preços → FAQ → ThemeToggle → LanguageToggle → Entrar → Começar grátis.

**4. Header mobile / Sheet**

Mesma adição: novo `SheetClose` com `<a href="#impacto">` antes de Preços, mantendo `variant="outline"` e `min-h-[44px]`.

**5. Verificar ordem dos toggles**

Confirmar que ThemeToggle aparece antes de LanguageToggle no JSX desktop (conforme print do usuário). Se estiver invertido, trocar.

## Não muda

- Conteúdo das seções de Impacto, Preços e FAQ.
- Página `/enterprise` continua acessível via "Fale com Vendas" no card de pricing.
- Nenhum arquivo além de `src/pages/Landing.tsx`.

## Critério de aceite

- Header desktop e mobile mostram, em ordem: **Recursos · Preços · FAQ · 🌙 · 🌐 · Entrar · Começar grátis**, em PT e EN.
- Clicar em "Recursos" rola até a seção de Impacto mensurável; "Preços" rola até planos; "FAQ" rola até perguntas.
- Sem regressão visual no resto do header.

