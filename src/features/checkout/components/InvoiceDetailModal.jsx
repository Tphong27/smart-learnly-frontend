import { useEffect, useState } from "react";
import { Modal, Button, useToast } from "@/shared/components/ui";
import { StatusBadge } from "@/shared/components/status";
import { transactionService, orderService } from "@/services";
import { formatAmount, formatDateTime } from "@/shared/utils/formatters";
import { downloadInvoice } from "@/features/checkout/utils/downloadInvoice";
import "../invoice-detail-modal.css";

export function InvoiceDetailModal({ open, transactionId, onClose }) {
  const toast = useToast();
  const [invoice, setInvoice] = useState(null);
  const [order, setOrder] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const purchasedItem = order?.items?.[0];

  const handleDownloadInvoice = () => {
    downloadInvoice({
      invoice,
      order,
      purchasedItem,
      onBlocked: () => {
        toast.error("Please allow pop-ups to download invoice.");
      },
    });
  };

  useEffect(() => {
    if (!open || !transactionId) {
      return undefined;
    }
    let cancelled = false;
    (async () => {
      setLoading(true);
      setError(null);
      try {
        const data = await transactionService.getInvoice(transactionId);
        if (cancelled) return;
        setInvoice(data);
        if (data?.orderId) {
          try {
            const orderData = await orderService.get(data.orderId);
            if (!cancelled) setOrder(orderData);
          } catch {
            if (!cancelled) setOrder(null);
          }
        }
      } catch (err) {
        if (cancelled) return;
        const message = err?.message || "Could not load invoice.";
        setError(message);
        toast.error(message);
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [open, transactionId, toast]);

  return (
    <Modal open={open} title="Invoice details" size="md" onClose={onClose}>
      {loading ? (
        <div className="history-loading">Loading invoice...</div>
      ) : error ? (
        <div className="history-error">{error}</div>
      ) : !invoice ? null : (
        <div className="invoice-detail">
          <section className="invoice-detail__header">
            <div>
              <div className="invoice-detail__label">Invoice number</div>
              <strong className="invoice-detail__number">
                {invoice.invoiceNumber || "--"}
              </strong>
            </div>

            <div className="invoice-detail__status">
              <div className="invoice-detail__label">Status</div>
              <StatusBadge status={invoice.status} />
            </div>
          </section>

          <section>
            <h3 className="invoice-detail__section-title">Payment summary</h3>

            <div className="invoice-detail__grid">
              <div className="invoice-detail__card">
                <div className="invoice-detail__label">Amount</div>
                <strong className="invoice-detail__strong">
                  {formatAmount(invoice.amount, invoice.currency)}
                </strong>
              </div>

              <div className="invoice-detail__card">
                <div className="invoice-detail__label">Paid at</div>
                <strong>
                  {invoice.paidAt ? formatDateTime(invoice.paidAt) : "--"}
                </strong>
              </div>

              <div className="invoice-detail__card invoice-detail__card--full">
                <div className="invoice-detail__label">Transaction ID</div>
                <strong
                  className="invoice-detail__transaction-id"
                  title={invoice.transactionId}
                >
                  {invoice.transactionId || "--"}
                </strong>
              </div>
            </div>
          </section>

          <section>
            <h3 className="invoice-detail__section-title">
              Trainee information
            </h3>

            <div className="invoice-detail__trainee-card">
              <div>
                <div className="invoice-detail__label">Name</div>
                <strong>{invoice.traineeName || "--"}</strong>
              </div>

              <div>
                <div className="invoice-detail__label">Email</div>
                <strong className="invoice-detail__break">
                  {invoice.traineeEmail || "--"}
                </strong>
              </div>

              <div>
                <div className="invoice-detail__label">Phone</div>
                <strong>{invoice.traineePhoneNumber || "--"}</strong>
              </div>

              <div>
                <div className="invoice-detail__label">Order code</div>
                <strong className="invoice-detail__break">
                  {order?.orderCode || "--"}
                </strong>
              </div>
            </div>
          </section>

          <section>
            <h3 className="invoice-detail__section-title">Purchased class</h3>

            {purchasedItem ? (
              <div className="invoice-detail__purchased-card">
                <div className="invoice-detail__purchased-info">
                  <strong className="invoice-detail__course-title">
                    {purchasedItem.itemTitle || "--"}
                  </strong>

                  <span className="invoice-detail__class-name">
                    Class: {purchasedItem.className || "--"}
                  </span>
                </div>

                <strong className="invoice-detail__price">
                  {formatAmount(purchasedItem.finalAmount, invoice.currency)}
                </strong>
              </div>
            ) : (
              <div className="history-empty">No purchased class found.</div>
            )}
          </section>

          <div className="invoice-detail__actions">
            <Button type="button" onClick={handleDownloadInvoice}>
              Download invoice
            </Button>

            <Button type="button" variant="ghost" onClick={onClose}>
              Close
            </Button>
          </div>
        </div>
      )}
    </Modal>
  );
}
