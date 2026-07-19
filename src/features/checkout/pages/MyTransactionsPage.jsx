import { useEffect, useState } from "react";
import {
  AlertCircle,
  FileText,
  ListFilter,
  ReceiptText,
  Search,
  SearchX,
  ShoppingBag,
  X,
  XCircle,
} from "lucide-react";
import { Modal, Button, useToast } from "@/shared/components/ui";
import { Pagination } from "@/shared/components/Pagination";
import { transactionService, orderService } from "@/services";
import { StatusBadge } from "@/shared/components/status";
import { InvoiceDetailModal } from "../components/InvoiceDetailModal";
import { formatAmount, formatDate, truncateId } from "@/shared/utils/formatters";
import { DEFAULT_PAGE_SIZE } from "@/shared/constants/pagination";
import "../../enrollment/pages/history-page.css";
import "./my-transactions-page.css";

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
        <div
          className="auth-card__alert transaction-page__confirm-error"
          role="alert"
        >
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
          loadingLabel="Cancelling..."
        >
          Cancel order
        </Button>
      </div>
    </Modal>
  );
}

function TransactionTableSkeleton() {
  return (
    <div
      className="my-transactions-page__table-wrap"
      aria-label="Loading transactions"
      aria-busy="true"
    >
      <table className="history-table my-transactions-page__table">
        <thead>
          <tr>
            <th>Invoice / Order</th>
            <th>Payment method</th>
            <th>Amount</th>
            <th>Status</th>
            <th>Dates</th>
            <th><span className="sr-only">Actions</span></th>
          </tr>
        </thead>
        <tbody>
          {Array.from({ length: 5 }, (_, index) => (
            <tr key={index} className="my-transactions-page__skeleton-row">
              <td data-label="Invoice / Order">
                <span className="sl-loading-skeleton my-transactions-page__skeleton my-transactions-page__skeleton--title" />
                <span className="sl-loading-skeleton my-transactions-page__skeleton my-transactions-page__skeleton--meta" />
              </td>
              <td data-label="Payment method">
                <span className="sl-loading-skeleton my-transactions-page__skeleton my-transactions-page__skeleton--gateway" />
              </td>
              <td data-label="Amount">
                <span className="sl-loading-skeleton my-transactions-page__skeleton my-transactions-page__skeleton--amount" />
              </td>
              <td data-label="Status">
                <span className="sl-loading-skeleton my-transactions-page__skeleton my-transactions-page__skeleton--status" />
              </td>
              <td data-label="Dates">
                <span className="sl-loading-skeleton my-transactions-page__skeleton my-transactions-page__skeleton--date" />
                <span className="sl-loading-skeleton my-transactions-page__skeleton my-transactions-page__skeleton--meta" />
              </td>
              <td data-label="Action">
                <span className="sl-loading-skeleton my-transactions-page__skeleton my-transactions-page__skeleton--action" />
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function TransactionState({ type, message, onRetry }) {
  const isError = type === "error";
  const isNoResults = type === "no-results";
  const Icon = isError ? AlertCircle : isNoResults ? SearchX : ReceiptText;

  return (
    <div
      className={`my-transactions-page__state my-transactions-page__state--${type}`}
      role={isError ? "alert" : undefined}
    >
      <Icon size={28} aria-hidden="true" />
      <h3>
        {isError
          ? "We couldn't load your transactions"
          : isNoResults
            ? "No matching transactions"
            : "No transactions yet"}
      </h3>
      <p>{message}</p>

      {isError || isNoResults ? (
        <Button type="button" variant="secondary" onClick={onRetry}>
          {isError ? "Try again" : "Clear filters"}
        </Button>
      ) : (
        <Button
          to="/learning/courses"
          variant="secondary"
          leftIcon={<ShoppingBag size={17} aria-hidden="true" />}
        >
          Browse courses
        </Button>
      )}
    </div>
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
  const [searchValue, setSearchValue] = useState("");
  const [keyword, setKeyword] = useState("");
  const [status, setStatus] = useState("");

  useEffect(() => {
    const timer = window.setTimeout(() => {
      setKeyword(searchValue.trim());
      setPageRequest(0);
    }, 350);

    return () => window.clearTimeout(timer);
  }, [searchValue]);

  useEffect(() => {
    let cancelled = false;

    (async () => {
      setLoading(true);
      setError(null);

      try {
        const data = await transactionService.list({
          page: pageRequest,
          size: pageSize,
          keyword,
          status,
        });

        if (cancelled) return;

        setItems(data.items || []);
        setTotalPages(data.totalPages || 0);
        setTotalItems(data.totalItems || 0);
        setPage(data.page ?? pageRequest);
      } catch (err) {
        if (cancelled) return;

        const message = err?.message || "Could not load transactions.";
        setItems([]);
        setPage(0);
        setTotalPages(0);
        setTotalItems(0);
        setError(message);
        toast.error(message);
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [keyword, pageRequest, pageSize, refreshKey, status, toast]);

  function retryLoad() {
    setRefreshKey((key) => key + 1);
  }

  function clearFilters() {
    setSearchValue("");
    setKeyword("");
    setStatus("");
    setPageRequest(0);
  }

  const hasFilters = Boolean(keyword || status);

  return (
    <div className="history-page my-transactions-page">
      <header className="history-page__header my-transactions-page__header">
        <h1>Transaction history</h1>
      </header>

      <section className="my-transactions-page__records" aria-label="Transaction records">
        <div className="my-transactions-page__toolbar" role="search">
          <label className="my-transactions-page__search">
            <Search size={18} aria-hidden="true" />
            <span className="sr-only">Search transactions</span>
            <input
              type="search"
              value={searchValue}
              maxLength={100}
              placeholder="Search invoice or order ID..."
              aria-label="Search transactions by invoice or order ID"
              onChange={(event) => setSearchValue(event.target.value)}
            />
            {searchValue && (
              <button
                type="button"
                className="my-transactions-page__clear-search"
                aria-label="Clear transaction search"
                onClick={() => setSearchValue("")}
              >
                <X size={17} aria-hidden="true" />
              </button>
            )}
          </label>

          <label className="my-transactions-page__filter">
            <ListFilter size={18} aria-hidden="true" />
            <span className="sr-only">Filter transactions by status</span>
            <select
              value={status}
              aria-label="Filter transactions by status"
              onChange={(event) => {
                setStatus(event.target.value);
                setPageRequest(0);
              }}
            >
              <option value="">All statuses</option>
              <option value="PENDING">Pending</option>
              <option value="PROCESSING">Processing</option>
              <option value="SUCCESS">Successful</option>
              <option value="FAILED">Failed</option>
              <option value="REFUNDED">Refunded</option>
            </select>
          </label>

          {hasFilters && (
            <Button
              type="button"
              variant="ghost"
              className="my-transactions-page__clear-filters"
              onClick={clearFilters}
            >
              Clear
            </Button>
          )}
        </div>

        <div className="my-transactions-page__results" aria-busy={loading}>
          {loading ? (
            <TransactionTableSkeleton />
          ) : error ? (
            <TransactionState type="error" message={error} onRetry={retryLoad} />
          ) : items.length === 0 && hasFilters ? (
            <TransactionState
              type="no-results"
              message="Try another invoice or order ID, or choose a different status."
              onRetry={clearFilters}
            />
          ) : items.length === 0 ? (
            <TransactionState
              type="empty"
              message="When you purchase a course, its payment details and invoice will appear here."
            />
          ) : (
            <div className="my-transactions-page__table-wrap">
              <table className="history-table my-transactions-page__table">
              <thead>
                <tr>
                  <th>Invoice / Order</th>
                  <th>Payment method</th>
                  <th>Amount</th>
                  <th>Status</th>
                  <th>Dates</th>
                  <th><span className="sr-only">Actions</span></th>
                </tr>
              </thead>
              <tbody>
                {items.map((transaction) => {
                  const normalizedStatus = String(transaction.status || "").toUpperCase();
                  const isPaid = normalizedStatus === "SUCCESS";
                  const isPending = normalizedStatus === "PENDING";
                  const hasAction = isPaid || (isPending && transaction.orderId);

                  return (
                    <tr key={transaction.id}>
                      <td data-label="Invoice / Order">
                        <strong className="my-transactions-page__invoice">
                          {transaction.invoiceNumber || "Invoice pending"}
                        </strong>
                        {transaction.orderId && (
                          <div className="transaction-page__meta">
                            Order {truncateId(transaction.orderId)}
                          </div>
                        )}
                      </td>
                      <td data-label="Payment method">
                        <span className="my-transactions-page__gateway">
                          {transaction.paymentGateway || "Not available"}
                        </span>
                      </td>
                      <td data-label="Amount">
                        <strong className="my-transactions-page__amount">
                          {formatAmount(transaction.amount, transaction.currency)}
                        </strong>
                      </td>
                      <td data-label="Status">
                        <StatusBadge status={transaction.status} />
                      </td>
                      <td data-label="Dates">
                        <span className="my-transactions-page__date">
                          Created {formatDate(transaction.createdAt)}
                        </span>
                        <span className="transaction-page__meta">
                          {transaction.paidAt
                            ? `Paid ${formatDate(transaction.paidAt)}`
                            : "Not paid yet"}
                        </span>
                      </td>
                      <td
                        data-label="Action"
                        className={`transaction-page__action-cell${hasAction ? "" : " is-empty"}`}
                      >
                        {isPaid && (
                          <Button
                            type="button"
                            size="sm"
                            variant="secondary"
                            className="my-transactions-page__action-button"
                            leftIcon={<FileText size={16} aria-hidden="true" />}
                            onClick={() => setInvoiceTarget(transaction.id)}
                          >
                            View invoice
                          </Button>
                        )}

                        {isPending && transaction.orderId && (
                          <Button
                            type="button"
                            size="sm"
                            variant="danger"
                            className="my-transactions-page__action-button"
                            leftIcon={<XCircle size={16} aria-hidden="true" />}
                            onClick={() => setCancelTarget(transaction)}
                          >
                            Cancel order
                          </Button>
                        )}

                        {!hasAction && (
                          <span className="transaction-page__empty-value" aria-hidden="true">—</span>
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
        </div>
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
          setRefreshKey((key) => key + 1);
        }}
      />
    </div>
  );
}
