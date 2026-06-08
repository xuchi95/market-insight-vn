/**
 * Giờ giao dịch HOSE/HNX/UPCOM (giờ Việt Nam, UTC+7):
 *   - Sáng:   09:00 – 11:30
 *   - Chiều:  13:00 – 15:00
 * Thứ Bảy & Chủ Nhật nghỉ. (Nghỉ lễ chưa xử lý — chấp nhận false positive
 * vài ngày/năm; trong những ngày đó SSI sẽ trả nến cũ và poll vẫn an toàn.)
 */
export function isVnMarketOpen(d: Date = new Date()): boolean {
  // Cộng 7h để chuyển sang "giờ VN ảo" rồi đọc bằng UTC getters.
  const vn = new Date(d.getTime() + 7 * 60 * 60 * 1000);
  const dow = vn.getUTCDay(); // 0 = CN, 6 = T7
  if (dow === 0 || dow === 6) return false;
  const mins = vn.getUTCHours() * 60 + vn.getUTCMinutes();
  return (mins >= 9 * 60 && mins <= 11 * 60 + 30) || (mins >= 13 * 60 && mins <= 15 * 60);
}