# Vídeo de demonstração da Rhitmo para empresa enterprise

Peça de 80 a 90 segundos, para enviar por e-mail antes da reunião. Abre com animação de marca, mostra telas reais do produto no miolo e fecha com a proposta de valor. Narração em português por voz de IA, com legendas queimadas para quem assiste sem som.

## Empresa fictícia da demo

Nada de nomes reais em material comercial. Crio uma empresa de mentira só para a gravação:

- **Nordvale Logística** (nome neutro, soa enterprise)
- Líder: Camila Duarte, gerente de Operações
- Time: Rafael Menezes, Juliana Prado, Thiago Sant'Anna, Marina Rocha
- Histórico plausível: 1:1s das últimas semanas, um risco de retenção em crescimento, uma avaliação em rascunho, sinais de colaboração no mapa de rede

Esses dados vivem em um ambiente separado, usado só para a filmagem e apagado depois. Nenhuma pessoa real aparece no vídeo.

## Roteiro (80 a 90 segundos)

1. **0s a 8s — gancho animado.** Tela escura, uma frase entra em foco: "Toda empresa perde a memória das suas conversas de liderança." Marca Rhitmo aparece em movimento.
2. **8s a 20s — o problema.** Três blocos animados com o custo: contexto perdido entre 1:1s, avaliação escrita de memória, risco percebido tarde demais.
3. **20s a 40s — pauta de 1:1 pronta.** Tela real: a reunião chega na agenda, a Rhitmo entrega a pauta com o que ficou pendente da última conversa e o que observar hoje.
4. **40s a 55s — a conversa vira memória.** Tela real: a transcrição chega sozinha, vira anotação, e o mapa mostra com quem cada pessoa trabalha de verdade.
5. **55s a 72s — avaliação com evidência.** Tela real: rascunho de avaliação citando fatos datados, cada afirmação com a origem clicável.
6. **72s a 88s — fechamento.** Volta para a animação: as quatro camadas (Pessoas, Evidências, Padrões, Percepções) se empilham, e fecha com a marca e uma linha sobre governança e dados isolados por empresa.

## Narração

Texto em português do Brasil, tom sóbrio e direto, sem promessa exagerada. Gero a voz em IA e sincronizo com as cenas. Se a voz sintética não ficar boa o suficiente para um comitê enterprise, te entrego o vídeo com a trilha de legendas e você regrava com voz humana — o corte não muda.

## Entrega

Um arquivo MP4 em 1920x1080, pronto para anexar em e-mail, mais uma versão sem narração caso você prefira falar por cima ao vivo.

## Detalhes técnicos

- Ambiente de demonstração: workspace isolado com dados semeados (workspace, team, team_members, feedbacks, upcoming_meetings, performance_reviews, context_evidence, network edges). Removido ao final via script de limpeza.
- Captura de telas: Playwright headless em 1920x1080 contra o app local, sessão autenticada da líder fictícia, gravação por rota com cursor sintético e pausas controladas.
- Composição: projeto Remotion em `/tmp/remotion` com as cenas animadas, embed dos clipes capturados, tipografia Lora/Inter e paleta creme da marca; logos vindos de `src/assets/rhitmo-logo-*`.
- Narração: Lovable AI text-to-speech em pt-BR, chunk por cena, áudio montado na timeline do Remotion.
- Render final via script programático do Remotion; saída em `/mnt/documents`.
- Nenhuma alteração no código do produto: todo o material da demo fica fora de `src/`, exceto a semeadura de dados no ambiente de demonstração.
