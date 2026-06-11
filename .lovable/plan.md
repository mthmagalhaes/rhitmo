## Objetivo
Permitir que o líder feche/dispense o card "Insight da Rhitmo" na página `/lider/diario`, sem voltar até a próxima sessão (ou até um novo gap aparecer).

## Comportamento
- Botão `X` discreto no canto superior direito do card (mesmo padrão visual do `MirrorInsightCard`).
- Ao dispensar: card some imediatamente e a escolha persiste por **7 dias** (depois reaparece se ainda houver gaps — assim o líder não perde o sinal pra sempre).
- Persistência via `localStorage`, com chave escopada por usuário: `rhitmo:diary-coverage-dismissed:{userId}` guardando timestamp ISO.
- Se a lista de gaps mudar de assinatura (ids + dias arredondados) durante o período, o card volta — sinal novo merece atenção. Implementação: a chave guarda também um hash dos ids dos gaps; muda o hash → ignora dismissal.
- Estado "tudo em dia" (verde) **não** ganha botão de fechar (é positivo e raro, sem ruído).

## Arquivos
- `src/components/leader/diario/DiaryCoverageInsight.tsx` — adicionar botão de fechar, hook leve de dismissal com `localStorage`, ler `useEffectiveUser` pra escopar a chave.

Sem mudanças em `Diario.tsx`, sem backend, sem migrations.