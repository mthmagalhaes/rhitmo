## Atualizar exemplos do Radar de Risco (HR) — Landing.tsx

Substituir as descrições dos alertas de João e Camila no mock "Radar de Risco" (lines 666 e 678 de `src/pages/Landing.tsx`), removendo referências a Pulse e Peer feedback (que saíram da narrativa) e trocando por sinais que um RH realmente prioriza: risco de turnover, queda de engajamento captada via 1:1 e padrão consistente em reviews.

### Mudanças (apenas texto, sem mexer em estrutura/cores/severidades)

**Alerta 1 — João Ferreira · Engenharia (Alto)**
- De: "Pulse de energia caiu 3 pontos em 2 semanas e sem 1:1 há 21 dias."
- Para: "Sinais de desengajamento em 3 das últimas 1:1s e sem registro de reconhecimento há 45 dias — risco de turnover."

**Alerta 2 — Camila Souza · Produto (Médio)**
- De: "Peer feedback recorrente sobre sobrecarga em 2 sprints seguidas."
- Para: "Menções recorrentes a sobrecarga em 1:1s e queda de evidências positivas no último ciclo de avaliação."

**Alerta 3 — Rafael Moura · Dados (Atenção)**
- Mantém como está ("Sem registros de feedback na última 1:1 — cobertura abaixo do time.") já que fala de cobertura, métrica típica de RH.

### Observações
- Só edição pt-BR no mock visual (não há equivalente em outro idioma para este card).
- Mantém o tom "Early Adopter" e evita em-dashes desnecessários.