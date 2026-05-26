import { Coins } from "lucide-react";

export function Footer() {
  return (
    <footer className="border-t border-border bg-card/40 mt-12">
      <div className="container mx-auto px-4 py-10 grid gap-8 md:grid-cols-4">
        <div>
          <div className="flex items-center gap-2 mb-3">
            <div className="grid h-8 w-8 place-items-center rounded-lg bg-gold-gradient text-gold-foreground">
              <Coins className="h-4 w-4" />
            </div>
            <div className="font-bold">Market<span className="text-gold">Watch</span></div>
          </div>
          <p className="text-sm text-muted-foreground">Dashboard tài chính realtime cho thị trường vàng, crypto và ngoại tệ tại Việt Nam.</p>
        </div>
        <div>
          <h4 className="font-semibold mb-3 text-sm">Sản phẩm</h4>
          <ul className="space-y-2 text-sm text-muted-foreground">
            <li><a href="#gold" className="hover:text-foreground">Giá vàng</a></li>
            <li><a href="#crypto" className="hover:text-foreground">Crypto</a></li>
            <li><a href="#forex" className="hover:text-foreground">Ngoại tệ</a></li>
            <li><a href="#converter" className="hover:text-foreground">Công cụ chuyển đổi</a></li>
          </ul>
        </div>
        <div>
          <h4 className="font-semibold mb-3 text-sm">Pháp lý</h4>
          <ul className="space-y-2 text-sm text-muted-foreground">
            <li><a href="#" className="hover:text-foreground">Điều khoản sử dụng</a></li>
            <li><a href="#" className="hover:text-foreground">Chính sách dữ liệu</a></li>
            <li><a href="#" className="hover:text-foreground">Liên hệ</a></li>
          </ul>
        </div>
        <div>
          <h4 className="font-semibold mb-3 text-sm">Liên hệ</h4>
          <p className="text-sm text-muted-foreground">contact@marketwatch.vn</p>
        </div>
      </div>
      <div className="border-t border-border">
        <div className="container mx-auto px-4 py-4 flex flex-col sm:flex-row gap-2 items-center justify-between text-xs text-muted-foreground">
          <div>© {new Date().getFullYear()} MarketWatch. Mọi quyền được bảo lưu.</div>
          <div className="text-center sm:text-right">Dữ liệu chỉ mang tính tham khảo, không phải khuyến nghị đầu tư.</div>
        </div>
      </div>
    </footer>
  );
}