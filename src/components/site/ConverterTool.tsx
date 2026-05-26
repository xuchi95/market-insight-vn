import { useMemo, useState } from "react";
import { ArrowRightLeft, Wrench } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { SectionCard } from "./SectionCard";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { fetchCryptoPrices } from "@/lib/services/cryptoPriceService";
import { fetchForexRates } from "@/lib/services/forexRateService";
import { fetchGoldPrices } from "@/lib/services/goldPriceService";
import { fmtVND } from "@/lib/format";

type AssetKind = "crypto" | "forex" | "gold";
interface AssetOpt { key: string; label: string; kind: AssetKind; rateVnd: number; }

export function ConverterTool() {
  const crypto = useQuery({ queryKey: ["crypto"], queryFn: () => fetchCryptoPrices(), refetchInterval: 15000 });
  const forex = useQuery({ queryKey: ["forex"], queryFn: fetchForexRates, refetchInterval: 10 * 60 * 1000 });
  const gold = useQuery({ queryKey: ["gold"], queryFn: fetchGoldPrices, refetchInterval: 5000 });

  const assets: AssetOpt[] = useMemo(() => {
    const out: AssetOpt[] = [];
    forex.data?.forEach((f) => out.push({ key: `f:${f.code}`, label: `${f.code} — ${f.name}`, kind: "forex", rateVnd: f.mid }));
    crypto.data?.forEach((c) => out.push({ key: `c:${c.id}`, label: `${c.symbol} — ${c.name}`, kind: "crypto", rateVnd: c.priceVnd }));
    gold.data?.forEach((g) => {
      if (g.unit.includes("USD")) return;
      out.push({ key: `g:${g.id}`, label: `Vàng ${g.brand} (chỉ)`, kind: "gold", rateVnd: (g.buy + g.sell) / 2 });
    });
    return out;
  }, [crypto.data, forex.data, gold.data]);

  const [from, setFrom] = useState("f:USD");
  const [amount, setAmount] = useState("100");

  const result = useMemo(() => {
    const a = assets.find((x) => x.key === from);
    const n = parseFloat(amount.replace(/,/g, "")) || 0;
    if (!a) return null;
    return { vnd: a.rateVnd * n, asset: a };
  }, [assets, from, amount]);

  return (
    <SectionCard
      id="converter"
      icon={<Wrench className="h-4 w-4" />}
      title="Công cụ chuyển đổi"
      description="Quy đổi vàng, ngoại tệ, crypto sang VND theo giá realtime"
    >
      <div className="p-4 lg:p-6 grid gap-4 md:grid-cols-[1fr_auto_1fr] items-end">
        <div className="space-y-2">
          <label className="text-xs text-muted-foreground font-medium uppercase">Bạn có</label>
          <div className="flex gap-2">
            <Input value={amount} onChange={(e) => setAmount(e.target.value)} type="text" inputMode="decimal" className="text-lg tabular font-semibold h-12" />
            <Select value={from} onValueChange={setFrom}>
              <SelectTrigger className="h-12 w-[200px]"><SelectValue /></SelectTrigger>
              <SelectContent className="max-h-72">
                {assets.length === 0 && <SelectItem value="loading" disabled>Đang tải...</SelectItem>}
                {assets.map((a) => <SelectItem key={a.key} value={a.key}>{a.label}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
        </div>
        <div className="grid h-12 w-12 place-items-center rounded-full bg-gold-gradient text-gold-foreground mx-auto"><ArrowRightLeft className="h-5 w-5" /></div>
        <div className="space-y-2">
          <label className="text-xs text-muted-foreground font-medium uppercase">Tương đương</label>
          <div className="h-12 px-4 flex items-center rounded-md border border-input bg-muted/40 text-lg tabular font-bold text-gold">
            {result ? fmtVND(result.vnd) : "—"}
          </div>
        </div>
      </div>
      <div className="px-4 lg:px-6 pb-4 text-xs text-muted-foreground">
        Tỷ giá cập nhật mỗi 5–15s. Kết quả chỉ mang tính tham khảo, không bao gồm phí giao dịch.
      </div>
    </SectionCard>
  );
}