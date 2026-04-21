/**
 * Remove markers tipo "(feedback_id=uuid, data=YYYY-MM-DD)" que a IA antiga
 * costumava embutir no texto do Rhitmo Mensal. As evidências reais são
 * renderizadas separadamente via <EvidenceChips>, então o texto deve ficar
 * em prosa limpa.
 *
 * Cobre variações: feedback_id, meeting_id, data/date, com ou sem espaços,
 * separadores por vírgula ou ponto-e-vírgula, parênteses ou colchetes.
 */
export function stripInlineEvidenceMarkers(text: string | null | undefined): string {
  if (!text) return '';
  let out = text;

  // (feedback_id=..., data=...) ou (meeting_id=..., date=...) — remove o parêntese inteiro
  out = out.replace(
    /\s*[\(\[]\s*(?:feedback_id|meeting_id|recap_id|note_id|id)\s*=\s*[a-f0-9-]+\s*(?:[,;]\s*(?:data|date)\s*=\s*[\d\-\/]+)?\s*[\)\]]/gi,
    ''
  );
  // (data=2026-03-12) sozinho
  out = out.replace(/\s*[\(\[]\s*(?:data|date)\s*=\s*[\d\-\/]+\s*[\)\]]/gi, '');
  // resíduos: "feedback_id=uuid" sem parêntese
  out = out.replace(/\s*(?:feedback_id|meeting_id|recap_id|note_id)\s*=\s*[a-f0-9-]+/gi, '');

  // espaços duplicados, espaço antes de pontuação, vírgulas órfãs
  out = out.replace(/\s+([.,;:!?])/g, '$1');
  out = out.replace(/\s{2,}/g, ' ');
  out = out.trim();
  // remove ponto solto se sobrou ".."
  out = out.replace(/\.{2,}/g, '.');
  return out;
}
