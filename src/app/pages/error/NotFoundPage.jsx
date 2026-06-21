import { useNavigate } from "react-router-dom";

export function NotFoundPage() {
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
          color: "#1d4ed8",
          margin: "0",
          letterSpacing: "0.1em", // Đã sửa lại thành letterSpacing cho đúng chuẩn React
        }}
      >
        404
      </h1>
      <div
        style={{
          backgroundColor: "#f97316",
          color: "white",
          padding: "4px 12px",
          fontSize: "14px",
          borderRadius: "4px",
          fontWeight: "bold",
          marginTop: "-10px",
          textTransform: "uppercase",
        }}
      >
        Page Not Found
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
        Sorry, we couldn't find the page you're looking for.
      </p>
      <button
        onClick={() => navigate("/")}
        style={{
          marginTop: "24px",
          padding: "12px 28px",
          fontSize: "14px",
          fontWeight: "600",
          color: "white",
          backgroundColor: "#2563eb",
          border: "none",
          borderRadius: "8px",
          cursor: "pointer",
          boxShadow: "0 2px 4px rgba(0,0,0,0.1)",
          transition: "all 0.2s",
        }}
        onMouseOver={(e) => (e.target.style.backgroundColor = "#1d4ed8")}
        onMouseOut={(e) => (e.target.style.backgroundColor = "#2563eb")}
      >
        Back to Home
      </button>
    </div>
  );
}
