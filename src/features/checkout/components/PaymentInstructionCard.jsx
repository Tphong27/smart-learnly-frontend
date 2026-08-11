import { useEffect, useState } from "react";
import { Copy } from "lucide-react";
import { StatusBadge } from "@/shared/components/status";
import { useToast } from "@/shared/components/ui";
import { formatAmount } from "@/shared/utils/formatters";

/** Tính số giây còn lại dựa trên thời điểm hết hạn do backend trả về. */
function calculateRemainingSeconds(expiresAt) {
  if (!expiresAt) {
    return null;
  }

  const expiresAtTime = new Date(expiresAt).getTime();

  if (Number.isNaN(expiresAtTime)) {
    return null;
  }

  return Math.max(0, Math.ceil((expiresAtTime - Date.now()) / 1000));
}

/** Định dạng countdown thành HH:mm:ss. */
function formatCountdown(totalSeconds) {
  if (totalSeconds === null) {
    return "--";
  }

  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;

  return [hours, minutes, seconds]
    .map((value) => String(value).padStart(2, "0"))
    .join(":");
}

/** Quản lý đồng hồ đếm ngược cho phiên thanh toán hiện tại. */
function usePaymentCountdown(expiresAt) {
  const [remainingSeconds, setRemainingSeconds] = useState(() =>
    calculateRemainingSeconds(expiresAt),
  );

  useEffect(() => {
    if (!expiresAt) {
      return undefined;
    }

    const timerId = window.setInterval(() => {
      setRemainingSeconds(calculateRemainingSeconds(expiresAt));
    }, 1000);

    return () => {
      window.clearInterval(timerId);
    };
  }, [expiresAt]);

  return remainingSeconds;
}

/** Hiển thị một dòng thông tin thanh toán. */
function InfoRow({ label, value, copyable = false, onCopy }) {
  return (
    <div className="payment-info-row">
      <dt>{label}</dt>
      <dd>
        <span>{value || "--"}</span>

        {copyable && value && (
          <button
            type="button"
            onClick={() => onCopy?.(value)}
            aria-label={`Copy ${label}`}
          >
            <Copy size={14} aria-hidden="true" />
          </button>
        )}
      </dd>
    </div>
  );
}

/** Hiển thị QR và thông tin chuyển khoản của phiên thanh toán. */
export function PaymentInstructionCard({ payment }) {
  const toast = useToast();

  const remainingSeconds = usePaymentCountdown(payment?.expiresAt);

  async function handleCopy(value) {
    if (!value) {
      return;
    }

    try {
      await navigator.clipboard.writeText(value);

      toast.success("Copied.");
    } catch {
      toast.error("Could not copy.");
    }
  }

  return (
    <section className="payment-instruction-card">
      <div className="payment-instruction-card__header">
        <div>
          <h2>Scan to pay</h2>
        </div>

        <StatusBadge status={payment?.status} />
      </div>

      <div className="payment-instruction-card__body">
        <div className="vietqr-box">
          {payment?.qrUrl ? (
            <img src={payment.qrUrl} alt="VietQR payment code" />
          ) : (
            <div className="vietqr-box__empty">QR code is unavailable</div>
          )}
        </div>

        <dl className="payment-instruction-card__info">
          <InfoRow
            label="Amount"
            value={formatAmount(payment?.amount, payment?.currency)}
          />

          <InfoRow label="Bank" value={payment?.bankName} />

          <InfoRow
            label="Account number"
            value={payment?.bankAccountNumber}
            copyable
            onCopy={handleCopy}
          />

          <InfoRow label="Account name" value={payment?.accountName} />

          <InfoRow
            label="Transfer content"
            value={payment?.transferContent || payment?.paymentCode}
            copyable
            onCopy={handleCopy}
          />

          <InfoRow
            label="Expires in"
            value={formatCountdown(remainingSeconds)}
          />
        </dl>
      </div>
    </section>
  );
}
