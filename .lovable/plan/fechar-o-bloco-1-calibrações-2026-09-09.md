# Fechar o Bloco 1 (Calibrações)

O bloco de Calibrações já está no ar: existe a tela `/lider/calibracao` com a grade do time, as decisões ficam gravadas e a ata fecha o ciclo. Faltam três coisas para considerar o bloco encerrado.

## 1. Ligar Avaliações e Calibração

Hoje a Calibração só é alcançada pelo menu lateral. Quem está preparando as avaliações não é levado até ela.

- Na tela de Avaliações, um bloco no topo: "Comparar o time antes de fechar as notas", com o ciclo atual, quantas pessoas já têm decisão confirmada e um botão que leva à grade.
- Na grade de calibração, cada pessoa ganha um atalho de volta para a avaliação formal dela, para o líder conferir a evidência antes de confirmar.

## 2. Conferir os dados de verdade

Antes de dizer "pronto", verificar no banco que a grade devolve as pessoas certas para um líder real da Faster, que uma decisão salva persiste e que o fechamento de ciclo grava quem decidiu e quando.

## 3. Verificação de segurança

Rodar o verificador de segurança do banco e corrigir qualquer alerta que tenha vindo das mudanças de Calibração (acesso à sessão, à grade e às decisões). Alertas antigos, que já existiam antes, ficam listados para você decidir, sem entrar neste bloco.

## Detalhes técnicos

- `src/pages/lider/Avaliacoes.tsx`: novo card de entrada usando `useCalibrationSessions` (sessão `draft` mais recente do workspace) + contagem de `calibration_decisions` confirmadas; link para `/lider/calibracao`.
- `src/components/leader/calibracao/CalibrationGrid.tsx`: link por linha para `/lider/avaliacoes?member=<id>`; sem mudança de RPC.
- Verificação por consulta de leitura em `calibration_sessions` / `calibration_decisions` e chamada de `get_calibration_grid` para um líder real.
- `supabase--linter` + varredura de segurança; corrigir só o que a migração de Calibração introduziu.
- Sem migração nova e sem mudança destrutiva.

Depois disso, o próximo bloco em aberto continua sendo o Auto Draft (rascunho sob demanda, só quando o líder pedir) — não entra agora.
