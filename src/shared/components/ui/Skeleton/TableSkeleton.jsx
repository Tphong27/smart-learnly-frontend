export function TableSkeleton({ rows = 5 }) {
  // CSS Inline dự phòng bắt buộc hiển thị kể cả khi Tailwind lỗi
  const fallbackStyles = {
    container: {
      width: "100%",
      border: "1px solid #e5e7eb",
      borderRadius: "12px",
      padding: "16px",
      backgroundColor: "#ffffff",
      boxShadow: "0 1px 3px rgba(0,0,0,0.05)",
      boxSizing: "border-box",
    },
    header: {
      height: "24px",
      backgroundColor: "#d1d5db",
      borderRadius: "4px",
      width: "25%",
      marginBottom: "24px",
    },
    row: {
      display: "flex",
      gap: "16px",
      alignItems: "center",
      borderBottom: "1px solid #f3f4f6",
      paddingBottom: "12px",
      marginTop: "16px",
    },
    col1: {
      height: "16px",
      backgroundColor: "#e5e7eb",
      borderRadius: "4px",
      width: "48px",
    },
    col2: {
      height: "16px",
      backgroundColor: "#e5e7eb",
      borderRadius: "4px",
      flex: 1,
    },
    col3: {
      height: "16px",
      backgroundColor: "#e5e7eb",
      borderRadius: "4px",
      width: "96px",
    },
    col4: {
      height: "16px",
      backgroundColor: "#e5e7eb",
      borderRadius: "4px",
      width: "64px",
    },
  };

  return (
    <div
      className="w-full border border-gray-200 rounded-xl p-4 bg-white shadow-sm animate-pulse"
      style={fallbackStyles.container}
    >
      {/* Thanh tiêu đề bảng */}
      <div
        className="h-6 bg-gray-200 rounded w-1/4 mb-6"
        style={fallbackStyles.header}
      ></div>

      {/* Khung các hàng trong bảng */}
      <div className="space-y-4">
        {Array.from({ length: rows }).map((_, index) => (
          <div
            key={index}
            className="flex space-x-4 items-center border-b border-gray-100 pb-3"
            style={fallbackStyles.row}
          >
            <div
              className="h-4 bg-gray-200 rounded w-12"
              style={fallbackStyles.col1}
            ></div>
            <div
              className="h-4 bg-gray-200 rounded flex-1"
              style={fallbackStyles.col2}
            ></div>
            <div
              className="h-4 bg-gray-200 rounded w-24"
              style={fallbackStyles.col3}
            ></div>
            <div
              className="h-4 bg-gray-200 rounded w-16"
              style={fallbackStyles.col4}
            ></div>
          </div>
        ))}
      </div>

      <style>{`
        @keyframes pulse {
          0%, 100% { opacity: 1; }
          50% { opacity: .4; }
        }
        .animate-pulse { animation: pulse 1.5s cubic-bezier(0.4, 0, 0.6, 1) infinite; }
      `}</style>
    </div>
  );
}
