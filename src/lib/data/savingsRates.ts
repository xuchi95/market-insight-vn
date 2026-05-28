// Lãi suất tiết kiệm tham khảo — cập nhật thủ công định kỳ.
// Nguồn: trang chính thức các ngân hàng (gửi tại quầy, cá nhân, VND, lĩnh cuối kỳ).
// Cập nhật: 2025-05.
export interface SavingsRate {
  bank: string;
  shortName: string;
  group: "SOCB" | "Joint-Stock" | "Foreign";
  rates: { // % / năm
    m1?: number;
    m3?: number;
    m6?: number;
    m9?: number;
    m12?: number;
    m13?: number;
    m18?: number;
    m24?: number;
    m36?: number;
  };
}

export const SAVINGS_UPDATED_AT = "2025-05-15";

export const SAVINGS_RATES: SavingsRate[] = [
  { bank: "Vietcombank",      shortName: "VCB",  group: "SOCB", rates: { m1: 1.6, m3: 1.9, m6: 2.9, m9: 2.9, m12: 4.6, m24: 4.6, m36: 4.6 } },
  { bank: "BIDV",             shortName: "BIDV", group: "SOCB", rates: { m1: 2.0, m3: 2.3, m6: 3.3, m9: 3.3, m12: 4.7, m24: 4.7, m36: 4.7 } },
  { bank: "VietinBank",       shortName: "CTG",  group: "SOCB", rates: { m1: 2.0, m3: 2.3, m6: 3.3, m9: 3.3, m12: 4.7, m24: 4.8, m36: 4.8 } },
  { bank: "Agribank",         shortName: "AGR",  group: "SOCB", rates: { m1: 1.6, m3: 1.9, m6: 3.0, m9: 3.0, m12: 4.7, m24: 4.8, m36: 4.8 } },
  { bank: "Techcombank",      shortName: "TCB",  group: "Joint-Stock", rates: { m1: 3.35, m3: 3.45, m6: 4.55, m9: 4.55, m12: 4.95, m24: 4.95 } },
  { bank: "MB Bank",          shortName: "MBB",  group: "Joint-Stock", rates: { m1: 3.5, m3: 3.8, m6: 4.7, m9: 4.7, m12: 5.5, m24: 6.0, m36: 6.1 } },
  { bank: "ACB",              shortName: "ACB",  group: "Joint-Stock", rates: { m1: 3.1, m3: 3.4, m6: 4.4, m9: 4.5, m12: 5.0, m24: 5.0 } },
  { bank: "VPBank",           shortName: "VPB",  group: "Joint-Stock", rates: { m1: 3.6, m3: 3.9, m6: 4.9, m9: 4.95, m12: 5.4, m24: 5.6, m36: 5.6 } },
  { bank: "Sacombank",        shortName: "STB",  group: "Joint-Stock", rates: { m1: 3.3, m3: 3.6, m6: 4.7, m9: 4.85, m12: 5.5, m24: 5.6, m36: 5.6 } },
  { bank: "TPBank",           shortName: "TPB",  group: "Joint-Stock", rates: { m1: 3.5, m3: 3.8, m6: 4.8, m9: 4.85, m12: 5.5, m24: 5.7 } },
  { bank: "HDBank",           shortName: "HDB",  group: "Joint-Stock", rates: { m1: 3.85, m3: 4.05, m6: 5.4, m9: 5.5, m12: 5.8, m13: 6.1, m18: 6.1, m24: 6.1 } },
  { bank: "SHB",              shortName: "SHB",  group: "Joint-Stock", rates: { m1: 3.5, m3: 3.8, m6: 5.1, m9: 5.2, m12: 5.6, m24: 6.1, m36: 6.3 } },
  { bank: "VIB",              shortName: "VIB",  group: "Joint-Stock", rates: { m1: 3.7, m3: 3.9, m6: 4.7, m9: 4.7, m12: 5.2, m24: 5.4, m36: 5.4 } },
  { bank: "Eximbank",         shortName: "EIB",  group: "Joint-Stock", rates: { m1: 3.7, m3: 3.9, m6: 5.1, m9: 5.2, m12: 5.5, m24: 6.0 } },
  { bank: "OCB",              shortName: "OCB",  group: "Joint-Stock", rates: { m1: 3.8, m3: 4.0, m6: 5.1, m9: 5.2, m12: 5.6, m24: 6.0, m36: 6.0 } },
  { bank: "SeABank",          shortName: "SSB",  group: "Joint-Stock", rates: { m1: 3.4, m3: 3.7, m6: 4.6, m9: 4.7, m12: 5.4, m24: 5.6, m36: 5.7 } },
  { bank: "MSB",              shortName: "MSB",  group: "Joint-Stock", rates: { m1: 3.8, m3: 4.0, m6: 5.2, m9: 5.3, m12: 5.6, m24: 6.1, m36: 6.1 } },
  { bank: "LPBank",           shortName: "LPB",  group: "Joint-Stock", rates: { m1: 3.7, m3: 3.9, m6: 5.1, m9: 5.2, m12: 5.7, m13: 5.8, m18: 6.0, m24: 6.0 } },
  { bank: "Nam A Bank",       shortName: "NAB",  group: "Joint-Stock", rates: { m1: 3.8, m3: 4.2, m6: 5.4, m9: 5.5, m12: 5.9, m24: 6.1, m36: 6.1 } },
  { bank: "Bac A Bank",       shortName: "BAB",  group: "Joint-Stock", rates: { m1: 3.85, m3: 4.05, m6: 5.5, m9: 5.6, m12: 5.95, m18: 6.1, m24: 6.1, m36: 6.1 } },
  { bank: "ABBank",           shortName: "ABB",  group: "Joint-Stock", rates: { m1: 3.2, m3: 3.7, m6: 5.4, m9: 5.5, m12: 5.7, m24: 5.7, m36: 5.7 } },
  { bank: "PVcomBank",        shortName: "PVC",  group: "Joint-Stock", rates: { m1: 3.45, m3: 3.65, m6: 4.7, m9: 4.7, m12: 5.6, m24: 5.6, m36: 5.6 } },
  { bank: "Saigonbank",       shortName: "SGB",  group: "Joint-Stock", rates: { m1: 3.5, m3: 3.8, m6: 5.0, m9: 5.4, m12: 5.7, m24: 5.8, m36: 5.9 } },
  { bank: "KienlongBank",     shortName: "KLB",  group: "Joint-Stock", rates: { m1: 3.85, m3: 3.95, m6: 5.2, m9: 5.4, m12: 5.7, m24: 5.95, m36: 6.0 } },
];

export const TENORS: { key: keyof SavingsRate["rates"]; label: string }[] = [
  { key: "m1",  label: "1 tháng" },
  { key: "m3",  label: "3 tháng" },
  { key: "m6",  label: "6 tháng" },
  { key: "m9",  label: "9 tháng" },
  { key: "m12", label: "12 tháng" },
  { key: "m18", label: "18 tháng" },
  { key: "m24", label: "24 tháng" },
  { key: "m36", label: "36 tháng" },
];