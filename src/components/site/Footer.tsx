import { Link } from "@tanstack/react-router";

export function Footer() {
  return (
    <footer className="mt-16 border-t border-border bg-card/30">
      <div className="mx-auto max-w-6xl px-5 py-12">
        <div className="grid gap-10 md:grid-cols-12">
          <div className="md:col-span-5">
            <div className="font-display text-3xl leading-none">
              <span className="text-[var(--gold)]">Market</span><span className="text-foreground">Watch</span>
            </div>
            <p className="mt-4 text-sm text-muted-foreground max-w-sm leading-relaxed">
              Nhật báo dữ liệu tài chính của Việt Nam — vàng, tiền số và ngoại tệ, cập nhật theo từng phút.
            </p>
            <div className="mt-6 eyebrow opacity-60">Phát hành tại Hà Nội · {new Date().getFullYear()}</div>
          </div>

          <div className="md:col-span-2">
            <h4 className="eyebrow mb-4">Mục</h4>
            <ul className="space-y-2.5 text-sm text-muted-foreground">
              <li><Link to="/gold" className="hover:text-foreground">Giá vàng</Link></li>
              <li><Link to="/stocks" className="hover:text-foreground">Chứng khoán</Link></li>
              <li><Link to="/crypto" className="hover:text-foreground">Crypto</Link></li>
              <li><Link to="/forex" className="hover:text-foreground">Ngoại tệ</Link></li>
              <li><Link to="/bank-rates" className="hover:text-foreground">Tỷ giá ngân hàng</Link></li>
            </ul>
          </div>
          <div className="md:col-span-2">
            <h4 className="eyebrow mb-4">Pháp lý</h4>
            <ul className="space-y-2.5 text-sm text-muted-foreground">
              <li><Link to="/terms" className="hover:text-foreground">Điều khoản sử dụng</Link></li>
              <li><Link to="/privacy" className="hover:text-foreground">Chính sách dữ liệu</Link></li>
              <li><Link to="/disclaimer" className="hover:text-foreground">Miễn trừ trách nhiệm</Link></li>
              <li><Link to="/contact" className="hover:text-foreground">Liên hệ</Link></li>
            </ul>
          </div>
          <div className="md:col-span-3">
            <h4 className="eyebrow mb-4">Liên hệ</h4>
            <a href="mailto:contact@marketwatch.vn" className="text-sm text-foreground border-b border-[var(--gold)]/40 hover:border-[var(--gold)]">contact@marketwatch.vn</a>
          </div>
        </div>

        <div className="mt-10 rounded-lg border border-border bg-card/60 p-4 text-xs text-muted-foreground leading-relaxed">
          <strong className="text-foreground">Lưu ý quan trọng:</strong> MarketWatch là kênh thông tin <em>tham khảo</em>. Dữ liệu giá vàng, tiền mã hoá và ngoại tệ được tổng hợp từ nguồn công khai của bên thứ ba, <strong>không phải báo giá chính thức</strong> và <strong>không cấu thành khuyến nghị đầu tư</strong>. Theo pháp luật Việt Nam, tiền ảo / tài sản mã hoá không phải phương tiện thanh toán hợp pháp; Website không tổ chức, môi giới hoặc cung cấp dịch vụ giao dịch. Xem chi tiết tại <Link to="/disclaimer" className="underline text-foreground">Tuyên bố miễn trừ trách nhiệm</Link>.
        </div>

        <div className="mt-12 pt-6 border-t border-border flex flex-col sm:flex-row gap-3 items-start sm:items-center justify-between">
          <div className="eyebrow opacity-50">© {new Date().getFullYear()} MarketWatch · Mọi quyền được bảo lưu</div>
          <div className="text-[10px] uppercase tracking-[0.22em] text-muted-foreground/70 sm:text-right">Dữ liệu tham khảo · Không phải khuyến nghị đầu tư</div>
        </div>
      </div>
    </footer>
  );
}