# Avaliação formal: documento pronto, painel enxuto e cultura só com valores e comportamentos

## O que muda para o líder

1. **Rascunho Geral se monta sozinho.** Quando a Rhitmo termina os cartões da cultura (ou quando a avaliação já tem os cartões prontos), o documento é montado automaticamente. Ao abrir "Rascunho Geral", o texto completo já está lá, sem a frase "Preparando a avaliação...". Enquanto monta, aparece o "Rhitmo está trabalhando nisso".
2. **Painel com 3 etapas:** Cultura → Rascunho Geral → Espelho. As abas "Competências" e "Calibração" saem do painel. Avaliações antigas continuam abrindo normalmente.
3. **Espelho lê o texto real.** Ele só roda quando o documento já foi montado. Se ainda estiver com o texto provisório, mostra "Aguardando o documento ficar pronto" em vez de revisar.
4. **Botão "Avançar para Rascunho Geral →"** no fim da aba Cultura. Ele salva os ajustes feitos nos cartões, remonta o documento e leva para a aba seguinte.

## O que muda para o RH (Cultura)

5. **Fim dos "itens da empresa" (categorias extras).** A Cultura passa a ter só **Valores** e **Comportamentos ligados aos valores**, mais a **Régua** (a escala de notas, que continua necessária para dar o nível em cada valor).
   - Sai o botão "Nova categoria da empresa" e os blocos de categorias extras na tela.
   - A IA deixa de criar esses itens ao analisar os materiais. Os trechos de "dimensões de performance" ou princípios viram comportamentos do valor certo, quando fizer sentido.
   - Na avaliação guiada, a Rhitmo sugere texto só por valor (com os comportamentos como base). Não gera mais cartões separados para itens extras, então não repete conteúdo.
   - Itens extras já criados (como as 3 dimensões da Faster) não são apagados do histórico. Eles só deixam de aparecer e de ser usados em avaliações novas. Versões já publicadas e avaliações antigas não mudam.

## Detalhes técnicos

- `FormalReviewSheet.tsx`: remover abas competências/calibração; detectar `content` com placeholder (`_Preparando` / `_Gerando`) e, havendo itens de cultura concluídos, chamar a ação de montar (`assemble`) do `culture-review-assist` uma vez; recarregar conteúdo; RhitmoThinking durante a montagem.
- `CultureGuidedPanel.tsx`: auto-assemble quando todos os itens ficam prontos após `suggest_all`; trocar "Montar documento" por "Avançar para Rascunho Geral →" (salva, assemble, troca de aba via callback).
- `ReviewMirrorPanel.tsx`: bloquear revisão enquanto o conteúdo for placeholder.
- `HRContextoEmpresa.tsx`: remover categorias `custom` da UI e o botão de nova categoria.
- `extract-org-context` + `soul/modes/org-context-extraction.md`: não emitir `kind = custom`; mapear dimensões para comportamentos; regenerar `docs.generated.ts` e snapshots, rodar testes do loader.
- `orgContext.ts` / `culture-review-assist`: ignorar itens `custom` ao montar a lista de itens avaliáveis (filtro na leitura, sem apagar dados nem migration). Montagem final do documento sem seção de itens extras.
- Multi-empresa: nenhuma regra específica da Faster. Checagem de tipos, testes Deno e deploy das duas funções; conferir no navegador a avaliação da Laís.
