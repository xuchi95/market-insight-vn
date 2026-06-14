/**
 * Tiny CSV helper — escapes fields per RFC 4180 and triggers a browser download.
 * Adds a UTF-8 BOM so Excel detects the encoding correctly with Vietnamese text.
 */

export type CsvRow = Record<string, string | number | null | undefined>;

function escape(v: unknown): string {
  if (v === null || v === undefined) return "";
  const s = String(v);
  if (/[",\n\r]/.test(s)) return `"${s.replace(/"/g, '""')}"`;
  return s;
}

export function toCSV<T extends CsvRow>(rows: T[], headers: { key: keyof T; label: string }[]): string {
  const head = headers.map((h) => escape(h.label)).join(",");
  const body = rows
    .map((r) => headers.map((h) => escape(r[h.key])).join(","))
    .join("\n");
  return `${head}\n${body}`;
}

export function downloadCSV(filename: string, content: string): void {
  if (typeof window === "undefined") return;
  const blob = new Blob(["\uFEFF" + content], { type: "text/csv;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

export function csvDateStamp(d: Date = new Date()): string {
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}${pad(d.getMonth() + 1)}${pad(d.getDate())}`;
}