import type { NewsItem } from "./types";

const MOCK: NewsItem[] = [
  { id: "1", category: "gold", title: "Giá vàng SJC bật tăng mạnh, lập đỉnh mới trong tuần", source: "MarketWatch VN", publishedAt: Date.now() - 1000 * 60 * 18, url: "#", excerpt: "Vàng miếng SJC tăng 300.000 đồng/lượng theo đà phục hồi của giá vàng thế giới." },
  { id: "2", category: "crypto", title: "Bitcoin vượt mốc 97.000 USD, dòng tiền ETF tiếp tục đổ vào", source: "Crypto Daily", publishedAt: Date.now() - 1000 * 60 * 42, url: "#", excerpt: "BTC ghi nhận tuần tăng thứ ba liên tiếp khi nhà đầu tư tổ chức tăng phân bổ." },
  { id: "3", category: "forex", title: "Tỷ giá USD/VND ổn định quanh vùng 25.400", source: "Tài chính 24h", publishedAt: Date.now() - 1000 * 60 * 70, url: "#", excerpt: "Ngân hàng Nhà nước tiếp tục điều hành linh hoạt để giữ ổn định tỷ giá." },
  { id: "4", category: "economy", title: "GDP Việt Nam quý IV dự báo tăng trên 7%", source: "VnEconomy", publishedAt: Date.now() - 1000 * 60 * 120, url: "#", excerpt: "Tăng trưởng được hỗ trợ bởi xuất khẩu và đầu tư công." },
  { id: "5", category: "crypto", title: "Ethereum hoàn tất nâng cấp Pectra, phí gas giảm 18%", source: "Crypto Daily", publishedAt: Date.now() - 1000 * 60 * 180, url: "#", excerpt: "Nâng cấp giúp tăng hiệu suất Layer-2 và mở rộng khả năng staking." },
  { id: "6", category: "gold", title: "Vàng nhẫn 9999 thu hẹp khoảng cách với vàng miếng SJC", source: "PNJ News", publishedAt: Date.now() - 1000 * 60 * 240, url: "#", excerpt: "Nhu cầu mua vàng nhẫn tăng mạnh vào dịp cuối năm." },
];

export async function fetchNews(): Promise<NewsItem[]> {
  return MOCK;
}