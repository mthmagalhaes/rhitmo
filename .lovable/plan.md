# 1A + 1B: ler prints/PDFs com IA e resposta ao vivo no "Pergunte à Rhitmo"

Regra geral: cada mudança tem uma "rede de segurança" que cai no comportamento atual se algo falhar. Nada do fluxo guiado, Espelho, compartilhar ou edição muda.

## 1A. Prints e PDFs lidos direto pela IA
Hoje: imagens já viram texto (OCR), PDFs são lidos no navegador. O ponto fraco são PDFs de apresentação ou escaneados (ex.: deck de cultura exportado do Slides), que chegam sem texto e dão erro "não conseguimos ler".

O que muda:
- **Cultura (RH):** se o PDF vier sem texto ou com texto muito curto, a Rhitmo manda o próprio PDF para a IA ler (até ~20 páginas / 15 MB). O RH não precisa mais copiar e colar.
- **Nova anotação / Magic Paste:** ao soltar um print de WhatsApp/Slack, além do texto, a IA sugere a **data do ocorrido** quando ela aparece no print. O líder vê a sugestão e confirma; nada é preenchido sem evidência (se não houver data visível, fica como hoje).
- **Segurança:** a leitura de imagens passa a exigir login (hoje aceita chamadas sem usuário).

Rede de segurança: se a leitura pela IA falhar, mostra a mesma mensagem de hoje e o fluxo de colar texto continua disponível.

## 1B. Resposta aparecendo ao vivo no "Pergunte à Rhitmo"
Hoje o líder espera 4 a 9 s olhando "pensando…" e o texto chega de uma vez.

O que muda:
- No chat do líder (com liderado ou Coaching pessoal), a resposta começa a aparecer palavra por palavra em ~1 s.
- Citações `[doc:…]` só viram pílula quando completas (sem piscar código cru).
- A mensagem é salva no histórico apenas quando termina, igual hoje.
- Botão "Parar" interrompe a resposta e salva o que já foi escrito.
- O chat do liderado ("Meu Rhitmo") e o Slack ficam como estão nesta etapa.

Rede de segurança: se o streaming falhar antes de começar, o chat refaz a chamada no modo atual (resposta inteira) automaticamente.

## Detalhes técnicos
- `extract-text-vision`: `auth.getUser()` obrigatório, CORS do SDK, Zod; aceita `application/pdf` via parte `file` (data URL) além de `image_url`; modo `extract_meta` retorna `{ text, occurred_at|null }` por tool call; `occurred_at` só quando literal no conteúdo. Modelo mantido `google/gemini-2.5-pro` (já em uso).
- `src/lib/fileParser.ts`: PDF com < 200 caracteres extraídos → fallback para `extract-text-vision` com o PDF em base64 (limite de tamanho checado antes). Nova função `extractFromImageWithMeta` usada só pelo `NewNoteDialog`.
- `NewNoteDialog.tsx`: chip "Data sugerida pelo print: dd/mm — usar?" que preenche `occurred_at` só ao clicar.
- `chat-mentor`: novo flag `stream: true` no corpo; quando presente, a chamada final (linha ~1084) vai com `stream: true` e repassa SSE (`text/event-stream`) com CORS; evento final `metadata` com `summary_applied`. Sem o flag, resposta JSON idêntica à atual (Slack e `meu-rhitmo` não mudam). Pós-processamento que hoje roda sobre o texto completo (sanitização/citações) passa a rodar no cliente ao final e no servidor no evento final.
- `MentorChat.tsx` (ramo líder): leitor SSE linha a linha, mensagem otimista do assistente atualizada a cada token, `AbortController` no botão Parar, insert em `mentor_messages` no fim; fallback para o fluxo JSON com retries atual se o stream falhar antes do primeiro token.
- Verificação: typecheck, deploy de `chat-mentor` e `extract-text-vision`, teste via curl (stream e não-stream), Playwright no chat do líder e upload de um PDF de slides em Cultura.
