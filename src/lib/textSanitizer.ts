 /**
  * Text Sanitizer - Limpa HTML e normaliza texto de transcrições
  * Garante que a IA receba texto puro para o Protocolo de Identidade funcionar
  */
 
 // Mapa de entidades HTML comuns
 const HTML_ENTITIES: Record<string, string> = {
   '&nbsp;': ' ',
   '&amp;': '&',
   '&lt;': '<',
   '&gt;': '>',
   '&quot;': '"',
   '&#39;': "'",
   '&apos;': "'",
   '&#x27;': "'",
   '&mdash;': '—',
   '&ndash;': '–',
   '&hellip;': '...',
   '&copy;': '©',
   '&reg;': '®',
   '&trade;': '™',
   '&bull;': '•',
   '&middot;': '·',
 };
 
 /**
  * Remove todas as tags HTML do texto
  */
 function stripHtmlTags(text: string): string {
   return text.replace(/<[^>]*>?/gm, '');
 }
 
 /**
  * Decodifica entidades HTML comuns
  */
 function decodeHtmlEntities(text: string): string {
   let result = text;
   
   // Substituir entidades nomeadas
   for (const [entity, char] of Object.entries(HTML_ENTITIES)) {
     result = result.replace(new RegExp(entity, 'gi'), char);
   }
   
   // Substituir entidades numéricas (ex: &#60;)
   result = result.replace(/&#(\d+);/g, (_, code) => 
     String.fromCharCode(parseInt(code, 10))
   );
   
   // Substituir entidades hex (ex: &#x3C;)
   result = result.replace(/&#x([0-9a-fA-F]+);/g, (_, code) => 
     String.fromCharCode(parseInt(code, 16))
   );
   
   return result;
 }
 
 /**
  * Normaliza quebras de linha excessivas
  */
 function normalizeLineBreaks(text: string): string {
   return text
     .replace(/\r\n/g, '\n')           // Windows → Unix
     .replace(/\r/g, '\n')             // Mac antigo → Unix
     .replace(/\n{3,}/g, '\n\n')       // Múltiplas quebras → máximo 2
     .trim();
 }
 
 /**
  * Normaliza espaços em branco
  */
 function normalizeWhitespace(text: string): string {
   return text
     .replace(/[\t ]+/g, ' ')          // Múltiplos espaços/tabs → 1 espaço
     .replace(/ +\n/g, '\n')           // Remove espaços antes de quebra
     .replace(/\n +/g, '\n')           // Remove espaços depois de quebra
     .trim();
 }
 
 /**
  * Função principal: Limpa texto de transcrição
  * 
  * Pipeline de limpeza:
  * 1. Remove tags HTML
  * 2. Decodifica entidades HTML
  * 3. Normaliza quebras de linha
  * 4. Normaliza espaços em branco
  */
 export function cleanTranscriptText(text: string): string {
   if (!text) return '';
   
   let cleaned = text;
   
   // Pipeline de limpeza
   cleaned = stripHtmlTags(cleaned);
   cleaned = decodeHtmlEntities(cleaned);
   cleaned = normalizeLineBreaks(cleaned);
   cleaned = normalizeWhitespace(cleaned);
   
   return cleaned;
 }
 
 /**
  * Detecta se o texto contém HTML
  */
 export function containsHtml(text: string): boolean {
   // Verifica tags HTML
   if (/<[a-zA-Z][^>]*>/.test(text)) return true;
   
   // Verifica entidades HTML comuns
   if (/&(nbsp|amp|lt|gt|quot|#\d+|#x[0-9a-fA-F]+);/i.test(text)) return true;
   
   return false;
 }