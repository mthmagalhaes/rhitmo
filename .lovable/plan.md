

## Plano: Atualizar copy dos cards Produtividade e Economia na seção Impacto Mensurável

### Análise dos dados fornecidos

**Card Produtividade (header `4h → 2min` mantido):**
- Gestores gastam 210h/ano (5 semanas) em gestão de desempenho
- Só a redação consome 65h/ano
- Preparação de dados: 48h/ano
- Com IA, preparação cai 75% e tempo total cai 25%

**Card Economia (header `60%` mantido):**
- Custo em grandes empresas: US$ 2,4M a US$ 35M/ano
- 95% dos gestores insatisfeitos com sistemas tradicionais
- 90% dos líderes de RH dizem que o processo não gera dados precisos

**Card Equidade:** intocado.

### Mudanças em `src/pages/Landing.tsx`

**PT (linha 93):**
```
De: "Tempo médio para escrever uma avaliação de desempenho completa. De uma tarde inteira para o tempo de um café."
Para: "Gestores dedicam 210 horas por ano a avaliações de desempenho. São cinco semanas inteiras. Só a redação consome 65 horas. Com Rhitmo, o draft sai pronto em segundos."
```

**PT (linha 97):**
```
De: "Redução no custo por líder comparado a plataformas tradicionais de performance management."
Para: "Em grandes empresas, avaliações tradicionais custam até US$ 35 milhões por ano. E 95% dos gestores estão insatisfeitos com o resultado. Rhitmo corta o custo e entrega precisão."
```

**EN (linha 300):**
```
De: "Average time to write a complete performance review. From an entire afternoon to the time of a coffee break."
Para: "Managers spend 210 hours per year on performance reviews. That's five full weeks. Writing alone takes 65 hours. With Rhitmo, the draft is ready in seconds."
```

**EN (linha 304):**
```
De: "Cost reduction per leader compared to traditional performance management platforms."
Para: "In large companies, traditional reviews cost up to $35 million per year. And 95% of managers are dissatisfied with the results. Rhitmo cuts costs and delivers precision."
```

### O que não muda
- Headers dos 3 cards (4h → 2min, 38x, 60%)
- Card de Equidade (38x)
- Layout, cores, tipografia, estrutura JSX

