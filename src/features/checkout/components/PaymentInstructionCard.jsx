import { Copy } from 'lucide-react'
import { useToast } from '@/shared/components/ui'
import { PaymentStatusBadge } from './PaymentStatusBadge'

/** Định dạng số tiền theo tiền tệ Việt Nam để hiển thị trong hướng dẫn thanh toán. */
function formatMoney(value, currency = 'VND') {
  return new Intl.NumberFormat('vi-VN', {
    style: 'currency',
    currency,
    maximumFractionDigits: 0,
  }).format(Number(value || 0))
}

/** Hiển thị một dòng thông tin thanh toán và nút sao chép khi được cho phép. */
function InfoRow({ label, value, copyable, onCopy }) {
  return (
    <div className="payment-info-row">
      <dt>{label}</dt>
      <dd>
        <span>{value || '-'}</span>

        {copyable && value && (
          <button
            type="button"
            onClick={() => onCopy(value)}
            aria-label={`Copy ${label}`}
          >
            <Copy size={14} />
          </button>
        )}
      </dd>
    </div>
  )
}

/**
 * Hiển thị QR và toàn bộ thông tin người học cần dùng để chuyển khoản chính xác.
 * Component tự xử lý sao chép số tài khoản và nội dung chuyển khoản.
 */
export function PaymentInstructionCard({ payment }) {
  const toast = useToast()

  /** Sao chép giá trị được chọn và thông báo kết quả cho người dùng. */
  async function handleCopy(value) {
    if (!value) return

    try {
      await navigator.clipboard.writeText(value)
      toast.success('Copied.')
    } catch {
      toast.error('Could not copy.')
    }
  }

  return (
    <section className="payment-instruction-card">
      <div className="payment-instruction-card__header">
        <div>
          <h2>Scan to pay</h2>
          <p>
            Transfer the exact amount and keep the full transfer content unchanged.
          </p>
        </div>

        <PaymentStatusBadge status={payment?.status} />
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
            value={formatMoney(payment?.amount, payment?.currency)}
          />

          <InfoRow
            label="Bank"
            value={payment?.bankName}
          />

          <InfoRow
            label="Account number"
            value={payment?.bankAccountNumber}
            copyable
            onCopy={handleCopy}
          />

          <InfoRow
            label="Account name"
            value={payment?.accountName}
          />

          <InfoRow
            label="Transfer content"
            value={payment?.transferContent || payment?.paymentCode}
            copyable
            onCopy={handleCopy}
          />

          <InfoRow
            label="Expires at"
            value={
              payment?.expiresAt
                ? new Date(payment.expiresAt).toLocaleString('vi-VN')
                : '-'
            }
          />
        </dl>
      </div>
    </section>
  )
}
