

## Plan: Add Ctrl+V Image Paste to MentorChat

### Summary

Add clipboard image paste support to the MentorChat textarea for both leader and direct report modes. Currently, image attachment only works via file picker (leader-only). This adds paste support for both user types, reusing the existing `attachment` state and image handling logic.

### Changes

**`src/components/MentorChat.tsx`** — Single file modification

1. **Add `handlePaste` handler** (~20 lines)
   - Listen for `paste` events on the textarea
   - Check `clipboardData.items` for `image/*` types
   - Validate type (png/jpg/webp) and size (≤5MB)
   - Convert to base64 via `FileReader`
   - Set into existing `attachment` state: `{ name: 'imagem-colada.png', content: '', imageBase64, mimeType, isImage: true }`
   - Show toast: "Imagem colada!"

2. **Attach `onPaste` to textarea** (line ~848)
   - Add `onPaste={handlePaste}` to the existing `<textarea>` element

3. **Enable image sending for direct_report mode**
   - Currently `imageContent` is only built when `isLeader` (line 272). Remove that guard so both modes can send images.
   - In the direct_report fetch body (line 411), add `imageContent` field so the `meu-rhitmo` edge function receives it.

4. **Update placeholder text**
   - When attachment exists, show "Descreva o que você quer saber sobre a imagem..."
   - Add "(Ctrl+V para colar imagem)" hint to both leader and direct_report placeholders

5. **Show attachment preview for direct_report mode**
   - The attachment preview bar (lines ~820-841) currently renders for both modes, so pasted images will show automatically with the existing preview UI.

6. **Update send button disabled logic** (line 888)
   - Already checks `!input.trim() && !attachment` — no change needed.

**`supabase/functions/meu-rhitmo/index.ts`** — Add multimodal support

- Accept optional `imageContent` in the request body
- When present, build OpenAI message with `image_url` content part (same pattern as `chat-mentor`)
- Use the text from `imageContent.textMessage` or fall back to the `question` field

### Technical details

- Reuses the existing single-attachment `attachment` state — no new state needed
- Pasted image replaces any existing attachment (same as file picker behavior)
- The `handlePaste` only processes the first image item found in clipboard
- No animation library needed — the existing attachment preview bar handles display
- Mobile: paste works on Android Chrome, limited on iOS Safari (known platform limitation)

