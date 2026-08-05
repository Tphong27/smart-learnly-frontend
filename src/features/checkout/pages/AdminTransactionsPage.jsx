import { Search, X } from "lucide-react";
import { useEffect, useState } from "react";
import { checkoutMonitoringService } from "../services/checkoutMonitoringService";
import Pagination from "@/shared/components/Pagination";
import { StatusBadge } from "@/shared/components/status";
import { useDebouncedValue } from "@/shared/hooks/useDebouncedValue";
import { DEFAULT_PAGE_SIZE } from "@/shared/constants/pagination";
import {
  formatAmount,
  formatDateTime,
  formatLabel,
  truncateId,
} from "@/shared/utils/formatters";
import { InvoiceDetailModal } from "../components/InvoiceDetailModal";
import "../../enrollment/pages/history-page.css";
import "../checkout.css";
import "@/features/course/course-admin.css";
import "@/features/admin/courses/pages/AdminCoursesPage.css";

export default function AdminTransactionsPage() {
  const [keyword, setKeyword] = useState("");
  const normalizedKeyword = keyword.trim();
  const debouncedKeyword = useDebouncedValue(normalizedKeyword);

  const [status, setStatus] = useState("");
  const [paymentGateway, setPaymentGateway] = useState("");
  const [currency, setCurrency] = useState("");

  const [filterOptions, setFilterOptions] = useState({
    statuses: [],
    paymentGateways: [],
    currencies: [],
  });
  const [filterOptionsLoading, setFilterOptionsLoading] = useState(true);

  const [items, setItems] = useState([]);
  const [page, setPage] = useState(0);
  const [pageRequest, setPageRequest] = useState(0);
  const [pageSize, setPageSize] = useState(DEFAULT_PAGE_SIZE);
  const [totalPages, setTotalPages] = useState(0);
  const [totalItems, setTotalItems] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [invoiceTarget, setInvoiceTarget] = useState(null);

  useEffect(() => {
    let cancelled = false;

    async function loadFilterOptions() {
      try {
        const data = await checkoutMonitoringService.getTransactionFilterOptions();

        if (cancelled) {
          return;
        }

        setFilterOptions({
          statuses: Array.isArray(data?.statuses) ? data.statuses : [],
          paymentGateways: Array.isArray(data?.paymentGateways)
            ? data.paymentGateways
            : [],
          currencies: Array.isArray(data?.currencies) ? data.currencies : [],
        });
      } catch (requestError) {
        if (!cancelled) {
          console.error(
            "Error fetching transaction filter options:",
            requestError,
          );

          setFilterOptions({
            statuses: [],
            paymentGateways: [],
            currencies: [],
          });
        }
      } finally {
        if (!cancelled) {
          setFilterOptionsLoading(false);
        }
      }
    }

    loadFilterOptions();

    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    if (normalizedKeyword !== debouncedKeyword) {
      return undefined;
    }

    let cancelled = false;

    async function loadTransactions() {
      setLoading(true);
      setError("");

      try {
        const requestParams = {
          page: pageRequest,
          size: pageSize,
        };

        if (debouncedKeyword) {
          requestParams.keyword = debouncedKeyword;
        }

        if (status) {
          requestParams.status = status;
        }

        if (paymentGateway) {
          requestParams.paymentGateway = paymentGateway;
        }

        if (currency) {
          requestParams.currency = currency;
        }

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
      } catch (requestError) {
        if (cancelled) {
          return;
        }

        console.error("Error fetching transactions list:", requestError);

        setItems([]);
        setTotalPages(0);
        setTotalItems(0);
        setError(requestError?.message || "Could not load transactions.");
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
    currency,
    debouncedKeyword,
    normalizedKeyword,
    pageRequest,
    pageSize,
    paymentGateway,
    status,
  ]);
  function changeFilter(setter, value) {
    setter(value);
    setPageRequest(0);
  }

  function handleKeywordChange(event) {
    setKeyword(event.target.value);
    setPageRequest(0);
  }

  function clearFilters() {
    setKeyword("");
    setStatus("");
    setPaymentGateway("");
    setCurrency("");
    setPageRequest(0);
  }

  const hasFilters = Boolean(
    normalizedKeyword || status || paymentGateway || currency,
  );

  return (
    <main className="sl-cm-page admin-page course-management-page transaction-management-page">
      <header className="sl-cm-header course-management__header">
        <div>
          <h1>Transaction management</h1>
        </div>
      </header>

      <section
        className="course-management__panel"
        aria-labelledby="transaction-list-title"
      >
        <h2 id="transaction-list-title" className="sr-only">
          Payment transactions
        </h2>

        <div className="course-management__filters">
          <label className="course-management__field course-management__field--search">
            <span className="course-management__field-label">Search</span>

            <span className="course-management__control course-management__search">
              <Search size={18} aria-hidden="true" />

              <input
                type="search"
                placeholder="Search transaction, order, or invoice"
                value={keyword}
                onChange={handleKeywordChange}
              />
            </span>
          </label>

          <label className="course-management__field">
            <span className="course-management__field-label">Gateway</span>

            <span className="course-management__control course-management__select">
              <select
                value={paymentGateway}
                disabled={filterOptionsLoading}
                onChange={(event) =>
                  changeFilter(setPaymentGateway, event.target.value)
                }
              >
                <option value="">All gateways</option>

                {filterOptions.paymentGateways.map((gateway) => (
                  <option key={gateway} value={gateway}>
                    {formatLabel(gateway)}
                  </option>
                ))}
              </select>
            </span>
          </label>

          <label className="course-management__field">
            <span className="course-management__field-label">Currency</span>

            <span className="course-management__control course-management__select">
              <select
                value={currency}
                disabled={filterOptionsLoading}
                onChange={(event) =>
                  changeFilter(setCurrency, event.target.value)
                }
              >
                <option value="">All currencies</option>

                {filterOptions.currencies.map((currencyOption) => (
                  <option key={currencyOption} value={currencyOption}>
                    {currencyOption}
                  </option>
                ))}
              </select>
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
            <strong>{totalItems}</strong>{" "}
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
              <strong>No transactions match these filters</strong>
              <span>Try another keyword or clear the current filters.</span>
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
                      <span className="sr-only">Invoice</span>
                    </th>
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

                        <td>
                          {tx.paymentGateway
                            ? formatLabel(tx.paymentGateway)
                            : "--"}
                        </td>

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
        </div>

        <Pagination
          page={page + 1}
          totalPages={totalPages}
          totalItems={totalItems}
          size={pageSize}
          disabled={loading}
          ariaLabel="Transaction pagination"
          onPageChange={(nextPage) => {
            setPageRequest(nextPage - 1);
          }}
          onSizeChange={(nextSize) => {
            setPageRequest(0);
            setPageSize(nextSize);
          }}
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
