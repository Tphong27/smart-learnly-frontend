import { useLocation, useParams } from "react-router-dom";
import { Button } from "@/shared/components/ui";
import { PaymentInstructionCard } from "../components/PaymentInstructionCard";
import { CheckoutSummary } from "../components/CheckoutSummary";
import { useCheckoutPayment } from "../hooks/useCheckoutPayment";
import "../checkout.css";

/**
 * Hiển thị màn hình hoàn tất checkout gồm QR, thông tin chuyển khoản và tóm tắt đơn.
 * Việc tải và polling order được giao cho useCheckoutPayment để page chỉ điều phối UI.
 */
export function CheckoutPage() {
  const { orderId } = useParams();
  const location = useLocation();
  const initialCheckout = location.state?.checkout ?? null;
  const expectedCourse = location.state?.expectedCourse ?? null;
  const { payment, isLoading, error } = useCheckoutPayment(orderId, initialCheckout);

  if (isLoading) {
    return (
      <section className="checkout-page">
        <div className="checkout-page__state" role="status" aria-live="polite">
          Loading checkout...
        </div>
      </section>
    );
  }

  if (error || !payment) {
    return (
      <section className="checkout-page">
        <div
          className="checkout-page__state checkout-page__state--error"
          role="alert"
        >
          {error || "Checkout order not found."}
        </div>

        <div>
          <Button to="/learning/opening-schedule">Back to Opening Schedule</Button>
        </div>
      </section>
    );
  }

  return (
    <section className="checkout-page">
      <header className="checkout-page__header">
        <div>
          <h1>Complete your checkout</h1>
        </div>
      </header>

      <div className="checkout-layout">
        <PaymentInstructionCard payment={payment} />

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
