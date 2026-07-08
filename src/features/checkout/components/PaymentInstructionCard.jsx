import { Copy } from 'lucide-react'
import { PaymentStatusBadge } from './PaymentStatusBadge'
import { VietQrBox } from './VietQrBox'

function formatMoney(value, currency = 'VND') {
  return new Intl.NumberFormat('vi-VN', {
    style: 'currency',
    currency,
    maximumFractionDigits: 0,
  }).format(Number(value || 0))
}

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

export function PaymentInstructionCard({ payment, onCopy }) {
  return (
    <section className="payment-instruction-card">
      <div className="payment-instruction-card__header">
        <div>
          <h2>Scan to pay</h2>
          <p>
            Transfer the exact amount and include the exact payment code.
          </p>
        </div>

        <PaymentStatusBadge status={payment?.status} />
      </div>

      <div className="payment-instruction-card__body">
        <VietQrBox qrUrl={payment?.qrUrl} />

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
            onCopy={onCopy}
          />

          <InfoRow
            label="Account name"
            value={payment?.accountName}
          />

          <InfoRow
            label="Payment code"
            value={payment?.paymentCode}
            copyable
            onCopy={onCopy}
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