import { Search, X } from "lucide-react";
import { useEffect, useState } from "react";
import Pagination from "@/shared/components/Pagination";
import { StatusBadge } from "@/shared/components/status";
import { useToast } from "@/shared/components/ui";
import { useDebouncedValue } from "@/shared/hooks/useDebouncedValue";
import { DEFAULT_PAGE_SIZE } from "@/shared/constants/pagination";
import {
  formatAmount,
  formatDateTime,
  formatLabel,
  truncateId,
} from "@/shared/utils/formatters";
import { checkoutMonitoringService } from "../services/checkoutMonitoringService";
import { InvoiceDetailModal } from "../components/InvoiceDetailModal";
import "../checkout.css";

const EMPTY_FILTER_OPTIONS = {
  statuses: [],
};

export function TransactionsPage({ mode = "personal" }) {
  const toast = useToast();

  const isManagement = mode === "management";

  const [keyword, setKeyword] = useState("");
  const [status, setStatus] = useState("");

  const normalizedKeyword = keyword.trim();
  const debouncedKeyword = useDebouncedValue(normalizedKeyword);

  const [filterOptions, setFilterOptions] = useState(EMPTY_FILTER_OPTIONS);

  const [items, setItems] = useState([]);
  const [page, setPage] = useState(0);
  const [pageRequest, setPageRequest] = useState(0);
  const [pageSize, setPageSize] = useState(DEFAULT_PAGE_SIZE);
  const [totalPages, setTotalPages] = useState(0);
  const [totalItems, setTotalItems] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [invoiceTarget, setInvoiceTarget] = useState(null);

  const hasFilters = Boolean(normalizedKeyword || status);

  useEffect(() => {
    let cancelled = false;

    async function loadFilterOptions() {
      try {
        const data =
          await checkoutMonitoringService.getTransactionFilterOptions();

        if (cancelled) {
          return;
        }

        setFilterOptions({
          statuses: Array.isArray(data?.statuses) ? data.statuses : [],
        });
      } catch (requestError) {
        if (cancelled) {
          return;
        }

        setFilterOptions(EMPTY_FILTER_OPTIONS);

        if (!isManagement) {
          toast.error(
            requestError?.message ||
              "Could not load transaction filter options.",
          );
        } else {
          console.error(
            "Error fetching transaction filter options:",
            requestError,
          );
        }
      }
    }

    loadFilterOptions();

    return () => {
      cancelled = true;
    };
  }, [isManagement, toast]);

  useEffect(() => {
    if (normalizedKeyword !== debouncedKeyword) {
      return undefined;
    }

    let cancelled = false;

    async function loadTransactions() {
      try {
        const requestParams = {
          page: pageRequest,
          size: pageSize,
          keyword: debouncedKeyword || undefined,
          status: status || undefined,
        };

        const data =
          await checkoutMonitoringService.getTransactions(requestParams);

        if (cancelled) {
          return;
        }

        const transactions = Array.isArray(data?.items)
          ? data.items
          : Array.isArray(data?.content)
            ? data.content
            : Array.isArray(data)
              ? data
              : [];

        setItems(transactions);
        setPage(data?.page ?? data?.number ?? pageRequest);
        setTotalPages(data?.totalPages ?? 0);
        setTotalItems(
          data?.totalItems ?? data?.totalElements ?? transactions.length,
        );
        setError("");
      } catch (requestError) {
        if (cancelled) {
          return;
        }

        const message = requestError?.message || "Could not load transactions.";

        setItems([]);
        setTotalPages(0);
        setTotalItems(0);
        setError(message);

        if (!isManagement) {
          toast.error(message);
        } else {
          console.error("Error fetching transactions:", requestError);
        }
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
  }, [
    debouncedKeyword,
    isManagement,
    normalizedKeyword,
    pageRequest,
    pageSize,
    status,
    toast,
  ]);

  function prepareRequestChange() {
    setLoading(true);
    setError("");
  }

  function handleKeywordChange(event) {
    prepareRequestChange();
    setKeyword(event.target.value);
    setPageRequest(0);
  }

  function changeFilter(setter, value) {
    prepareRequestChange();
    setter(value);
    setPageRequest(0);
  }

  function clearFilters() {
    prepareRequestChange();
    setKeyword("");
    setStatus("");
    setPageRequest(0);
  }

  function handlePageChange(nextPage) {
    prepareRequestChange();
    setPageRequest(nextPage - 1);
  }

  function handlePageSizeChange(nextSize) {
    prepareRequestChange();
    setPageSize(nextSize);
    setPageRequest(0);
  }

  return (
    <main className="transaction-page">
      <header className="transaction-page__header">
        <div>
          <h1>
            {isManagement ? "Transaction management" : "Transaction history"}
          </h1>
        </div>
      </header>

      <section
        className="transaction-page__panel"
        aria-labelledby="transaction-list-title"
      >
        <div className="course-management__filters">
          <label className="course-management__field course-management__field--search">
            <span className="course-management__control course-management__search">
              <Search size={18} aria-hidden="true" />

              <input
                type="search"
                value={keyword}
                placeholder={"Search transaction or order"}
                aria-label="Search transactions"
                onChange={handleKeywordChange}
              />
            </span>
          </label>

          <button
            type="button"
            className="course-management__clear"
            disabled={!hasFilters}
            onClick={clearFilters}
          >
            <X size={15} aria-hidden="true" />
            Reset
          </button>
        </div>

        <div className="course-management__status-bar">
          <div
            className="course-management__tabs"
            aria-label="Filter transactions by status"
          >
            <button
              type="button"
              className={`course-management__tab${
                status === "" ? " is-active" : ""
              }`}
              aria-pressed={status === ""}
              onClick={() => changeFilter(setStatus, "")}
            >
              All
            </button>

            {filterOptions.statuses.map((statusOption) => {
              const selected = status === statusOption;

              return (
                <button
                  key={statusOption}
                  type="button"
                  className={`course-management__tab${
                    selected ? " is-active" : ""
                  }`}
                  aria-pressed={selected}
                  onClick={() => changeFilter(setStatus, statusOption)}
                >
                  {formatLabel(statusOption)}
                </button>
              );
            })}
          </div>

          <p className="course-management__result-count" aria-live="polite">
            <strong>{totalItems}</strong>
            {totalItems === 1 ? "transaction" : "transactions"}
          </p>
        </div>

        <div
          className="course-management__table-wrap"
          role="region"
          aria-label="Transaction list"
        >
          {loading ? (
            <div className="course-management__state">
              Loading transactions…
            </div>
          ) : error ? (
            <div className="course-management__state course-management__state--error">
              <strong>Could not load transactions</strong>
              <span>{error}</span>
            </div>
          ) : items.length === 0 ? (
            <div className="course-management__state">
              <strong>
                {hasFilters
                  ? "No transactions match these filters"
                  : isManagement
                    ? "No payment transactions yet"
                    : "You have no payment records yet"}
              </strong>

              {hasFilters && (
                <span>Try another keyword or reset the current filters.</span>
              )}
            </div>
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

                    const primaryReference =
                      transaction.invoiceNumber || truncateId(transaction.id);

                    return (
                      <tr key={transaction.id}>
                        <td>
                          <strong
                            title={
                              isManagement
                                ? transaction.id
                                : transaction.invoiceNumber || undefined
                            }
                          >
                            {primaryReference}
                          </strong>

                          {transaction.orderId && (
                            <div className="transaction-page__meta">
                              order: {truncateId(transaction.orderId)}
                            </div>
                          )}
                        </td>

                        <td>
                          {transaction.paymentGateway
                            ? formatLabel(transaction.paymentGateway)
                            : "--"}
                        </td>

                        <td>
                          {formatAmount(
                            transaction.amount,
                            transaction.currency,
                          )}
                        </td>

                        <td>
                          <StatusBadge status={transaction.status} />
                        </td>

                        <td>{formatDateTime(transaction.createdAt)}</td>

                        <td>
                          {transaction.paidAt
                            ? formatDateTime(transaction.paidAt)
                            : "--"}
                        </td>

                        <td className="transaction-page__action-cell">
                          {isPaid && transaction.invoiceNumber ? (
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
        </div>

        <Pagination
          page={page + 1}
          totalPages={totalPages}
          totalItems={totalItems}
          size={pageSize}
          disabled={loading}
          onPageChange={handlePageChange}
          onSizeChange={handlePageSizeChange}
        />
      </section>

      <InvoiceDetailModal
        open={Boolean(invoiceTarget)}
        transactionId={invoiceTarget}
        onClose={() => setInvoiceTarget(null)}
      />
    </main>
  );
}

export default TransactionsPage;
