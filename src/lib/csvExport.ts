// Sprint 18 — utilitário de export CSV (sem libs externas).
// Lida com escaping de aspas, vírgulas e quebras de linha.

export type CsvRow = Record<string, string | number | null | undefined>;

function escapeCell(v: string | number | null | undefined): string {
  if (v === null || v === undefined) return '';
  const s = String(v);
  if (/[",\n;]/.test(s)) return `"${s.replace(/"/g, '""')}"`;
  return s;
}

/**
 * Generates and triggers download of a CSV file in the browser.
 * Headers are derived from the keys of the first row (or `headers` if provided).
 */
export function downloadCsv(
  filename: string,
  rows: CsvRow[],
  headers?: string[],
) {
  const cols = headers ?? (rows[0] ? Object.keys(rows[0]) : []);
  const head = cols.map(escapeCell).join(',');
  const body = rows.map((r) => cols.map((c) => escapeCell(r[c])).join(',')).join('\n');
  const csv = [head, body].filter(Boolean).join('\n');
  const blob = new Blob(['\uFEFF' + csv], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename.endsWith('.csv') ? filename : `${filename}.csv`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}
