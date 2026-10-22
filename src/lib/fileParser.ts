import { supabase } from '@/integrations/supabase/client';

/**
 * pdfjs-dist and mammoth are heavy (~1MB combined) and only needed when the
 * user actually uploads a PDF/DOCX. They are imported dynamically so they stay
 * out of the initial bundle.
 */
async function loadPdfjs() {
  const pdfjsLib = await import('pdfjs-dist');
  pdfjsLib.GlobalWorkerOptions.workerSrc = `https://unpkg.com/pdfjs-dist@${pdfjsLib.version}/build/pdf.worker.min.mjs`;
  return pdfjsLib;
}

// Supported file types
type FileType = 'pdf' | 'docx' | 'pptx' | 'txt' | 'md' | 'image';

export const SUPPORTED_MIME_TYPES: Record<string, FileType> = {
  'application/pdf': 'pdf',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document': 'docx',
  'application/vnd.openxmlformats-officedocument.presentationml.presentation': 'pptx',
  'text/plain': 'txt',
  'text/markdown': 'md',
  'image/png': 'image',
  'image/jpeg': 'image',
  'image/webp': 'image',
};

export const SUPPORTED_EXTENSIONS = ['pdf', 'docx', 'pptx', 'txt', 'md', 'png', 'jpg', 'jpeg', 'webp'] as const;

/**
 * Detects file type by MIME type first, with fallback to extension
 */
function getFileType(file: File): FileType | 'unknown' {
  // 1. Try MIME type first
  const mimeType = SUPPORTED_MIME_TYPES[file.type];
  if (mimeType) return mimeType;

  // 2. Fallback to extension
  const extension = file.name.split('.').pop()?.toLowerCase();
  if (extension && SUPPORTED_EXTENSIONS.includes(extension as any)) {
    // Map jpg to image type
    if (extension === 'jpg' || extension === 'jpeg' || extension === 'png' || extension === 'webp') {
      return 'image';
    }
    return extension as FileType;
  }

  return 'unknown';
}

/**
 * Extract text from plain text files (TXT, MD)
 */
async function extractFromText(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = (e) => resolve(e.target?.result as string);
    reader.onerror = () => reject(new Error('Falha ao ler arquivo de texto'));
    reader.readAsText(file);
  });
}

/**
 * Extract text from PDF files using pdfjs-dist
 */
async function extractFromPdf(file: File): Promise<string> {
  const pdfjsLib = await loadPdfjs();
  const arrayBuffer = await file.arrayBuffer();
  const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise;
  let fullText = '';

  for (let i = 1; i <= pdf.numPages; i++) {
    const page = await pdf.getPage(i);
    const textContent = await page.getTextContent();
    const pageText = textContent.items
      .map((item: any) => item.str)
      .join(' ');
    fullText += pageText + '\n';
  }

  return fullText.trim();
}

/**
 * Extract text from DOCX files using mammoth
 */
async function extractFromDocx(file: File): Promise<string> {
  const { default: mammoth } = await import('mammoth');
  const arrayBuffer = await file.arrayBuffer();
  const result = await mammoth.extractRawText({ arrayBuffer });
  return result.value;
}

/**
 * Extract text from PowerPoint (.pptx) by reading slide XML (<a:t> runs).
 */
async function extractFromPptx(file: File): Promise<string> {
  const { default: JSZip } = await import('jszip');
  const zip = await JSZip.loadAsync(await file.arrayBuffer());
  const slideNames = Object.keys(zip.files)
    .filter((n) => /^ppt\/slides\/slide\d+\.xml$/.test(n))
    .sort((a, b) => Number(a.match(/(\d+)/)![1]) - Number(b.match(/(\d+)/)![1]));
  const decode = (t: string) => t.replace(/&amp;/g, '&').replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&quot;/g, '"').replace(/&apos;/g, "'");
  const out: string[] = [];
  for (const [idx, name] of slideNames.entries()) {
    const xml = await zip.file(name)!.async('string');
    const paras = xml.split(/<\/a:p>/).map((p) => [...p.matchAll(/<a:t>([^<]*)<\/a:t>/g)].map((m) => decode(m[1])).join('')).filter(Boolean);
    if (paras.length) out.push(`--- Slide ${idx + 1} ---\n${paras.join('\n')}`);
  }
  return out.join('\n\n');
}

