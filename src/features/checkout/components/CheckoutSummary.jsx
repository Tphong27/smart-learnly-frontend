import { formatAmount, toNumber } from "@/shared/utils/formatters";

/** Hiển thị tóm tắt sản phẩm, order, cổng thanh toán và tổng tiền cần trả. */
export function CheckoutSummary({ payment, expectedCourse }) {
  const paymentAmount = toNumber(payment?.amount, 0);

  const itemType = expectedCourse?.itemType || "COURSE";
  const isClassCheckout = itemType === "CLASS";

  return (
    <aside className="checkout-summary">
      <h2>Checkout summary</h2>

      <div className="checkout-summary__row">
        <span>Product type</span>

        <strong>{isClassCheckout ? "Offline Class" : "Online Course"}</strong>
      </div>

      {expectedCourse?.title && (
        <div className="checkout-summary__row">
          <span>Course</span>

          <strong>{expectedCourse.title}</strong>
        </div>
      )}

      {isClassCheckout && expectedCourse?.className && (
        <div className="checkout-summary__row">
          <span>Class</span>

          <strong>{expectedCourse.className}</strong>
        </div>
      )}

      <div className="checkout-summary__row">
        <span>Order</span>

        <strong>{payment?.orderCode || payment?.orderId || "-"}</strong>
      </div>

      <div className="checkout-summary__row">
        <span>Gateway</span>

        <strong>{payment?.paymentGateway || "SEPAY"}</strong>
      </div>

      <div className="checkout-summary__row checkout-summary__row--total">
        <span>Payment amount</span>

        <strong>{formatAmount(paymentAmount, payment?.currency)}</strong>
      </div>
    </aside>
  );
}
