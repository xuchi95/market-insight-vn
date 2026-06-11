/**
 * Vietnamese finance glossary used by /tu-dien.
 * Each term has a slug (URL), short definition, longer body, examples, and
 * related slugs + related routes for internal linking (good for SEO).
 */

export interface GlossaryTerm {
  slug: string;
  term: string;
  short: string;
  body: string;
  category: "crypto" | "vang" | "ngoai-te" | "chung-khoan" | "vi-mo" | "dau-tu";
  examples?: string[];
  related?: string[]; // slugs
  links?: { label: string; to: string }[]; // internal cross-links
  keywords?: string[];
}

export const GLOSSARY: GlossaryTerm[] = [
  {
    slug: "dca",
    term: "DCA (Dollar-Cost Averaging)",
    category: "dau-tu",
    short:
      "Chiến lược đầu tư đều đặn một số tiền cố định theo chu kỳ (tuần / tháng), bất kể giá thị trường tăng hay giảm.",
    body:
      "DCA giúp giảm rủi ro mua đỉnh bằng cách trải đều điểm vào lệnh theo thời gian. Khi giá giảm, cùng số tiền sẽ mua được nhiều đơn vị hơn; khi giá tăng, mua được ít hơn. Trung bình giá vốn vì thế thường thấp hơn so với một lệnh mua duy nhất tại đỉnh chu kỳ.",
    examples: [
      "Mỗi tháng mua 2 triệu BTC vào ngày 1, duy trì trong 24 tháng.",
      "Mỗi tuần mua 500 nghìn vàng SJC bất kể giá đang lên hay xuống.",
    ],
    related: ["roi", "lai-kep", "bear-market"],
    links: [
      { label: "Máy tính DCA & ROI", to: "/cong-cu/dca-roi" },
      { label: "DCA với giá lịch sử thật", to: "/cong-cu/dca-lich-su" },
    ],
    keywords: ["dca là gì", "dollar cost averaging", "đầu tư định kỳ"],
  },
  {
    slug: "roi",
    term: "ROI (Return on Investment)",
    category: "dau-tu",
    short: "Tỷ suất lợi nhuận trên vốn đầu tư, đo bằng phần trăm.",
    body:
      "ROI = (Lợi nhuận ròng / Tổng vốn đầu tư) × 100%. Đây là chỉ số nhanh để so sánh hiệu quả giữa các khoản đầu tư khác nhau. Để so sánh các khoản nắm giữ khác thời gian, nên quy về ROI/năm (annualized).",
    examples: [
      "Mua BTC 50 triệu, bán 75 triệu sau 1 năm → ROI = 50%.",
      "Gửi tiết kiệm 100 triệu, lãi 6 triệu/năm → ROI = 6%.",
    ],
    related: ["dca", "lai-kep", "apy"],
    links: [{ label: "Máy tính ROI", to: "/cong-cu/dca-roi" }],
    keywords: ["roi là gì", "tỷ suất lợi nhuận"],
  },
  {
    slug: "lai-kep",
    term: "Lãi kép (Compound Interest)",
    category: "dau-tu",
    short:
      "Lãi được tính trên cả vốn gốc lẫn lãi đã tích lũy từ các kỳ trước.",
    body:
      "Công thức: A = P × (1 + r/n)^(n·t). Lãi kép là 'kỳ quan thứ 8 của thế giới' (Einstein) — sự khác biệt giữa lãi đơn và lãi kép trở nên rất lớn khi thời gian dài.",
    examples: [
      "100 triệu, lãi 6%/năm, ghép lãi hàng tháng, sau 10 năm ≈ 181.9 triệu.",
    ],
    related: ["apy", "apr", "roi"],
    links: [
      { label: "Tính lãi tiết kiệm", to: "/tinh-lai-suat-tiet-kiem" },
      { label: "Lãi suất ngân hàng", to: "/lai-suat-tiet-kiem" },
    ],
    keywords: ["lãi kép", "compound interest"],
  },
  {
    slug: "apy",
    term: "APY (Annual Percentage Yield)",
    category: "dau-tu",
    short: "Lãi suất hằng năm đã bao gồm hiệu ứng ghép lãi.",
    body:
      "APY phản ánh thực tế bạn nhận được bao nhiêu sau 1 năm, trong khi APR chỉ là lãi suất danh nghĩa chưa cộng dồn. APY luôn ≥ APR khi tần suất ghép lãi > 1 lần/năm.",
    related: ["apr", "lai-kep"],
    keywords: ["apy là gì", "annual percentage yield"],
  },
  {
    slug: "apr",
    term: "APR (Annual Percentage Rate)",
    category: "dau-tu",
    short: "Lãi suất danh nghĩa hằng năm, chưa tính ghép lãi.",
    body:
      "APR thường dùng cho khoản vay (mortgage, thẻ tín dụng). Khi so sánh sản phẩm tiết kiệm, hãy quy về APY để chính xác.",
    related: ["apy", "lai-kep"],
    keywords: ["apr là gì", "annual percentage rate"],
  },
  {
    slug: "bull-market",
    term: "Bull market (Thị trường tăng giá)",
    category: "dau-tu",
    short: "Xu hướng tăng kéo dài, tâm lý nhà đầu tư lạc quan.",
    body:
      "Một bull market thường được xác định khi chỉ số tăng ≥ 20% từ đáy gần nhất. Trong crypto, các chu kỳ bull thường đi kèm sự kiện halving của Bitcoin.",
    related: ["bear-market", "halving"],
    keywords: ["bull market", "thị trường tăng giá"],
  },
  {
    slug: "bear-market",
    term: "Bear market (Thị trường giảm giá)",
    category: "dau-tu",
    short: "Xu hướng giảm kéo dài (≥ 20% từ đỉnh), tâm lý bi quan.",
    body:
      "Trong bear market, DCA thường phát huy hiệu quả vì giúp tích luỹ ở vùng giá thấp. Tuy nhiên rủi ro vẫn cao vì không ai biết đáy ở đâu.",
    related: ["bull-market", "dca"],
    keywords: ["bear market", "thị trường gấu"],
  },
  {
    slug: "halving",
    term: "Halving (Bitcoin)",
    category: "crypto",
    short:
      "Sự kiện 4 năm/lần khi phần thưởng khối Bitcoin giảm một nửa, giảm tốc độ phát hành BTC mới.",
    body:
      "Halving xảy ra sau mỗi 210.000 block (~4 năm). Sau halving 2024, phần thưởng khối còn 3.125 BTC. Theo lý thuyết cung-cầu, khi cung mới giảm trong khi cầu giữ nguyên, giá có xu hướng tăng — đây là động lực của các chu kỳ bull truyền thống.",
    related: ["bull-market", "btc-dominance"],
    links: [{ label: "Giá Bitcoin hôm nay", to: "/tai-san/btc" }],
    keywords: ["bitcoin halving", "halving là gì"],
  },
  {
    slug: "btc-dominance",
    term: "BTC Dominance",
    category: "crypto",
    short: "Tỷ trọng vốn hóa của Bitcoin trên tổng vốn hoá toàn thị trường crypto.",
    body:
      "BTC.D càng cao → dòng tiền tập trung vào Bitcoin; BTC.D giảm thường báo hiệu altcoin season — vốn chảy sang altcoin và chúng tăng mạnh hơn BTC.",
    related: ["altcoin", "halving"],
    keywords: ["btc dominance", "bitcoin dominance"],
  },
  {
    slug: "altcoin",
    term: "Altcoin",
    category: "crypto",
    short: "Tất cả các đồng tiền điện tử khác ngoài Bitcoin.",
    body:
      "ETH, SOL, BNB, XRP... đều là altcoin. Altcoin thường biến động mạnh hơn BTC: tăng nhanh hơn khi bull, nhưng cũng giảm sâu hơn khi bear.",
    related: ["btc-dominance", "stablecoin"],
    links: [{ label: "Bảng giá Crypto", to: "/tien-dien-tu" }],
    keywords: ["altcoin là gì"],
  },
  {
    slug: "stablecoin",
    term: "Stablecoin",
    category: "crypto",
    short: "Tiền điện tử neo giá theo tài sản ổn định, thường là USD.",
    body:
      "USDT, USDC, DAI là 3 stablecoin lớn nhất. Có 3 loại chính: (1) bảo chứng bằng tiền pháp định, (2) bảo chứng bằng crypto, (3) thuật toán. Stablecoin thường được dùng để giữ giá trị khi chốt lời hoặc tránh biến động mạnh.",
    related: ["altcoin", "ty-gia"],
    keywords: ["stablecoin là gì", "usdt usdc"],
  },
  {
    slug: "market-cap",
    term: "Market Cap (Vốn hoá thị trường)",
    category: "crypto",
    short: "Giá × tổng cung lưu hành. Đo độ lớn của một tài sản trên thị trường.",
    body:
      "Market cap dùng để xếp hạng coin (ví dụ BTC #1, ETH #2). Không phải số tiền 'đã đổ vào' tài sản — đó là khái niệm 'realized cap'.",
    related: ["altcoin", "volume-24h"],
    keywords: ["market cap", "vốn hoá thị trường"],
  },
  {
    slug: "volume-24h",
    term: "Volume 24h",
    category: "crypto",
    short: "Tổng khối lượng giao dịch của một tài sản trong 24 giờ qua.",
    body:
      "Volume cao đi kèm biến động giá xác nhận xu hướng. Volume thấp khi giá tăng → tín hiệu yếu, dễ đảo chiều.",
    related: ["market-cap"],
    keywords: ["volume 24h", "khối lượng giao dịch"],
  },
  {
    slug: "sjc",
    term: "Vàng SJC",
    category: "vang",
    short:
      "Vàng miếng SJC do Công ty Vàng bạc Đá quý Sài Gòn sản xuất, độ tinh khiết 99,99%.",
    body:
      "SJC là thương hiệu vàng miếng được Ngân hàng Nhà nước Việt Nam độc quyền sản xuất từ 2012-2024. Giá vàng SJC thường cao hơn giá vàng thế giới quy đổi do chính sách quản lý đặc thù.",
    examples: ["1 lượng = 10 chỉ = 37,5g."],
    related: ["pnj", "doji", "xau-oz"],
    links: [{ label: "Giá vàng hôm nay", to: "/gia-vang" }],
    keywords: ["vàng sjc", "sjc là gì", "vàng miếng"],
  },
  {
    slug: "pnj",
    term: "Vàng PNJ",
    category: "vang",
    short: "Thương hiệu vàng của Công ty Vàng bạc Đá quý Phú Nhuận.",
    body:
      "PNJ tập trung vào vàng trang sức 9999 (24K) và vàng nhẫn tròn trơn. Giá thường thấp hơn SJC nhưng cao hơn vàng nguyên liệu thế giới.",
    related: ["sjc", "doji"],
    links: [{ label: "Giá vàng PNJ", to: "/gia-vang" }],
    keywords: ["vàng pnj", "vàng nhẫn"],
  },
  {
    slug: "doji",
    term: "Vàng DOJI",
    category: "vang",
    short: "Thương hiệu vàng của Tập đoàn Vàng bạc Đá quý DOJI.",
    body:
      "DOJI cung cấp cả vàng miếng và nhẫn ép vỉ Hưng Thịnh Vượng 9999. Là một trong 3 thương hiệu vàng lớn nhất Việt Nam.",
    related: ["sjc", "pnj"],
    keywords: ["vàng doji", "doji là gì"],
  },
  {
    slug: "xau-oz",
    term: "XAU/USD (Vàng thế giới)",
    category: "vang",
    short: "Giá vàng giao ngay tính bằng USD trên 1 ounce (oz).",
    body:
      "1 oz vàng = 31,1035g. Để quy đổi sang giá VND/lượng: giá_oz × 1,20565 (g/lượng / g/oz) × tỷ_giá_USD/VND + thuế phí. Chênh lệch SJC vs XAU thế giới phản ánh cung-cầu nội địa.",
    related: ["sjc", "usd"],
    keywords: ["xau usd", "vàng thế giới", "ounce vàng"],
  },
  {
    slug: "ty-gia",
    term: "Tỷ giá (Exchange Rate)",
    category: "ngoai-te",
    short: "Giá quy đổi giữa hai đồng tiền, ví dụ USD/VND = 25.300.",
    body:
      "Tỷ giá ngân hàng thường có 3 cột: mua tiền mặt, mua chuyển khoản, bán. Spread (chênh lệch mua-bán) phản ánh chi phí giao dịch và rủi ro của ngân hàng.",
    related: ["usd", "ngan-hang-trung-uong"],
    links: [
      { label: "Tỷ giá ngoại tệ", to: "/ty-gia-ngoai-te" },
      { label: "Tỷ giá ngân hàng", to: "/ty-gia-ngan-hang" },
    ],
    keywords: ["tỷ giá là gì", "exchange rate"],
  },
  {
    slug: "usd",
    term: "USD (Đô la Mỹ)",
    category: "ngoai-te",
    short: "Đồng tiền dự trữ toàn cầu, neo cho phần lớn hàng hoá quốc tế.",
    body:
      "USD chiếm ~58% dự trữ ngoại hối toàn cầu (2024). Khi USD mạnh, giá hàng hoá (vàng, dầu) tính bằng USD có xu hướng giảm — gọi là 'USD inverse correlation'.",
    related: ["dxy", "ty-gia"],
    links: [{ label: "Tỷ giá USD/VND", to: "/ty-gia-ngoai-te" }],
    keywords: ["usd vnd", "đô la mỹ"],
  },
  {
    slug: "dxy",
    term: "DXY (US Dollar Index)",
    category: "ngoai-te",
    short: "Chỉ số đo sức mạnh USD so với rổ 6 đồng tiền lớn (EUR, JPY, GBP, CAD, SEK, CHF).",
    body:
      "DXY tăng → USD mạnh → áp lực giảm lên vàng, dầu, crypto. DXY giảm → USD yếu → tài sản rủi ro thường tăng. Là chỉ báo vĩ mô quan trọng.",
    related: ["usd", "fed"],
    keywords: ["dxy là gì", "chỉ số usd"],
  },
  {
    slug: "fed",
    term: "Fed (Cục Dự trữ Liên bang Mỹ)",
    category: "vi-mo",
    short: "Ngân hàng trung ương Mỹ, quyết định lãi suất USD.",
    body:
      "Quyết định FOMC mỗi 6 tuần là sự kiện vĩ mô lớn nhất với mọi thị trường. Fed tăng lãi suất → USD mạnh, áp lực giảm lên crypto / vàng. Fed giảm lãi suất → ngược lại.",
    related: ["dxy", "lai-suat", "cpi"],
    links: [{ label: "Lịch kinh tế", to: "/lich-kinh-te" }],
    keywords: ["fed là gì", "fomc"],
  },
  {
    slug: "cpi",
    term: "CPI (Chỉ số giá tiêu dùng)",
    category: "vi-mo",
    short: "Đo lạm phát qua giá hàng hoá-dịch vụ tiêu dùng theo thời gian.",
    body:
      "CPI Mỹ công bố ngày 10-15 hàng tháng, ảnh hưởng mạnh đến quyết định lãi suất Fed. CPI > kỳ vọng → khả năng Fed cứng rắn → thị trường rủi ro giảm.",
    related: ["fed", "lai-suat"],
    keywords: ["cpi là gì", "lạm phát"],
  },
  {
    slug: "lai-suat",
    term: "Lãi suất điều hành",
    category: "vi-mo",
    short:
      "Lãi suất tham chiếu do ngân hàng trung ương quy định, định hướng toàn bộ mặt bằng lãi suất nền kinh tế.",
    body:
      "Ở Việt Nam là lãi suất tái cấp vốn, tái chiết khấu (SBV); ở Mỹ là Fed Funds Rate. Tăng → tiết kiệm hấp dẫn, vay vốn đắt, kinh tế hạ nhiệt. Giảm → ngược lại.",
    related: ["fed", "cpi"],
    links: [
      { label: "Vĩ mô Việt Nam", to: "/vi-mo-viet-nam" },
      { label: "Lãi suất tiết kiệm", to: "/lai-suat-tiet-kiem" },
    ],
    keywords: ["lãi suất điều hành", "sbv"],
  },
  {
    slug: "vn-index",
    term: "VN-Index",
    category: "chung-khoan",
    short: "Chỉ số đại diện toàn bộ cổ phiếu niêm yết trên sàn HOSE.",
    body:
      "VN-Index khởi điểm 100 điểm ngày 28/07/2000. Đại diện cho 'sức khoẻ' thị trường chứng khoán Việt Nam. VN30 là rổ 30 cổ phiếu vốn hoá lớn nhất.",
    related: ["vn30", "hnx-index"],
    links: [{ label: "Chứng khoán Việt Nam", to: "/chung-khoan" }],
    keywords: ["vn index", "vnindex là gì"],
  },
  {
    slug: "vn30",
    term: "VN30",
    category: "chung-khoan",
    short: "Rổ 30 cổ phiếu vốn hoá và thanh khoản lớn nhất trên HOSE.",
    body:
      "Bao gồm VCB, VHM, HPG, FPT, VIC, MWG... Là cơ sở cho hợp đồng tương lai VN30 — sản phẩm phái sinh phổ biến nhất ở VN.",
    related: ["vn-index"],
    keywords: ["vn30 là gì", "rổ vn30"],
  },
  {
    slug: "hnx-index",
    term: "HNX-Index",
    category: "chung-khoan",
    short: "Chỉ số đại diện cho cổ phiếu niêm yết trên sàn HNX (Hà Nội).",
    body:
      "HNX thường có biên độ giao dịch cao hơn HOSE (±10% vs ±7%) và tập trung nhiều cổ phiếu vốn hoá vừa-nhỏ.",
    related: ["vn-index"],
    keywords: ["hnx index"],
  },
  {
    slug: "pe-ratio",
    term: "P/E (Price-to-Earnings)",
    category: "chung-khoan",
    short: "Tỷ số giá cổ phiếu trên lợi nhuận mỗi cổ phiếu (EPS).",
    body:
      "P/E cao = thị trường kỳ vọng tăng trưởng cao; P/E thấp = có thể bị định giá thấp hoặc kinh doanh suy giảm. Cần so sánh P/E với trung bình ngành và lịch sử của chính cổ phiếu đó.",
    related: ["pb-ratio", "eps"],
    keywords: ["pe là gì", "p/e ratio"],
  },
  {
    slug: "pb-ratio",
    term: "P/B (Price-to-Book)",
    category: "chung-khoan",
    short: "Tỷ số giá cổ phiếu trên giá trị sổ sách mỗi cổ phiếu.",
    body:
      "P/B < 1 nghĩa là thị trường định giá doanh nghiệp thấp hơn vốn chủ sở hữu — có thể là cơ hội, có thể là cảnh báo rủi ro tài chính.",
    related: ["pe-ratio"],
    keywords: ["pb ratio", "p/b là gì"],
  },
  {
    slug: "eps",
    term: "EPS (Earnings Per Share)",
    category: "chung-khoan",
    short: "Lợi nhuận sau thuế chia cho số cổ phiếu lưu hành.",
    body:
      "EPS tăng đều qua các năm là dấu hiệu doanh nghiệp đang sinh lời tốt. EPS = (LNST − Cổ tức ưu đãi) / Số CP lưu hành bình quân.",
    related: ["pe-ratio"],
    keywords: ["eps là gì"],
  },
  {
    slug: "fear-greed",
    term: "Fear & Greed Index",
    category: "crypto",
    short: "Chỉ số tâm lý thị trường crypto, từ 0 (cực kỳ sợ hãi) đến 100 (cực kỳ tham lam).",
    body:
      "Quy tắc đầu tư ngược chiều: 'Be fearful when others are greedy, and greedy when others are fearful' (Warren Buffett). Chỉ số < 25 thường là vùng tích luỹ; > 75 là vùng cẩn trọng.",
    related: ["bull-market", "bear-market"],
    links: [{ label: "Xem chỉ số Fear & Greed", to: "/tien-dien-tu" }],
    keywords: ["fear greed index", "tâm lý crypto"],
  },
];

export function findTerm(slug: string): GlossaryTerm | undefined {
  return GLOSSARY.find((t) => t.slug === slug);
}

export const CATEGORY_LABEL: Record<GlossaryTerm["category"], string> = {
  crypto: "Crypto",
  vang: "Vàng",
  "ngoai-te": "Ngoại tệ",
  "chung-khoan": "Chứng khoán",
  "vi-mo": "Vĩ mô",
  "dau-tu": "Đầu tư",
};