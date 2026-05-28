// Parses the Techcombank "Lãi suất tiết kiệm của 30+ ngân hàng hôm nay" blog
// markdown table into structured rates.

export type Tenor = "m1" | "m3" | "m6" | "m9" | "m12" | "m13" | "m18" | "m24" | "m36";

export interface ParsedRate {
  bank: string;
  shortName: string;
  group: "SOCB" | "Joint-Stock" | "Foreign";
  rates: Partial<Record<Tenor, number>>;
}

// Header columns we expect in the TCB blog (order may vary).
const HEADER_MAP: Record<string, Tenor> = {
  "1 tháng": "m1",
  "3 tháng": "m3",
  "6 tháng": "m6",
  "9 tháng": "m9",
  "12 tháng": "m12",
  "13 tháng": "m13",
  "18 tháng": "m18",
  "24 tháng": "m24",
  "36 tháng": "m36",
};

const BANK_META: Record<string, { name: string; short: string; group: ParsedRate["group"] }> = {
  vietcombank: { name: "Vietcombank", short: "VCB", group: "SOCB" },
  vietinbank: { name: "VietinBank", short: "CTG", group: "SOCB" },
  agribank: { name: "Agribank", short: "AGR", group: "SOCB" },
  bidv: { name: "BIDV", short: "BIDV", group: "SOCB" },
  techcombank: { name: "Techcombank", short: "TCB", group: "Joint-Stock" },
  mbbank: { name: "MB Bank", short: "MBB", group: "Joint-Stock" },
  "mb bank": { name: "MB Bank", short: "MBB", group: "Joint-Stock" },
  acb: { name: "ACB", short: "ACB", group: "Joint-Stock" },
  vpbank: { name: "VPBank", short: "VPB", group: "Joint-Stock" },
  tpbank: { name: "TPBank", short: "TPB", group: "Joint-Stock" },
  hdbank: { name: "HDBank", short: "HDB", group: "Joint-Stock" },
  shb: { name: "SHB", short: "SHB", group: "Joint-Stock" },
  vib: { name: "VIB", short: "VIB", group: "Joint-Stock" },
  eximbank: { name: "Eximbank", short: "EIB", group: "Joint-Stock" },
  ocb: { name: "OCB", short: "OCB", group: "Joint-Stock" },
  seabank: { name: "SeABank", short: "SSB", group: "Joint-Stock" },
  msb: { name: "MSB", short: "MSB", group: "Joint-Stock" },
  lpbank: { name: "LPBank", short: "LPB", group: "Joint-Stock" },
  namabank: { name: "Nam A Bank", short: "NAB", group: "Joint-Stock" },
  "nam a bank": { name: "Nam A Bank", short: "NAB", group: "Joint-Stock" },
  bacabank: { name: "Bac A Bank", short: "BAB", group: "Joint-Stock" },
  "bac a bank": { name: "Bac A Bank", short: "BAB", group: "Joint-Stock" },
  abbank: { name: "ABBank", short: "ABB", group: "Joint-Stock" },
  pvcombank: { name: "PVcomBank", short: "PVC", group: "Joint-Stock" },
  saigonbank: { name: "Saigonbank", short: "SGB", group: "Joint-Stock" },
  kienlongbank: { name: "KienlongBank", short: "KLB", group: "Joint-Stock" },
  sacombank: { name: "Sacombank", short: "STB", group: "Joint-Stock" },
  scb: { name: "SCB", short: "SCB", group: "Joint-Stock" },
  vietbank: { name: "VietBank", short: "VBB", group: "Joint-Stock" },
  vietabank: { name: "VietABank", short: "VAB", group: "Joint-Stock" },
  "viet capital bank": { name: "Viet Capital Bank", short: "BVB", group: "Joint-Stock" },
  vikkibank: { name: "Vikki Bank", short: "VKB", group: "Joint-Stock" },
  "vikki bank": { name: "Vikki Bank", short: "VKB", group: "Joint-Stock" },
  "baoviet bank": { name: "BAOVIET Bank", short: "BVB2", group: "Joint-Stock" },
  baovietbank: { name: "BAOVIET Bank", short: "BVB2", group: "Joint-Stock" },
  "pg bank": { name: "PG Bank", short: "PGB", group: "Joint-Stock" },
  pgbank: { name: "PG Bank", short: "PGB", group: "Joint-Stock" },
  ncb: { name: "NCB", short: "NCB", group: "Joint-Stock" },
  cbbank: { name: "CBBank", short: "CBB", group: "Joint-Stock" },
  oceanbank: { name: "OceanBank", short: "OCN", group: "Joint-Stock" },
  gpbank: { name: "GPBank", short: "GPB", group: "Joint-Stock" },
};

