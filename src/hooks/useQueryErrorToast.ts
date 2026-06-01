import { useEffect, useRef } from "react";
import { toast } from "sonner";

/**
 * Hiển thị toast một lần khi useQuery chuyển sang trạng thái lỗi,
 * và reset khi quay lại thành công. Dùng cho dữ liệu realtime để
 * người dùng biết bảng giá đang dùng dữ liệu cũ / không tải được.
 */
export function useQueryErrorToast(
  isError: boolean,
  error: unknown,
  label: string,
) {
  const firedRef = useRef(false);
  useEffect(() => {
    if (isError && !firedRef.current) {
      firedRef.current = true;
      const msg = error instanceof Error ? error.message : "lỗi không xác định";
      toast.error(`Không tải được ${label}`, {
        description: msg,
        id: `query-error-${label}`,
      });
    } else if (!isError && firedRef.current) {
      firedRef.current = false;
    }
  }, [isError, error, label]);
}