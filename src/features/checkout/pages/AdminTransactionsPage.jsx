import { useEffect, useState } from "react";
import { adminMonitoringService } from "../../../services/admin-monitoring.service";
import { StatusBadge } from "@/shared/components/status";
import { InvoiceDetailModal } from "../components/InvoiceDetailModal";
import {
  formatAmount,
  formatDateTime,
  truncateId,
} from "@/shared/utils/formatters";
import { DEFAULT_PAGE_SIZE } from "@/shared/constants/pagination";
import "../../enrollment/pages/history-page.css";
import "../checkout.css";

export default function AdminTransactionsPage() {
  const [items, setItems] = useState([]);
  const [page, setPage] = useState(0);
  const [pageRequest, setPageRequest] = useState(0);
  const [totalPages, setTotalPages] = useState(0);
  const [totalItems, setTotalItems] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [invoiceTarget, setInvoiceTarget] = useState(null);

  useEffect(() => {
    let cancelled = false;

    async function loadTransactions() {
      setLoading(true);
      setError("");

      try {
        const data = await adminMonitoringService.getTransactions({
          page: pageRequest,
          size: DEFAULT_PAGE_SIZE,
        });

        if (cancelled) return;

        const transactions = Array.isArray(data?.items)
          ? data.items
          : Array.isArray(data?.content)
            ? data.content
            : Array.isArray(data)
              ? data
              : [];

        setItems(transactions);
        setPage(data?.page ?? pageRequest);
        setTotalPages(data?.totalPages ?? 0);
        setTotalItems(data?.totalItems ?? transactions.length);
      } catch (err) {
        if (cancelled) return;

        console.error("Error fetching transactions list:", err);
        setItems([]);
        setError(err?.message || "Could not load transactions.");
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    }

    loadTransactions();

    return () => {
      cancelled = true;
    };
  }, [pageRequest]);

  return (
    <div className="history-page checkout-history-page checkout-history-page--admin">
      <header className="history-page__header">
        <h1>Transaction Management</h1>
        <p>
          Review all payment transactions created by trainees in the system.
        </p>
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
          <div className="history-empty">No transactions found.</div>
        ) : (
          <div className="history-table-wrap">
            <table className="history-table">
              <thead>
                <tr>
                  <th>Transaction / Order</th>
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
                  const isPaid =
                    String(tx.status || "").toUpperCase() === "SUCCESS";

                  return (
                    <tr key={tx.id}>
                      <td>
                        <strong title={tx.id}>{truncateId(tx.id)}</strong>

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

                      <td>{formatDateTime(tx.createdAt)}</td>

                      <td>{tx.paidAt ? formatDateTime(tx.paidAt) : "--"}</td>

                      <td className="transaction-page__action-cell">
                        {isPaid && tx.invoiceNumber ? (
                          <button
                            type="button"
                            className="history-table__link transaction-page__action-btn"
                            onClick={() => setInvoiceTarget(tx.id)}
                          >
                            View invoice
                          </button>
                        ) : (
                          <span className="transaction-page__empty-value">
                            --
                          </span>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}

        {totalPages > 1 && (
          <div className="history-pagination">
            <span style={{ color: "#64748b", fontSize: 13 }}>
              Page {page + 1} / {totalPages}
            </span>

            <div style={{ display: "flex", gap: 8 }}>
              <button
                type="button"
                className="history-pagination__btn"
                onClick={() => setPageRequest(page - 1)}
                disabled={page === 0}
              >
                Previous
              </button>

              <button
                type="button"
                className="history-pagination__btn"
                onClick={() => setPageRequest(page + 1)}
                disabled={page + 1 >= totalPages}
              >
                Next
              </button>
            </div>
          </div>
        )}
      </section>

      <InvoiceDetailModal
        open={Boolean(invoiceTarget)}
        transactionId={invoiceTarget}
        onClose={() => setInvoiceTarget(null)}
      />
    </div>
  );
}
