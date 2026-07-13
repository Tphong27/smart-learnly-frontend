import { useEffect, useMemo, useState } from "react";
import { useLocation, useNavigate, useParams } from "react-router-dom";
import { orderService, paymentStatusService } from "@/services";
import { Button, useToast } from "@/shared/components/ui";
import { PaymentInstructionCard } from "../components/PaymentInstructionCard";
import { CheckoutSummary } from "../components/CheckoutSummary";
import "../checkout.css";

const POLLING_INTERVAL_MS = 4000;

export function CheckoutPage() {
  const { orderId } = useParams();
  const location = useLocation();
  const navigate = useNavigate();
  const toast = useToast();

  const initialCheckout = location.state?.checkout ?? null;
  const expectedCourse = location.state?.expectedCourse ?? null;

  const [payment, setPayment] = useState(initialCheckout);
  const [loading, setLoading] = useState(!initialCheckout);
  const [error, setError] = useState(null);

  const isFinalStatus = useMemo(
    () => paymentStatusService.isFinal(payment?.status),
    [payment?.status],
  );

  useEffect(() => {
    let cancelled = false;

    async function loadOrder() {
      if (!orderId) return;

      setLoading(true);
      setError(null);

      try {
        const data = await orderService.getOrder(orderId);

        if (!cancelled) {
          setPayment(data);
        }
      } catch (err) {
        if (!cancelled) {
          const message = err?.message || "Could not load checkout order.";
          setError(message);
          toast.error(message);
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    }

    if (!initialCheckout) {
      loadOrder();
    }

    return () => {
      cancelled = true;
    };
  }, [orderId, initialCheckout, toast]);

  useEffect(() => {
    if (!orderId || isFinalStatus) {
      return undefined;
    }

    let cancelled = false;

    async function pollOrderStatus() {
      try {
        const orderPayment = await orderService.getOrder(orderId);
        const nextStatus = orderPayment.status;

        if (cancelled) return;

        setPayment((current) => ({
          ...current,
          ...orderPayment,
          status: nextStatus,
        }));

        if (paymentStatusService.isFinal(nextStatus)) {
          navigate(`/payment-result?orderId=${orderId}`, {
            replace: true,
            state: {
              orderId,
              transactionId: orderPayment.transactionId,
              status: nextStatus,
              payment: orderPayment,
            },
          });
        }
      } catch {
        // Không toast liên tục khi polling lỗi tạm thời.
      }
    }

    pollOrderStatus();

    const timer = window.setInterval(pollOrderStatus, POLLING_INTERVAL_MS);

    return () => {
      cancelled = true;
      window.clearInterval(timer);
    };
  }, [orderId, isFinalStatus, navigate]);

  async function handleCopy(value) {
    if (!value) return;

    try {
      await navigator.clipboard.writeText(value);
      toast.success("Copied.");
    } catch {
      toast.error("Could not copy.");
    }
  }

  if (loading) {
    return <div className="admin-loading">Loading checkout...</div>;
  }

  if (error || !payment) {
    return (
      <section className="checkout-page">
        <div className="admin-error">
          {error || "Checkout order not found."}
        </div>

        <Button to="/learning/courses">
          Back to Course Catalog
        </Button>
      </section>
    );
  }

  return (
    <section className="checkout-page">
      <header className="checkout-page__header">
        <div>
          <span className="checkout-page__eyebrow">Payment</span>
          <h1>Complete your checkout</h1>
          <p>Order {payment.orderCode || payment.orderId}</p>
        </div>
      </header>

      <div className="checkout-layout">
        <PaymentInstructionCard payment={payment} onCopy={handleCopy} />

        <CheckoutSummary payment={payment} expectedCourse={expectedCourse} />
      </div>

      <div className="checkout-warning">
        <strong>Important:</strong> Please transfer the exact amount and exact
        payment code. Partial or overpayment will not be automatically
        confirmed.
      </div>
    </section>
  );
}
