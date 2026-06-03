export function CompanyInfoCard({ title = "Đơn vị chịu trách nhiệm" }: { title?: string }) {
  return (
    <div className="not-prose rounded-lg border border-border bg-card/40 p-4 my-4">
      <h3 className="text-sm font-semibold text-foreground mb-3 uppercase tracking-wider">{title}</h3>
      <dl className="grid gap-y-1.5 gap-x-4 sm:grid-cols-[max-content_1fr] text-sm text-muted-foreground">
        <dt className="text-foreground/80 font-medium">Công ty chủ quản</dt>
        <dd>Công ty TNHH MTV Xuân Diệu Media</dd>
        <dt className="text-foreground/80 font-medium">Địa chỉ trụ sở</dt>
        <dd>90/12 Hà Huy Tập, phường Thanh Khê, thành phố Đà Nẵng</dd>
        <dt className="text-foreground/80 font-medium">Giấy ĐKKD</dt>
        <dd>Số 0402222404 cấp tại Đà Nẵng</dd>
        <dt className="text-foreground/80 font-medium">Người đại diện theo pháp luật</dt>
        <dd>Ông Nguyễn Xuân Chính</dd>
        <dt className="text-foreground/80 font-medium">Người chịu trách nhiệm nội dung</dt>
        <dd>Ông Nguyễn Xuân Chính</dd>
        <dt className="text-foreground/80 font-medium">Số điện thoại</dt>
        <dd><a href="tel:0382663891" className="hover:text-[var(--gold)]">0382 663 891</a></dd>
      </dl>
    </div>
  );
}