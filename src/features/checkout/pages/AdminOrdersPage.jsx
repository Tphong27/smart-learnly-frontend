import React, { useState, useEffect } from "react";
import { adminMonitoringService } from "../../../services/admin-monitoring.service";
import { DataTable } from "../../../shared/components/DataTable";
// Temporarily importing from checkout until moved to shared
import { PaymentStatusBadge } from "../../checkout/components/PaymentStatusBadge";

export default function AdminOrdersPage() {
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchOrders = async () => {
      try {
        setLoading(true);
        const data = await adminMonitoringService.getOrders();
        setOrders(data.content || data || []);
      } catch (error) {
        console.error("Error fetching orders list:", error);
      } finally {
        setLoading(false);
      }
    };
    fetchOrders();
  }, []);

  const formatCurrency = (amount) => {
    return new Intl.NumberFormat("vi-VN", {
      style: "currency",
      currency: "VND",
    }).format(amount || 0);
  };

  // DataTable column configuration
  const columns = [
    { header: "Order Code", accessorKey: "orderCode" },
    {
      header: "Amount",
      accessorKey: "amount",
      render: (row) => formatCurrency(row.amount),
    },
    {
      header: "Status",
      accessorKey: "status",
      render: (row) => <PaymentStatusBadge status={row.status} />,
    },
    {
      header: "Created At",
      accessorKey: "createdAt",
      render: (row) => new Date(row.createdAt).toLocaleDateString("en-US"),
    },
  ];

  return (
    <div className="admin-page-container">
      <h2>Order Management</h2>
      <DataTable
        columns={columns}
        data={orders}
        loading={loading}
        emptyMessage="No orders found."
      />
    </div>
  );
}
