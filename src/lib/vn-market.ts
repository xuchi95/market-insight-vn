/**
 * Giờ giao dịch HOSE/HNX/UPCOM (giờ Việt Nam, UTC+7):
 *   - Sáng:   09:00 – 11:30
 *   - Chiều:  13:00 – 15:00
 * Thứ Bảy & Chủ Nhật nghỉ. (Nghỉ lễ chưa xử lý — chấp nhận false positive
 * vài ngày/năm; trong những ngày đó SSI sẽ trả nến cũ và poll vẫn an toàn.)
 */
export function isVnMarketOpen(d: Date = new Date()): boolean {
  const utcMin = d.getUTCHours() * 60 + d.getUTCMinutes();
  const vnMin = (utcMin + 7 * 60) % (24 * 60);
  // Day-of-week phải tính sau khi cộng offset, vì nửa đêm UTC ≈ 7h sáng VN.
  const vnEpochMin = Math.floor(d.getTime() / 60000) + 7 * 60;
  const vnDay = Math.floor(vnEpochMin / (24 * 60)) % 7; // 0..6, bắt đầu thứ Năm 1970
  // Thứ 1970-01-01 là thứ Năm → vnDay 0 = Thu. Map sang chuẩn Sun=0:
  // Thu=4, Fri=5, Sat=6, Sun=0, Mon=1, Tue=2, Wed=3
  const map = [4, 5, 6, 0, 1, 2, 3];
  const dow = map[vnDay];
  if (dow === 0 || dow === 6) return false;
  return (vnMin >= 9 * 60 && vnMin <= 11 * 60 + 30) || (vnMin >= 13 * 60 && vnMin <= 15 * 60);
}