/**
 * Convert file to base64
 */
function fileToBase64(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = () => reject(new Error('Falha ao ler imagem'));
    reader.readAsDataURL(file);
  });
}

const MAX_AI_PDF_BYTES = 15 * 1024 * 1024;

/**
 * Extract text from images (and PDFs) using AI vision via the backend.
 */
async function extractFromImage(file: File): Promise<string> {
  const base64Data = await fileToBase64(file);
  // Remove the data:image/...;base64, prefix
  const base64Image = base64Data.split(',')[1];

  const { data, error } = await supabase.functions.invoke('extract-text-vision', {
    body: { 
      base64Image,
      mimeType: file.type 
    }
  });

  if (error) {
    console.error('[fileParser] OCR error:', error);
    throw new Error('Falha ao extrair texto da imagem');
  }

  if (!data?.text || data.text === '[Nenhum texto detectado]') {
    throw new Error('Nenhum texto detectado na imagem');
  }

  return data.text;
}

/**
 * Main export: Extract text from file with graceful error handling
 * Throws user-friendly error message if extraction fails
 */
export async function extractTextFromFile(file: File): Promise<string> {
  try {
    const fileType = getFileType(file);

    switch (fileType) {
      case 'pdf': {
        let text = '';
        try { text = await extractFromPdf(file); } catch (e) { console.warn('[fileParser] pdfjs falhou, tentando IA', e); }
        // 1A — PDF de slides/escaneado: pouco ou nenhum texto → IA lê o PDF.
        if (text.replace(/\s+/g, '').length < 200 && file.size <= MAX_AI_PDF_BYTES) {
          try {
            const aiText = await extractFromImage(file);
            if (aiText.trim().length > text.trim().length) return aiText;
          } catch (e) { console.warn('[fileParser] leitura por IA do PDF falhou', e); }
        }
        if (!text.trim()) throw new Error('PDF sem texto legível');
        return text;
      }
      case 'docx':
        return await extractFromDocx(file);
      case 'pptx':
        return await extractFromPptx(file);
      case 'txt':
      case 'md':
        return await extractFromText(file);
      case 'image':
        return await extractFromImage(file);
      case 'unknown':
      default:
        throw new Error('Formato de arquivo não suportado');
    }
  } catch (error) {
    // Log for debugging
    console.error('[fileParser] Erro ao processar arquivo:', error);

    // Rethrow with user-friendly message
    throw new Error(
      'Não conseguimos ler o texto deste arquivo. Tente copiar e colar o conteúdo.'
    );
  }
}

/**
 * Validate if file extension is supported
 */
export function isFileSupported(file: File): boolean {
  return getFileType(file) !== 'unknown';
}

/**
 * 1A — Lê um print e sugere a data do ocorrido, só quando ela aparece no print.
 * Usado pelo Magic Paste / Nova anotação.
 */
export async function extractFromImageWithMeta(file: File): Promise<{ text: string; occurredAt: string | null }> {
  try {
    const base64Data = await fileToBase64(file);
    const { data, error } = await supabase.functions.invoke('extract-text-vision', {
      body: { base64Image: base64Data.split(',')[1], mimeType: file.type, mode: 'extract_meta' },
    });
    if (error || !data?.text || data.text === '[Nenhum texto detectado]') throw new Error('ocr_failed');
    const occ = typeof data.occurred_at === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(data.occurred_at) ? data.occurred_at : null;
    return { text: data.text, occurredAt: occ };
  } catch (e) {
    console.error('[fileParser] meta OCR error:', e);
    throw new Error('Não conseguimos ler o texto deste arquivo. Tente copiar e colar o conteúdo.');
  }
}
