import { Link } from "@tanstack/react-router";
import logoUrl from "@/assets/logo.png";

export function Footer() {
  return (
    <footer className="mt-16 border-t border-border bg-card/30">
      <div className="mx-auto max-w-6xl px-5 py-12">
        <div className="grid gap-10 md:grid-cols-12">
          <div className="md:col-span-5">
            <div className="flex items-center gap-3">
              <img src={logoUrl} alt="MarketWatch logo" className="h-10 w-10 object-contain" />
              <div className="font-display text-3xl leading-none">
                <span className="text-[var(--gold)]">Market</span><span className="text-foreground">Watch</span>
              </div>
            </div>
            <p className="mt-4 text-base text-muted-foreground max-w-sm leading-relaxed">
              Nhật báo dữ liệu tài chính của Việt Nam — vàng, tiền số và ngoại tệ, cập nhật theo từng phút.
            </p>
            <div className="mt-6 eyebrow opacity-60">Phát hành tại Hà Nội · {new Date().getFullYear()}</div>
          </div>

          <div className="md:col-span-2">
            <h4 className="eyebrow mb-4">Mục</h4>
            <ul className="space-y-2.5 text-base text-muted-foreground">
              <li><Link to="/gia-vang" className="hover:text-foreground">Giá vàng</Link></li>
              <li><Link to="/chung-khoan" className="hover:text-foreground">Chứng khoán</Link></li>
              <li><Link to="/tien-dien-tu" className="hover:text-foreground">Crypto</Link></li>
              <li><Link to="/ty-gia-ngoai-te" className="hover:text-foreground">Ngoại tệ</Link></li>
              <li><Link to="/ty-gia-ngan-hang" className="hover:text-foreground">Tỷ giá ngân hàng</Link></li>
              <li><Link to="/quy-doi-tien-te" className="hover:text-foreground">Đổi ngoại tệ</Link></li>
            </ul>
          </div>
          <div className="md:col-span-2">
            <h4 className="eyebrow mb-4">Pháp lý</h4>
            <ul className="space-y-2.5 text-base text-muted-foreground">
              <li><Link to="/dieu-khoan-su-dung" className="hover:text-foreground">Điều khoản sử dụng</Link></li>
              <li><Link to="/chinh-sach-bao-mat" className="hover:text-foreground">Chính sách dữ liệu</Link></li>
              <li><Link to="/chinh-sach-cookie" className="hover:text-foreground">Chính sách Cookie</Link></li>
              <li>
                <button
                  type="button"
                  onClick={() => typeof window !== "undefined" && window.dispatchEvent(new CustomEvent("mw:open-cookie-settings"))}
                  className="hover:text-foreground text-left"
                >
                  Quản lý Cookie
                </button>
              </li>
              <li><Link to="/mien-tru-trach-nhiem" className="hover:text-foreground">Miễn trừ trách nhiệm</Link></li>
              <li><Link to="/lien-he" className="hover:text-foreground">Liên hệ</Link></li>
            </ul>
          </div>
        </div>

        <div className="mt-10 rounded-lg border-l-4 border border-[var(--gold)]/60 border-l-[var(--gold)] bg-[color-mix(in_oklab,var(--gold)_12%,var(--background))] p-4 text-sm text-foreground/90 leading-relaxed shadow-[0_0_0_1px_color-mix(in_oklab,var(--gold)_20%,transparent)]">
          <strong className="text-[var(--gold)] uppercase tracking-wider text-sm">⚠ Lưu ý quan trọng:</strong>{" "}
          MarketWatch là kênh thông tin <em>tham khảo</em>. Dữ liệu giá vàng, tiền mã hoá và ngoại tệ được tổng hợp từ nguồn công khai của bên thứ ba, <strong className="text-foreground">không phải báo giá chính thức</strong> và <strong className="text-foreground">không cấu thành khuyến nghị đầu tư</strong>. Theo pháp luật Việt Nam, tiền ảo / tài sản mã hoá không phải phương tiện thanh toán hợp pháp; Website không tổ chức, môi giới hoặc cung cấp dịch vụ giao dịch. Xem chi tiết tại <Link to="/mien-tru-trach-nhiem" className="underline font-medium text-[var(--gold)] hover:opacity-80">Tuyên bố miễn trừ trách nhiệm</Link>.
        </div>

        <div className="mt-12 pt-6 border-t border-border flex flex-col sm:flex-row gap-3 items-start sm:items-center justify-between">
          <div className="eyebrow opacity-50">© {new Date().getFullYear()} MarketWatch · Mọi quyền được bảo lưu</div>
          <div className="text-xs uppercase tracking-[0.18em] text-muted-foreground/70 sm:text-right">Dữ liệu tham khảo · Không phải khuyến nghị đầu tư</div>
        </div>
      </div>
    </footer>
  );
}