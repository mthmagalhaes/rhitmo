// Localiza um trecho num texto de forma tolerante (ignora formatação Markdown,
// pontuação, maiúsculas e espaços). Devolve o intervalo no texto original.
const SKIP = /[\s*_`#>.,;:!?"'“”‘’()\-–—]/;

function normalize(s: string) {
  const chars: string[] = [];
  const map: number[] = [];
  for (let i = 0; i < s.length; i++) {
    const c = s[i];
    if (SKIP.test(c)) continue;
    chars.push(c.toLowerCase());
    map.push(i);
  }
  return { norm: chars.join(''), map };
}

export function findFuzzyRange(haystack: string, needle: string): { from: number; to: number } | null {
  if (!needle?.trim()) return null;
  const exact = haystack.indexOf(needle);
  if (exact >= 0) return { from: exact, to: exact + needle.length };
  const h = normalize(haystack);
  const n = normalize(needle).norm;
  if (n.length < 8) return null;
  const at = h.norm.indexOf(n);
  if (at < 0) return null;
  return { from: h.map[at], to: h.map[at + n.length - 1] + 1 };
}

export function replaceFuzzy(haystack: string, needle: string, replacement: string): string | null {
  const r = findFuzzyRange(haystack, needle);
  if (!r) return null;
  return haystack.slice(0, r.from) + replacement + haystack.slice(r.to);
}
