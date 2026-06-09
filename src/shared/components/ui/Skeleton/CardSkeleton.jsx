export function CardSkeleton() {
  return (
    <div
      style={{
        border: "1px solid #e5e7eb",
        borderRadius: "12px",
        padding: "20px",
        maxWidth: "360px",
        width: "100%",
        backgroundColor: "#ffffff",
        boxShadow:
          "0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06)",
        margin: "0 auto",
      }}
    >
      {/* Container chính tạo khoảng cách đều giữa các phần tử */}
      <div style={{ display: "flex", flexDirection: "column", gap: "20px" }}>
        {/* 1. Khung ảnh của khóa học (Màu xám đậm rõ ràng) */}
        <div
          style={{
            borderRadius: "8px",
            backgroundColor: "#d1d5db", // Đổi sang gray-300 đậm hơn để rõ nét
            height: "180px",
            width: "100%",
            animation: "custom-pulse 1.8s infinite ease-in-out",
          }}
        ></div>

        {/* Khối nội dung văn bản */}
        <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
          {/* 2. Khung tiêu đề khóa học */}
          <div
            style={{
              height: "18px",
              backgroundColor: "#d1d5db",
              borderRadius: "4px",
              width: "75%",
              animation: "custom-pulse 1.8s infinite ease-in-out",
            }}
          ></div>

          {/* Khối mô tả ngắn */}
          <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
            {/* 3. Dòng mô tả 1 */}
            <div
              style={{
                height: "12px",
                backgroundColor: "#e5e7eb", // gray-200 nhạt hơn tiêu đề một chút
                borderRadius: "4px",
                width: "100%",
                animation: "custom-pulse 1.8s infinite ease-in-out",
              }}
            ></div>

            {/* 4. Dòng mô tả 2 */}
            <div
              style={{
                height: "12px",
                backgroundColor: "#e5e7eb",
                borderRadius: "4px",
                width: "85%",
                animation: "custom-pulse 1.8s infinite ease-in-out",
              }}
            ></div>
          </div>

          {/* 5. Khung nút bấm dưới cùng */}
          <div
            style={{
              height: "38px",
              backgroundColor: "#d1d5db",
              borderRadius: "8px",
              width: "100%",
              marginTop: "8px",
              animation: "custom-pulse 1.8s infinite ease-in-out",
            }}
          ></div>
        </div>
      </div>

      {/* Nhúng đoạn Keyframes CSS thuần để điều khiển độ mờ chuyển động mượt mà */}
      <style>{`
        @keyframes custom-pulse {
          0%, 100% {
            opacity: 1;
          }
          50% {
            opacity: 0.5; /* Không giảm sâu quá xuống 0 để tránh bị mờ biến mất hẳn */
          }
        }
      `}</style>
    </div>
  );
}
