import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useToast } from "@/shared/components/ui";
import { checkoutService, paymentStatusService } from "../services/checkoutService";

const POLLING_INTERVAL_MS = 4000;

/**
 * Quản lý toàn bộ trạng thái của màn hình chờ thanh toán.
 * Hook tải order khi mở lại trang, polling mỗi 4 giây và chuyển sang trang kết
 * quả khi backend trả về trạng thái kết thúc.
 */
export function useCheckoutPayment(orderId, initialCheckout) {
  const navigate = useNavigate();
  const toast = useToast();
  const [payment, setPayment] = useState(initialCheckout);
  const [isLoading, setIsLoading] = useState(!initialCheckout);
  const [error, setError] = useState(null);

  const isFinalStatus = useMemo(
    () => paymentStatusService.isFinal(payment?.status),
    [payment?.status],
  );

  useEffect(() => {
    if (initialCheckout || !orderId) {
      return undefined;
    }

    let cancelled = false;

    /** Tải thông tin order lần đầu khi trang không nhận được checkout từ route state. */
    async function loadOrder() {
      setIsLoading(true);
      setError(null);

      try {
        const order = await checkoutService.get(orderId);
        if (!cancelled) {
          setPayment(order);
        }
      } catch (requestError) {
        if (!cancelled) {
          const message = requestError?.message || "Could not load checkout order.";
          setError(message);
          toast.error(message);
        }
      } finally {
        if (!cancelled) {
          setIsLoading(false);
        }
      }
    }

    loadOrder();
    return () => {
      cancelled = true;
    };
  }, [initialCheckout, orderId, toast]);

  useEffect(() => {
    if (!orderId || isFinalStatus) {
      return undefined;
    }

    let cancelled = false;

    /** Đồng bộ trạng thái order và kết thúc màn hình chờ khi thanh toán đã hoàn tất. */
    async function pollOrder() {
      try {
        const order = await checkoutService.get(orderId);
        if (cancelled) {
          return;
        }

        setPayment((current) => ({ ...current, ...order }));

        if (paymentStatusService.isFinal(order.status)) {
          navigate(`/payment-result?orderId=${orderId}`, {
            replace: true,
            state: {
              orderId,
              transactionId: order.transactionId,
              status: order.status,
              payment: order,
            },
          });
        }
      } catch {
        // Temporary polling failures should not interrupt the payment screen.
      }
    }

    pollOrder();
    const timer = window.setInterval(pollOrder, POLLING_INTERVAL_MS);

    return () => {
      cancelled = true;
      window.clearInterval(timer);
    };
  }, [isFinalStatus, navigate, orderId]);

  return { payment, isLoading, error };
}
