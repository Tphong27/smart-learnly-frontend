import "./Pagination.css";

const Pagination = ({
  page = 1,
  totalPages = 1,
  totalItems = 0,
  size = 10,
  onPageChange,
}) => {
  if (totalPages <= 1) return null;

  const handlePrev = () => {
    if (page > 1) onPageChange(page - 1);
  };

  const handleNext = () => {
    if (page < totalPages) onPageChange(page + 1);
  };

  const renderPageNumbers = () => {
    const pages = [];
    for (let i = 1; i <= totalPages; i++) {
      // Thuật toán rút gọn trang nếu tổng số trang quá lớn (tùy chọn mở rộng sau)
      pages.push(
        <button
          key={i}
          className={`page-number-btn ${page === i ? "active" : ""}`}
          onClick={() => onPageChange(i)}
        >
          {i}
        </button>,
      );
    }
    return pages;
  };

  // Tính toán vị trí hiển thị bản ghi (Ví dụ: Showing 1-10 of 45 items)
  const startItem = (page - 1) * size + 1;
  const endItem = Math.min(page * size, totalItems);

  return (
    <div className="modern-pagination-container">
      <div className="pagination-info">
        Showing <span className="semibold">{startItem}</span> to{" "}
        <span className="semibold">{endItem}</span> of{" "}
        <span className="semibold">{totalItems}</span> entries
      </div>
      <div className="pagination-controls">
        <button className="btn-nav" onClick={handlePrev} disabled={page === 1}>
          &larr; Prev
        </button>
        <div className="page-numbers">{renderPageNumbers()}</div>
        <button
          className="btn-nav"
          onClick={handleNext}
          disabled={page === totalPages}
        >
          Next &rarr;
        </button>
      </div>
    </div>
  );
};

export default Pagination;
