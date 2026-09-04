# Rhitmo 2.0 — Plano mestre

Data: 04/09/2026
Papel deste documento: painel de status + roadmap. É o arquivo que abrimos para saber "onde estamos" e "o que vem depois".
Detalhe técnico de implementação das Fases 0–2 e dos pilares continua em `rhitmo-v2-conector-first-bot-como-add-on-2026-09-02.md`, que segue valendo como referência. Este documento não repete aquele conteúdo.

## Tese

Rhitmo 2.0 é uma camada de inteligência de liderança sobre o que a empresa já usa, não mais "mais um bot na sala". O caminho padrão de entrada é conectar as ferramentas de captura que o time já roda (note takers, Slack); o bot de reunião passa a ser add-on opcional, não a fundação do produto.

Inspiração declarada: Windmill (gowindmill.com, US$ 12M seed, 100+ clientes), adaptado ao mercado brasileiro.

ICP permanece genérico, todos os setores. Decisão explícita de **não** estreitar para tech-first — por isso GitHub e Linear não entram na fila de conectores.

## Status — o que já está no ar (verificado no projeto, não estimado)

- **Fases 0, 1 e 2 do modelo conector-first completas**: fundação de dados e flag de versão, conectores de note taker Granola e Fireflies (conexão, sincronização, card em configurações), pricing de R$ 10 por assento/mês com add-on de bot de R$ 19,90/mês (4h), checkout, webhook de assinatura, enforcement de horas no agendamento do bot e tela de billing do v2.
- **Cadastro novo nasce direto em `ui_version = 'v2'`** — o padrão do banco foi alterado; contas existentes não foram tocadas.
- **Landing pública (pt/en) atualizada**: mostra R$ 10 por pessoa/mês (R$ 8 no anual) como preço principal e o bot como item opcional dentro do mesmo card. Não há mais menção a "4h inclusas no assento". FAQ e bloco de transcrição explicam as três opções: add-on, teste vitalício de 5h ou conectar Granola/Fireflies sem custo.
- **Migração de dados concluída** para os três workspaces reais, preservando o comportamento "sem teto" via `grandfather_until`:

  | Workspace | Membros | Interface | Plano legado até |
  |---|---|---|---|
  | Faster | 26 | v2 | 31/12/2027 |
  | Fapeduca | 2 | v2 | 08/11/2026 |
  | FAP - Faculdade Baixo Parnaíba | 2 | v2 | 08/11/2026 |

  Os 6 workspaces sem membros continuam em v1, intocados.
- **Visão BP (`/hr` e `/hr/ritmo`) confirmada funcionando com dado real**, sem depender de nada que o v2 alterou. Mostra apenas datas, contagens e status — nenhum conteúdo de 1:1.
- **Indicador de PDI removido de todas as telas de RH** (coluna na lista por líder, selo na ficha do liderado, cartão de maturidade, alerta de cobertura e selo na lista de risco), incluindo o campo nas duas consultas de ritmo. A feature está fora do menu principal desde o enxugamento; exibi-la só passava impressão errada de baixa cobertura. Nada relacionado a PDI fora das telas de RH foi alterado e nenhum dado foi apagado.

## Gaps conhecidos, não resolvidos

- **Otter como conector de note taker: nunca foi implementado.** Hoje existem apenas Granola e Fireflies — não há referência a Otter no catálogo de provedores, na UI ou no backend. Não bloqueia o gate, mas é uma lacuna real da Fase 1 original.
- **O sinal que destrava os pilares novos ainda não existe.** A condição é ≥ 40% de conexão de note taker entre líderes novos, e até agora ninguém de fora de Faster/Fapeduca/FAP usou o v2. Nenhum piloto pago externo foi fechado.
- **Depoimentos reais na landing**: adiado, aguardando coleta pelo Matheus. Não é tarefa de engenharia.

## Gate por pilar (resumo)

Os dois critérios: **(a)** sinal de adoção medido — conexão de note taker ≥ 40% entre líderes novos da Fase 1; **(b)** justificativa escrita do "por que agora". Texto completo e o raciocínio de cada caso estão no plano técnico de 02/09/2026.

| Pilar | Precisa de (a)? | Precisa de (b)? | Resumo |
|---|---|---|---|
| Auto Draft | sim | não | Território novo; nunca existiu nem falhou. |
| Calibrações | sim | não | Pilar novo do roadmap, entra depois do conector-first validado. |
| ONA passivo | sim | **não** | Mecanismo mudou: observação passiva via Slack Ambient Mode + conectores, sem indicação manual de pares. Justificativa já registrada. |
| Pulse Survey | sim | **sim** | Mecanismo inalterado (coleta ativa), que já falhou duas vezes. |

## Próximo passo real (não é código)

O gargalo hoje não é engenharia — é validação externa. Nenhum pilar novo avança até existir uso real de fora da Faster gerando o sinal de adoção.

Ordem recomendada:

1. Fechar o gap do Otter, se for rápido.
2. Retomar outreach para CHROs e HR Leaders, agora com o v2 estável.
3. Só então reavaliar os pilares com dado real, não com hipótese.

## Corte do v1

Última etapa. Só depois que os pilares liberados pelo gate estiverem no ar e em uso. **Sem data alvo definida** — o corte acontece quando fizer sentido pelo uso, não por calendário.
