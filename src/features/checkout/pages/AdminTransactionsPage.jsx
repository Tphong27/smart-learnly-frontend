import React, { useState, useEffect } from "react";
import { adminMonitoringService } from "../../../services/admin-monitoring.service";
import { DataTable } from "../../../shared/components/DataTable";
import { PaymentStatusBadge } from "../../checkout/components/PaymentStatusBadge";

export default function AdminTransactionsPage() {
  const [transactions, setTransactions] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchTransactions = async () => {
      try {
        setLoading(true);
        const data = await adminMonitoringService.getTransactions();
        // 🟩 ĐÃ SỬA: Đảm bảo dữ liệu đưa vào DataTable 100% là Mảng
        if (data?.content && Array.isArray(data.content)) {
          setTransactions(data.content);
        } else if (Array.isArray(data)) {
          setTransactions(data);
        } else {
          setTransactions([]);
        }
      } catch (error) {
        console.error("Error fetching transactions list:", error);
        setTransactions([]); // 🟩 ĐÃ SỬA: Reset về mảng rỗng nếu API lỗi
      } finally {
        setLoading(false);
      }
    };
    fetchTransactions();
  }, []);

  const formatCurrency = (amount) => {
    return new Intl.NumberFormat("vi-VN", {
      style: "currency",
      currency: "VND",
    }).format(amount || 0);
  };

  const columns = [
    { header: "Transaction Code", accessorKey: "paymentCode" },
    {
      header: "Amount",
      accessorKey: "amount",
      render: (row) => formatCurrency(row.amount),
    },
    { header: "Gateway", accessorKey: "paymentGateway" },
    {
      header: "Status",
      accessorKey: "status",
      render: (row) => <PaymentStatusBadge status={row?.status} />, // Thêm an toàn
    },
    {
      header: "Invoice Number",
      accessorKey: "invoiceNumber",
      render: (row) =>
        row?.invoiceNumber ? (
          <strong style={{ color: "#0056b3" }}>{row.invoiceNumber}</strong>
        ) : (
          <em>Not issued</em>
        ),
    },
    {
      header: "Created At",
      accessorKey: "createdAt",
      render: (row) =>
        row?.createdAt
          ? new Date(row.createdAt).toLocaleString("en-US")
          : "N/A", // Thêm check null
    },
  ];

  return (
    <div className="admin-page-container">
      <h2>Transaction Management</h2>
      <DataTable
        columns={columns}
        data={transactions}
        loading={loading}
        emptyMessage="No transactions found."
      />
    </div>
  );
}
