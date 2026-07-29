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
type FileType = 'pdf' | 'docx' | 'txt' | 'md' | 'image';

export const SUPPORTED_MIME_TYPES: Record<string, FileType> = {
  'application/pdf': 'pdf',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document': 'docx',
  'text/plain': 'txt',
  'text/markdown': 'md',
  'image/png': 'image',
  'image/jpeg': 'image',
  'image/webp': 'image',
};

export const SUPPORTED_EXTENSIONS = ['pdf', 'docx', 'txt', 'md', 'png', 'jpg', 'jpeg', 'webp'] as const;

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

/**
 * Extract text from images using GPT-4o Vision OCR
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
      case 'pdf':
        return await extractFromPdf(file);
      case 'docx':
        return await extractFromDocx(file);
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
