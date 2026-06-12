## Remover seção "Quem já usa"

Remover a seção de depoimentos anônimos ("Quem já usa / Feedback real de líderes reais") da landing page.

### Mudança
- **`src/pages/Landing.tsx`** — remover o bloco `<section>` na linha 1274 (header + 4 cards de depoimentos). Verificar também o equivalente em inglês (se houver) e remover junto para manter paridade PT/EN.

### Fora de escopo
- Nenhuma mudança em outras seções, rotas, estilos globais ou backend.
- Sem remoção de assets ou componentes reutilizáveis — a seção é inline na página.

Reversível com `git revert` se quiser trazer de volta.