import React, { useState, useEffect } from "react";
import { adminMonitoringService } from "../../../services/admin-monitoring.service";
import { DataTable } from "../../../shared/components/DataTable";
import { PaymentStatusBadge } from "../../checkout/components/PaymentStatusBadge";
import { formatAmount, formatDate } from "@/shared/utils/formatters";
import { DEFAULT_PAGE_SIZE } from "@/shared/constants/pagination";

export default function AdminOrdersPage() {
    const [orders, setOrders] = useState([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const fetchOrders = async () => {
            try {
                setLoading(true);
                const data = await adminMonitoringService.getOrders();
                const rawOrders = Array.isArray(data?.items)
                    ? data.items
                    : Array.isArray(data?.content)
                      ? data.content
                      : Array.isArray(data)
                        ? data
                        : [];
                setOrders(
                    rawOrders.map((order) => ({
                        ...order,
                        amount: order?.amount ?? order?.totalAmount,
                    })),
                );
            } catch (error) {
                console.error("Error fetching orders list:", error);
                setOrders([]); // 🟩 ĐÃ SỬA: Lỗi phát là gán mảng rỗng luôn cho an toàn
            } finally {
                setLoading(false);
            }
        };
        fetchOrders();
    }, []);

    const formatCurrency = (amount) => {
        return formatAmount(amount, "VND");
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
            render: (row) => <PaymentStatusBadge status={row?.status} />, // Thêm dấu ? phòng hờ
        },
        {
            header: "Created At",
            accessorKey: "createdAt",
            render: (row) =>
                row?.createdAt ? formatDate(row.createdAt) : "N/A",
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
