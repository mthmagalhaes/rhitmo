/**
 * Bias Detection v1 — Gender Bias (client-side, word-list based)
 *
 * Detects gendered language patterns in Portuguese review text and
 * suggests neutral alternatives. Educational, non-blocking.
 */

const FEMININE_CODED_WORDS = [
  'organizada', 'organizad', 'cuidadosa', 'atenciosa', 'colaborativa',
  'dedicada', 'confiável', 'detalhista', 'meticulosa',
  'prestativa', 'empática', 'sensível', 'gentil', 'simpática',
  'acolhedora', 'maternal', 'dócil', 'obediente',
];

const MASCULINE_CODED_WORDS = [
  'assertivo', 'decisivo', 'líder nato', 'estratégico',
  'visionário', 'confiante', 'dominante', 'ambicioso', 'competitivo',
  'independente', 'objetivo', 'direto', 'forte', 'agressivo',
  'arrojado', 'destemido',
];

export const NEUTRAL_ALTERNATIVES: Record<string, string[]> = {
  // feminine-coded
  'organizada': ['estruturado/a', 'sistemático/a', 'planejador/a'],
  'organizad': ['estruturado/a', 'sistemático/a'],
  'cuidadosa': ['atento/a aos detalhes', 'minucioso/a', 'preciso/a'],
  'atenciosa': ['observador/a', 'perceptivo/a'],
  'colaborativa': ['trabalha bem em equipe', 'facilita colaboração'],
  'dedicada': ['comprometido/a', 'engajado/a com resultados'],
  'detalhista': ['orientado/a a qualidade', 'analítico/a'],
  'meticulosa': ['rigoroso/a', 'orientado/a a qualidade'],
  'prestativa': ['proativo/a', 'orientado/a a soluções'],
  'empática': ['boa escuta ativa', 'demonstra inteligência emocional'],
  'sensível': ['perceptivo/a', 'demonstra inteligência emocional'],
  'gentil': ['respeitoso/a', 'comunicação assertiva e empática'],
  'simpática': ['acessível', 'constrói bons relacionamentos'],
  'acolhedora': ['cria ambiente seguro', 'promove inclusão'],
  'maternal': ['cuidado com desenvolvimento do time'],
  'dócil': ['receptivo/a a feedback', 'flexível'],
  'obediente': ['alinhado/a com diretrizes', 'confiável na execução'],
  // masculine-coded
  'assertivo': ['comunica claramente', 'expressa opiniões com clareza'],
  'decisivo': ['toma decisões rapidamente', 'age com clareza'],
  'líder nato': ['lidera iniciativas', 'inspira o time'],
  'estratégico': ['pensamento de longo prazo', 'visão sistêmica'],
  'visionário': ['pensamento inovador', 'orientado/a ao futuro'],
  'confiante': ['seguro/a nas entregas', 'autoconfiante'],
  'dominante': ['influente', 'exerce liderança efetiva'],
  'ambicioso': ['orientado/a a crescimento', 'busca desafios'],
  'competitivo': ['orientado/a a resultados', 'alta performance'],
  'independente': ['autônomo/a', 'autogerenciável'],
  'objetivo': ['pragmático/a', 'foco em resultados'],
  'direto': ['comunicação clara', 'transparente'],
  'forte': ['resiliente', 'consistente sob pressão'],
  'agressivo': ['proativo/a', 'orientado/a a resultados'],
  'arrojado': ['corajoso/a', 'assume riscos calculados'],
  'destemido': ['corajoso/a', 'enfrenta desafios com confiança'],
};

export interface BiasDetectionResult {
  hasBias: boolean;
  biasType: 'gender' | null;
  biasDirection: 'feminine' | 'masculine' | null;
  detectedWords: string[];
  suggestions: string[];
  explanation: string;
}

export interface BiasMatch {
  word: string;
  type: 'feminine' | 'masculine';
  suggestion: string;
  from: number;
  to: number;
}

/**
 * Position-aware bias detection for real-time editor highlighting.
 * Returns exact character offsets in plain text for each biased word found.
 */
export function detectBiasWithPositions(plainText: string): BiasMatch[] {
  const lower = plainText.toLowerCase();
  const matches: BiasMatch[] = [];

  const scanWords = (words: string[], type: 'feminine' | 'masculine') => {
    for (const word of words) {
      const lowerWord = word.toLowerCase();
      let idx = lower.indexOf(lowerWord);
      while (idx !== -1) {
        const alts = NEUTRAL_ALTERNATIVES[word];
        matches.push({
          word: plainText.slice(idx, idx + lowerWord.length),
          type,
          suggestion: alts ? alts[0] : 'Considere reformular',
          from: idx,
          to: idx + lowerWord.length,
        });
        idx = lower.indexOf(lowerWord, idx + 1);
      }
    }
  };

  scanWords(FEMININE_CODED_WORDS, 'feminine');
  scanWords(MASCULINE_CODED_WORDS, 'masculine');

  // Sort by position
  matches.sort((a, b) => a.from - b.from);

  // Deduplicate overlapping matches (keep longest)
  const deduped: BiasMatch[] = [];
  for (const m of matches) {
    const last = deduped[deduped.length - 1];
    if (last && m.from < last.to) {
      if (m.to - m.from > last.to - last.from) {
        deduped[deduped.length - 1] = m;
      }
    } else {
      deduped.push(m);
    }
  }

  return deduped;
}

function stripHtml(text: string): string {
  return text.replace(/<[^>]*>/g, ' ');
}

export function detectGenderBias(html: string): BiasDetectionResult {
  const text = stripHtml(html).toLowerCase();

  const feminineWords = FEMININE_CODED_WORDS.filter(w => text.includes(w));
  const masculineWords = MASCULINE_CODED_WORDS.filter(w => text.includes(w));

  const hasFeminineBias = feminineWords.length >= 2;
  const hasMasculineBias = masculineWords.length >= 2;

  if (!hasFeminineBias && !hasMasculineBias) {
    return { hasBias: false, biasType: null, biasDirection: null, detectedWords: [], suggestions: [], explanation: '' };
  }

  const isFeminine = hasFeminineBias;
  const detectedWords = isFeminine ? feminineWords : masculineWords;

  const suggestions: string[] = [];
  detectedWords.forEach(word => {
    const alts = NEUTRAL_ALTERNATIVES[word];
    if (alts) {
      suggestions.push(`"${word}" → ${alts.join(' ou ')}`);
    }
  });

  if (isFeminine) {
    suggestions.push('Considere também destacar: liderança de iniciativas, tomada de decisões, visão de negócio.');
  } else {
    suggestions.push('Considere se mulheres no time demonstram essas mesmas qualidades e recebem reconhecimento equivalente.');
  }

  const explanation = isFeminine
    ? `Palavras como "${detectedWords.join('", "')}" são frequentemente usadas apenas para mulheres, mesmo quando homens demonstram as mesmas qualidades. Considere linguagem mais neutra.`
    : `Palavras como "${detectedWords.join('", "')}" são frequentemente associadas a homens. Considere se o reconhecimento é equitativo no time.`;

  return {
    hasBias: true,
    biasType: 'gender',
    biasDirection: isFeminine ? 'feminine' : 'masculine',
    detectedWords,
    suggestions,
    explanation,
  };
}