function normalizeBankKey(s: string): string {
  return s
    .toLowerCase()
    .replace(/\*\*/g, "")
    .replace(/\s+/g, " ")
    .trim();
}

function stripCell(s: string): string {
  // Remove markdown links, bold markers, "Tham khảo:" footnotes etc.
  return s
    .replace(/\[([^\]]*)\]\([^)]*\)/g, "$1")
    .replace(/<br\s*\/?>/gi, " ")
    .replace(/\*\*/g, "")
    .replace(/_/g, "")
    .replace(/Tham khảo:.*/i, "")
    .replace(/Biểu phí.*/i, "")
    .trim();
}

function parseNumber(cell: string): number | undefined {
  const cleaned = stripCell(cell);
  const m = cleaned.match(/(\d{1,2})[.,](\d{1,3})/);
  if (!m) {
    const intMatch = cleaned.match(/^\s*(\d{1,2})\s*$/);
    if (intMatch) return parseInt(intMatch[1], 10);
    return undefined;
  }
  const n = parseFloat(`${m[1]}.${m[2]}`);
  if (!Number.isFinite(n) || n < 0 || n > 15) return undefined;
  return n;
}

/**
 * Parse the TCB blog markdown.
 * Expects a markdown table with header "Ngân hàng | 1 tháng | 3 tháng | ..."
 */
export function parseTcbBlogMarkdown(md: string): { items: ParsedRate[]; sourceDate?: string } {
  // Try to grab the source date from the title "hôm nay DD/MM/YYYY"
  const dateMatch = md.match(/h[ôo]m nay\s+(\d{1,2}\/\d{1,2}\/\d{4})/i);
  const sourceDate = dateMatch?.[1];

  // Split into lines, find table rows
  const lines = md.split(/\r?\n/);
  let headerIdx = -1;
  let headerCells: string[] = [];
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i].trim();
    if (!line.startsWith("|")) continue;
    const cells = line.split("|").map((c) => stripCell(c).toLowerCase());
    if (cells.some((c) => c.includes("ngân hàng")) && cells.some((c) => /\d+\s*tháng/.test(c))) {
      headerIdx = i;
      headerCells = cells;
      break;
    }
  }
  if (headerIdx === -1) return { items: [], sourceDate };

  // Build column index -> tenor map
  const colToTenor: Record<number, Tenor> = {};
  headerCells.forEach((cell, idx) => {
    for (const [label, tenor] of Object.entries(HEADER_MAP)) {
      if (cell.includes(label)) {
        colToTenor[idx] = tenor;
        break;
      }
    }
  });

  const items: ParsedRate[] = [];
  const seen = new Set<string>();

  for (let i = headerIdx + 1; i < lines.length; i++) {
    const line = lines[i].trim();
    if (!line.startsWith("|")) {
      if (items.length > 0) break;
      continue;
    }
    const cells = line.split("|");
    // Markdown table row separator like |---|---|
    if (cells.every((c) => /^[\s:-]*$/.test(c))) continue;

    const bankCellRaw = cells[1] ?? "";
    const bankKey = normalizeBankKey(bankCellRaw);
    if (!bankKey) continue;

    const meta = BANK_META[bankKey] ?? BANK_META[bankKey.replace(/\s+/g, "")];
    if (!meta) continue;
    if (seen.has(meta.short)) continue;

    const rates: Partial<Record<Tenor, number>> = {};
    for (const [colStr, tenor] of Object.entries(colToTenor)) {
      const col = parseInt(colStr, 10);
      const raw = cells[col];
      if (raw == null) continue;
      const v = parseNumber(raw);
      if (v !== undefined) rates[tenor] = v;
    }

    if (Object.keys(rates).length === 0) continue;

    items.push({ bank: meta.name, shortName: meta.short, group: meta.group, rates });
    seen.add(meta.short);
  }

  return { items, sourceDate };
}