import { useEffect, useState } from "react";
import { Modal, Button, useToast } from "@/shared/components/ui";
import { transactionService, orderService } from "@/services";
import { StatusBadge } from "@/shared/components/status";
import Pagination from "@/shared/components/Pagination";
import { InvoiceDetailModal } from "../components/InvoiceDetailModal";
import {
  formatAmount,
  formatDate,
  truncateId,
} from "@/shared/utils/formatters";
import { DEFAULT_PAGE_SIZE } from "@/shared/constants/pagination";
import "../../enrollment/pages/history-page.css";
import "../checkout.css";

function CancelOrderModal({ open, target, onClose, onConfirmed }) {
  const toast = useToast();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  async function handleConfirm() {
    if (!target?.orderId) return;
    setError(null);
    setLoading(true);
    try {
      await orderService.cancel(target.orderId);
      toast.success("Order cancelled successfully");
      onConfirmed(target);
    } catch (err) {
      setError(err?.message || "Could not cancel this order.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <Modal
      open={open}
      title="Confirm order cancellation"
      size="sm"
      onClose={loading ? undefined : onClose}
    >
      <p className="transaction-page__confirm-content">
        Are you sure you want to cancel order{" "}
        <strong>{target?.invoiceNumber || truncateId(target?.orderId)}</strong>?
        This will release any pending payment session and cannot be undone.
      </p>
      {error && (
        <div className="auth-card__alert transaction-page__confirm-error">
          {error}
        </div>
      )}
      <div className="transaction-page__confirm-actions">
        <Button
          type="button"
          variant="ghost"
          onClick={onClose}
          disabled={loading}
        >
          Keep order
        </Button>
        <Button
          type="button"
          variant="danger"
          onClick={handleConfirm}
          loading={loading}
        >
          Cancel order
        </Button>
      </div>
    </Modal>
  );
}

export function MyTransactionsPage() {
  const toast = useToast();
  const [items, setItems] = useState([]);
  const [page, setPage] = useState(0);
  const [pageSize, setPageSize] = useState(DEFAULT_PAGE_SIZE);
  const [totalPages, setTotalPages] = useState(0);
  const [totalItems, setTotalItems] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [pageRequest, setPageRequest] = useState(0);
  const [invoiceTarget, setInvoiceTarget] = useState(null);
  const [cancelTarget, setCancelTarget] = useState(null);
  const [refreshKey, setRefreshKey] = useState(0);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      setLoading(true);
      setError(null);
      try {
        const data = await transactionService.list({
          page: pageRequest,
          size: pageSize,
        });
        if (cancelled) return;
        setItems(data.items || []);
        setTotalPages(data.totalPages || 0);
        setTotalItems(data.totalItems || 0);
        setPage(data.page ?? pageRequest);
      } catch (err) {
        if (cancelled) return;
        const message = err?.message || "Could not load transactions.";
        setError(message);
        toast.error(message);
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [pageRequest, pageSize, toast, refreshKey]);

  return (
    <div className="history-page checkout-history-page">
      <header className="history-page__header">
        <h1>Transaction history</h1>
      </header>
      <section className="history-card">
        <div className="history-toolbar">
          <strong className="transaction-page__section-title">
            Payment records
          </strong>
          <span className="history-toolbar__count">
            {totalItems} record{totalItems === 1 ? "" : "s"}
          </span>
        </div>

        {loading ? (
          <div className="history-loading">Loading transactions...</div>
        ) : error ? (
          <div className="history-error">{error}</div>
        ) : items.length === 0 ? (
          <div className="history-empty">You have no payment records yet.</div>
        ) : (
          <div className="history-table-wrap">
          <table className="history-table">
            <thead>
              <tr>
                <th>Invoice / Order</th>
                <th>Gateway</th>
                <th>Amount</th>
                <th>Status</th>
                <th>Created</th>
                <th>Paid at</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {items.map((tx) => {
                const isPaid = (tx.status || "").toUpperCase() === "SUCCESS";
                const isPending = (tx.status || "").toUpperCase() === "PENDING";
                return (
                  <tr key={tx.id}>
                    <td>
                      <strong>{tx.invoiceNumber || "--"}</strong>
                      {tx.orderId && (
                        <div className="transaction-page__meta">
                          order: {truncateId(tx.orderId)}
                        </div>
                      )}
                    </td>
                    <td>{tx.paymentGateway || "--"}</td>
                    <td>{formatAmount(tx.amount, tx.currency)}</td>
                    <td>
                      <StatusBadge status={tx.status} />
                    </td>
                    <td>{formatDate(tx.createdAt)}</td>
                    <td>{tx.paidAt ? formatDate(tx.paidAt) : "--"}</td>
                    <td className="transaction-page__action-cell">
                      {isPaid && (
                        <button
                          type="button"
                          className="history-table__link transaction-page__action-btn"
                          onClick={() => setInvoiceTarget(tx.id)}
                        >
                          View invoice
                        </button>
                      )}
                      {isPending && tx.orderId && (
                        <button
                          type="button"
                          className="history-table__link transaction-page__action-btn transaction-page__action-btn--danger"
                          onClick={() => setCancelTarget(tx)}
                        >
                          Cancel order
                        </button>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
          </div>
        )}

        <Pagination
          page={page + 1}
          totalPages={totalPages}
          totalItems={totalItems}
          size={pageSize}
          disabled={loading}
          ariaLabel="Transaction history pagination"
          className="my-transactions-page__pagination"
          onPageChange={(nextPage) => setPageRequest(nextPage - 1)}
          onSizeChange={(nextSize) => {
            setPageSize(nextSize);
            setPageRequest(0);
          }}
        />
      </section>
      <InvoiceDetailModal
        open={Boolean(invoiceTarget)}
        transactionId={invoiceTarget}
        onClose={() => setInvoiceTarget(null)}
      />
      <CancelOrderModal
        open={Boolean(cancelTarget)}
        target={cancelTarget}
        onClose={() => setCancelTarget(null)}
        onConfirmed={() => {
          setCancelTarget(null);
          setRefreshKey((k) => k + 1);
        }}
      />
    </div>
  );
}
