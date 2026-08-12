---
name: Conector Granola (note taker BYOK)
description: Líder cola Personal API key do Granola em Configurações > Conectores; notas viram evidência no Diário sem custo de Recall.ai
type: feature
---

# Conector Granola (BYOK)

- **Por que:** cada hora transcrita pelo bot Recall.ai custa ~US$0,45. Quando o líder já usa Granola, a transcrição vem de graça — o conector é **redução de custo**, não gasto novo.
- **Auth:** Granola não tem OAuth público. É BYOK: Personal API key (Settings → Connectors → API no app do Granola), enviada uma única vez e guardada criptografada (AES-GCM, `NOTE_TAKER_KEY_SECRET`). Nunca volta para o browser.
- **Tabelas:** `leader_note_taker_connections` (uma por líder/provider) e `note_taker_synced_notes` (idempotência por `external_note_id`).
- **Backend:** `_shared/noteTakerCrypto.ts`, `_shared/granolaClient.ts` (`/v1/notes`, `created_after`, `cursor`), `_shared/noteTakerSync.ts` (match de liderado por e-mail do participante, fallback por menção no título), edge `note-taker-connect` (connect/disconnect/sync) e `sync-note-taker` (cron `sync-note-taker-every-30min`, */30, criado via RPC `schedule_note_taker_cron` com o CRON_SECRET real).
- **Pipeline:** nota importada vira `feedbacks.source = 'granola'` e dispara `summarize-transcript` → resumo estruturado, abas Resumo/Transcrição/Pergunte à Rhitmo e lente pessoal, igual ao bot.
- **UI:** `src/components/settings/GranolaConnectorCard.tsx` dentro da seção "Captura de reuniões" na aba **Conectores** de `/lider/configuracoes`. Chip verde-limão "Granola" no Diário (`src/lib/diarySource.ts`) e opção no filtro de Origem.
- **Regra:** só importa nota cujos participantes casam com um liderado do líder; o resto é ignorado (privacidade + ruído).
