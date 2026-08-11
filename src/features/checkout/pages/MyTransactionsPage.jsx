import { useEffect, useState } from "react";
import { Search } from "lucide-react";
import { useToast } from "@/shared/components/ui";
import { useDebouncedValue } from "@/shared/hooks/useDebouncedValue";
import { StatusBadge } from "@/shared/components/status";
import Pagination from "@/shared/components/Pagination";
import { DEFAULT_PAGE_SIZE } from "@/shared/constants/pagination";
import {
  formatAmount,
  formatDate,
  formatLabel,
  truncateId,
} from "@/shared/utils/formatters";
import { checkoutService } from "../services/checkoutService";
import { checkoutMonitoringService } from "../services/checkoutMonitoringService";
import { InvoiceDetailModal } from "../components/InvoiceDetailModal";
import "@/features/course/course-admin.css";
import "@/features/admin/courses/pages/AdminCoursesPage.css";
import "../../enrollment/pages/history-page.css";
import "../checkout.css";

export function MyTransactionsPage() {
  const toast = useToast();

  const [items, setItems] = useState([]);
  const [page, setPage] = useState(0);
  const [pageRequest, setPageRequest] = useState(0);
  const [pageSize, setPageSize] = useState(DEFAULT_PAGE_SIZE);
  const [totalPages, setTotalPages] = useState(0);
  const [totalItems, setTotalItems] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [invoiceTarget, setInvoiceTarget] = useState(null);

  const [keyword, setKeyword] = useState("");
  const [status, setStatus] = useState("");
  const [statusOptions, setStatusOptions] = useState([]);

  const normalizedKeyword = keyword.trim();
  const debouncedKeyword = useDebouncedValue(normalizedKeyword);

  const hasFilters = Boolean(normalizedKeyword || status);

  useEffect(() => {
    let cancelled = false;

    async function loadFilterOptions() {
      try {
        const options =
          await checkoutMonitoringService.getTransactionFilterOptions();

        if (cancelled) {
          return;
        }

        setStatusOptions(
          Array.isArray(options?.statuses) ? options.statuses : [],
        );
      } catch (requestError) {
        if (cancelled) {
          return;
        }

        setStatusOptions([]);

        const message =
          requestError?.message || "Could not load transaction filter options.";

        toast.error(message);
      }
    }

    loadFilterOptions();

    return () => {
      cancelled = true;
    };
  }, [toast]);

  useEffect(() => {
    let cancelled = false;

    async function loadTransactions() {
      setLoading(true);
      setError(null);

      try {
        const data = await checkoutService.listTransactions({
          page: pageRequest,
          size: pageSize,
          keyword: debouncedKeyword || undefined,
          status: status || undefined,
        });

        if (cancelled) {
          return;
        }

        setItems(Array.isArray(data?.items) ? data.items : []);
        setPage(data?.page ?? pageRequest);
        setTotalPages(data?.totalPages ?? 0);
        setTotalItems(data?.totalItems ?? 0);
      } catch (requestError) {
        if (cancelled) {
          return;
        }

        const message = requestError?.message || "Could not load transactions.";

        setItems([]);
        setTotalPages(0);
        setTotalItems(0);
        setError(message);
        toast.error(message);
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    }

    /*
     * Không gửi request bằng keyword cũ trong khoảng thời gian
     * useDebouncedValue đang chờ cập nhật.
     */
    if (normalizedKeyword === debouncedKeyword) {
      loadTransactions();
    }

    return () => {
      cancelled = true;
    };
  }, [
    debouncedKeyword,
    normalizedKeyword,
    pageRequest,
    pageSize,
    status,
    toast,
  ]);

  function handleKeywordChange(event) {
    setKeyword(event.target.value);
    setPageRequest(0);
  }

  function handleStatusChange(nextStatus) {
    setStatus(nextStatus);
    setPageRequest(0);
  }

  return (
    <div className="history-page checkout-history-page">
      <header className="history-page__header">
        <h1>Transaction history</h1>
      </header>

      <section className="history-card">
        <div className="course-management__filters">
          <label className="course-management__field course-management__field--search">
            <span className="course-management__control course-management__search">
              <Search size={18} aria-hidden="true" />

              <input
                type="search"
                value={keyword}
                placeholder="Search transaction or order"
                onChange={handleKeywordChange}
              />
            </span>
          </label>
        </div>

        <div className="course-management__status-bar">
          <div className="course-management__tabs">
            <button
              type="button"
              className={`course-management__tab${
                status === "" ? " is-active" : ""
              }`}
              aria-pressed={status === ""}
              onClick={() => handleStatusChange("")}
            >
              All
            </button>

            {statusOptions.map((statusOption) => {
              const selected = status === statusOption;

              return (
                <button
                  key={statusOption}
                  type="button"
                  className={`course-management__tab${
                    selected ? " is-active" : ""
                  }`}
                  aria-pressed={selected}
                  onClick={() => handleStatusChange(statusOption)}
                >
                  {formatLabel(statusOption)}
                </button>
              );
            })}
          </div>
          <span className="history-toolbar__count">
            {totalItems} {totalItems === 1 ? "record" : "records"}
          </span>
        </div>

        {loading ? (
          <div className="history-loading">Loading transactions...</div>
        ) : error ? (
          <div className="history-error">{error}</div>
        ) : items.length === 0 ? (
          <div className="history-empty">
            {hasFilters
              ? "No transactions match the selected filters."
              : "You have no payment records yet."}
          </div>
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
                  <th>
                    <span className="sr-only">Invoice action</span>
                  </th>
                </tr>
              </thead>

              <tbody>
                {items.map((transaction) => {
                  const isPaid =
                    String(transaction.status || "").toUpperCase() ===
                    "SUCCESS";

                  return (
                    <tr key={transaction.id}>
                      <td>
                        <strong>{transaction.invoiceNumber || "--"}</strong>

                        {transaction.orderId && (
                          <div className="transaction-page__meta">
                            order: {truncateId(transaction.orderId)}
                          </div>
                        )}
                      </td>

                      <td>{transaction.paymentGateway || "--"}</td>

                      <td>
                        {formatAmount(transaction.amount, transaction.currency)}
                      </td>

                      <td>
                        <StatusBadge status={transaction.status} />
                      </td>

                      <td>{formatDate(transaction.createdAt)}</td>

                      <td>{formatDate(transaction.paidAt)}</td>

                      <td className="transaction-page__action-cell">
                        {isPaid ? (
                          <button
                            type="button"
                            className="history-table__link transaction-page__action-btn"
                            onClick={() => setInvoiceTarget(transaction.id)}
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
    </div>
  );
}
