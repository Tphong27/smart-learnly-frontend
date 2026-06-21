import { useNavigate } from "react-router-dom";

export function ForbiddenPage() {
  const navigate = useNavigate();
  return (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        minHeight: "80vh",
        backgroundColor: "#f9fafb",
        fontFamily: "sans-serif",
        padding: "20px",
        borderRadius: "16px",
        boxShadow: "0 4px 6px -1px rgba(0,0,0,0.1)",
      }}
    >
      <h1
        style={{
          fontSize: "96px",
          fontWeight: "900",
          color: "#dc2626",
          margin: "0",
          tracking: "widest", // Lưu ý nhỏ: React style không hỗ trợ 'tracking', bạn có thể đổi thành 'letterSpacing: "0.1em"' nếu muốn chữ thưa ra nhé.
        }}
      >
        403
      </h1>
      <div
        style={{
          backgroundColor: "#1f2937",
          color: "white",
          padding: "4px 12px",
          fontSize: "14px",
          borderRadius: "4px",
          fontWeight: "bold",
          marginTop: "-10px",
          textTransform: "uppercase",
        }}
      >
        Access Denied
      </div>
      <p
        style={{
          color: "#4b5563",
          fontSize: "18px",
          marginTop: "20px",
          textAlign: "center",
          maxWidth: "400px",
          lineHeight: "1.5",
        }}
      >
        You do not have permission to access this area!
      </p>
      <button
        onClick={() => navigate(-1)}
        style={{
          marginTop: "24px",
          padding: "12px 28px",
          fontSize: "14px",
          fontWeight: "600",
          color: "white",
          backgroundColor: "#1f2937",
          border: "none",
          borderRadius: "8px",
          cursor: "pointer",
          boxShadow: "0 2px 4px rgba(0,0,0,0.1)",
          transition: "all 0.2s",
        }}
        onMouseOver={(e) => (e.target.style.backgroundColor = "#111827")}
        onMouseOut={(e) => (e.target.style.backgroundColor = "#1f2937")}
      >
        Go Back
      </button>
    </div>
  );
}
