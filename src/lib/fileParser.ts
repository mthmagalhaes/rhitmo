import * as pdfjsLib from 'pdfjs-dist';
import mammoth from 'mammoth';

// Configure PDF.js worker using unpkg (reliable for all versions)
pdfjsLib.GlobalWorkerOptions.workerSrc = `https://unpkg.com/pdfjs-dist@${pdfjsLib.version}/build/pdf.worker.min.mjs`;

// Supported file types
export const SUPPORTED_MIME_TYPES: Record<string, 'pdf' | 'docx' | 'txt' | 'md'> = {
  'application/pdf': 'pdf',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document': 'docx',
  'text/plain': 'txt',
  'text/markdown': 'md',
};

export const SUPPORTED_EXTENSIONS = ['pdf', 'docx', 'txt', 'md'] as const;

/**
 * Detects file type by MIME type first, with fallback to extension
 */
function getFileType(file: File): 'pdf' | 'docx' | 'txt' | 'md' | 'unknown' {
  // 1. Try MIME type first
  const mimeType = SUPPORTED_MIME_TYPES[file.type];
  if (mimeType) return mimeType;

  // 2. Fallback to extension
  const extension = file.name.split('.').pop()?.toLowerCase();
  if (extension && SUPPORTED_EXTENSIONS.includes(extension as any)) {
    return extension as 'pdf' | 'docx' | 'txt' | 'md';
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
  const arrayBuffer = await file.arrayBuffer();
  const result = await mammoth.extractRawText({ arrayBuffer });
  return result.value;
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
