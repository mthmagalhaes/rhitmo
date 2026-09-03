# Visão de Liderado: consertar a troca e deixar óbvio que mudou de papel

## O que está acontecendo hoje

Reproduzi no preview: ao clicar em "Sou liderado", o app grava o modo e navega para a home do liderado, mas volta na hora para a tela de líder. Causa confirmada: a sidebar tem uma rotina que sincroniza o modo com a rota, e ela trata o endereço `/liderado` como se fosse `/lider` (um é prefixo do outro). Resultado: o modo é reescrito para "Minha equipe" e o guard de rota devolve o usuário para o painel de líder. O modo salvo no navegador confirma isso — termina como `leader` mesmo após o clique.

## Parte 1 — Corrigir a troca de modo

- Na sincronia rota → modo, avaliar `/liderado` antes de `/lider` e comparar com barra final, para que a home do liderado passe a fixar o modo "Liderado".
- Só sincronizar quando a rota realmente contradiz o modo, evitando que uma troca feita pelo usuário seja sobrescrita no meio da navegação.
- Validar no navegador: entrar como líder, trocar para "Sou liderado", confirmar que fica em `/liderado/inicio`, que o menu lateral vira o do liderado e que voltar para "Minha equipe" também funciona.

## Parte 2 — Deixar visualmente claro que você trocou de papel

Objetivo: em 1 segundo, sem ler nada, a pessoa sabe que está no ambiente de liderado (dela mesma), não no de gestão.

1. **Tema por papel.** Um atributo de papel na raiz do app troca um conjunto pequeno de tokens de cor (primária, acento, sidebar, anel de foco). Visão de líder continua exatamente como hoje (roxo). Visão de liderado passa a usar um verde-azulado sóbrio, na mesma família visual "Creme/Bento", sem virar outro produto. Nada de cor fixa em componente: só tokens, funcionando em claro e escuro.
2. **Faixa de contexto no topo.** Barra fina e discreta acima do conteúdo, só na visão de liderado: "Você está na sua visão de Liderado, com seu líder Fulano" e um botão "Voltar para Minha equipe" que devolve ao modo de gestão em um clique.
3. **Cabeçalho da sidebar.** O chip de modo ganha peso: ícone próprio e fundo na cor do papel ativo, em vez do texto cinza minúsculo de hoje.
4. **Avatar e saudação.** Na visão de liderado, a home cumprimenta a pessoa como colaboradora e não mostra métricas de time.
5. **Transição.** Um fade curto ao trocar de modo, para o olho registrar que o ambiente mudou.

## Detalhes técnicos

- Correção: `src/components/AppSidebar.tsx` (efeito de sincronia rota → modo). Sem mudança em `useActiveMode`, `resolvePersona` ou nos guards.
- Tema: novos tokens de papel em `src/index.css` sob um seletor `[data-role="member"]`, aplicados por um efeito que escreve `data-role` no `documentElement` a partir da persona resolvida (`usePersona`). `tailwind.config.ts` não muda, porque os tokens semânticos já existentes é que são reapontados.
- Faixa de contexto: componente novo em `src/components/layout/` renderizado por `AppLayout` quando a persona é `direct_report` **e** a pessoa também tem chapéu de líder ou empresa (liderado puro não precisa de faixa).
- Chip de modo: `src/components/sidebar/WorkspaceSwitcher.tsx`.
- Nenhuma mudança de banco, RLS ou permissão. O modo continua sendo só navegação e aparência.

## Fora de escopo

Rever o conteúdo das telas do liderado, e a migração v1 → v2.
