import { X } from "lucide-react";
import { useEffect, useState } from "react";
import Pagination from "@/shared/components/Pagination";
import { StatusBadge } from "@/shared/components/status";
import {
  Button,
  EmptyState,
  ErrorState,
  FilterBar,
  LoadingState,
  SearchInput,
  Table,
  Tabs,
  useToast,
} from "@/shared/components/ui";
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

/** Hiển thị lịch sử giao dịch cá nhân hoặc danh sách giao dịch dành cho quản trị viên. */
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

    /** Tải các trạng thái giao dịch để tạo bộ lọc động từ backend. */
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

    /** Tải trang giao dịch hiện tại theo từ khóa và trạng thái đã chọn. */
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

  /** Đưa giao diện về trạng thái đang tải trước khi thay đổi tham số truy vấn. */
  function prepareRequestChange() {
    setLoading(true);
    setError("");
  }

  /** Cập nhật từ khóa tìm kiếm và quay về trang đầu tiên. */
  function handleKeywordChange(nextKeyword) {
    prepareRequestChange();
    setKeyword(nextKeyword);
    setPageRequest(0);
  }

  /** Cập nhật một bộ lọc và quay về trang đầu tiên. */
  function changeFilter(setter, value) {
    prepareRequestChange();
    setter(value);
    setPageRequest(0);
  }

  /** Xóa toàn bộ điều kiện tìm kiếm và lọc giao dịch. */
  function clearFilters() {
    prepareRequestChange();
    setKeyword("");
    setStatus("");
    setPageRequest(0);
  }

  /** Chuyển sang trang dữ liệu được người dùng chọn. */
  function handlePageChange(nextPage) {
    prepareRequestChange();
    setPageRequest(nextPage - 1);
  }

  /** Thay đổi số giao dịch trên mỗi trang và quay về trang đầu tiên. */
  function handlePageSizeChange(nextSize) {
    prepareRequestChange();
    setPageSize(nextSize);
    setPageRequest(0);
  }

  return (
    <main className="transaction-page">
      <header className="transaction-page__header">
        <div>
          <h1 id="transaction-list-title">
            {isManagement ? "Transaction management" : "Transaction history"}
          </h1>
        </div>
      </header>

      <section
        className="transaction-page__panel"
        aria-labelledby="transaction-list-title"
      >
        <FilterBar
          className="transaction-page__filters"
          ariaLabel="Transaction filters"
          search={
            <SearchInput
              value={keyword}
              placeholder="Search transaction or order"
              ariaLabel="Search transactions"
              onChange={handleKeywordChange}
            />
          }
          actions={
            <Button
              variant="ghost"
              leftIcon={<X size={15} aria-hidden="true" />}
              disabled={!hasFilters}
              onClick={clearFilters}
            >
              Reset
            </Button>
          }
        />

        <div className="transaction-page__status-bar">
          <Tabs
            className="transaction-page__tabs"
            ariaLabel="Filter transactions by status"
            value={status}
            items={[
              { value: "", label: "All" },
              ...filterOptions.statuses.map((statusOption) => ({
                value: statusOption,
                label: formatLabel(statusOption),
              })),
            ]}
            onChange={(nextStatus) => changeFilter(setStatus, nextStatus)}
          />

          <p className="transaction-page__result-count" aria-live="polite">
            <strong>{totalItems}</strong>{" "}
            {totalItems === 1 ? "transaction" : "transactions"}
          </p>
        </div>

        <div className="transaction-page__content">
          {loading ? (
            <LoadingState label="Loading transactions…" />
          ) : error ? (
            <ErrorState
              title="Could not load transactions"
              description={error}
            />
          ) : items.length === 0 ? (
            <EmptyState
              title={
                hasFilters
                  ? "No transactions match these filters"
                  : isManagement
                    ? "No payment transactions yet"
                    : "You have no payment records yet"
              }
              description={
                hasFilters
                  ? "Try another keyword or reset the current filters."
                  : undefined
              }
              action={
                hasFilters ? (
                  <Button variant="secondary" onClick={clearFilters}>
                    Reset filters
                  </Button>
                ) : undefined
              }
            />
          ) : (
            <Table
              className="transaction-page__table-wrap"
              tableClassName="history-table"
              ariaLabel="Transaction list"
            >
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
                        <td data-label="Transaction / Order">
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

                        <td data-label="Gateway">
                          {transaction.paymentGateway
                            ? formatLabel(transaction.paymentGateway)
                            : "--"}
                        </td>

                        <td data-label="Amount">
                          {formatAmount(
                            transaction.amount,
                            transaction.currency,
                          )}
                        </td>

                        <td data-label="Status">
                          <StatusBadge status={transaction.status} />
                        </td>

                        <td data-label="Created">
                          {formatDateTime(transaction.createdAt)}
                        </td>

                        <td data-label="Paid at">
                          {transaction.paidAt
                            ? formatDateTime(transaction.paidAt)
                            : "--"}
                        </td>

                        <td
                          className="transaction-page__action-cell"
                          data-label="Invoice"
                        >
                          {isPaid && transaction.invoiceNumber ? (
                            <Button
                              variant="link"
                              size="sm"
                              className="transaction-page__action-btn"
                              onClick={() => setInvoiceTarget(transaction.id)}
                            >
                              View details
                            </Button>
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
            </Table>
          )}
        </div>

        {!error && totalItems > 0 ? (
          <Pagination
            page={page + 1}
            totalPages={totalPages}
            totalItems={totalItems}
            size={pageSize}
            disabled={loading}
            onPageChange={handlePageChange}
            onSizeChange={handlePageSizeChange}
          />
        ) : null}
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
