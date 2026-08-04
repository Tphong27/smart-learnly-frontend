/** Chuyển dữ liệu API thành number và dùng giá trị dự phòng khi dữ liệu không hợp lệ. */
function toNumber(value, fallback = 0) {
  if (
    value === null ||
    value === undefined ||
    value === ""
  ) {
    return fallback;
  }

  const numberValue = Number(value);

  return Number.isNaN(numberValue)
    ? fallback
    : numberValue;
}

/** Định dạng giá checkout; giá không dương được hiển thị là Free. */
function formatMoney(
  value,
  currency = "VND",
) {
  const amount = toNumber(value, 0);

  if (amount <= 0) {
    return "Free";
  }

  return new Intl.NumberFormat("vi-VN", {
    style: "currency",
    currency,
    maximumFractionDigits: 0,
  }).format(amount);
}

/** Định dạng ngày theo ngôn ngữ Việt Nam và giữ nguyên dữ liệu nếu ngày không hợp lệ. */
function formatDate(value) {
  if (!value) {
    return "-";
  }

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return value;
  }

  return date.toLocaleDateString("vi-VN");
}

/** Hiển thị tóm tắt sản phẩm, order, cổng thanh toán và tổng tiền cần trả. */
export function CheckoutSummary({
  payment,
  expectedCourse,
}) {
  const paymentAmount = toNumber(
    payment?.amount,
    0,
  );

  const itemType =
    expectedCourse?.itemType || "COURSE";

  const isClassCheckout =
    itemType === "CLASS";

  return (
    <aside className="checkout-summary">
      <h2>Checkout summary</h2>

      <div className="checkout-summary__row">
        <span>Product type</span>

        <strong>
          {isClassCheckout
            ? "Offline Class"
            : "Online Course"}
        </strong>
      </div>

      {expectedCourse?.title && (
        <div className="checkout-summary__row">
          <span>Course</span>

          <strong>
            {expectedCourse.title}
          </strong>
        </div>
      )}

      {isClassCheckout &&
        expectedCourse?.className && (
          <div className="checkout-summary__row">
            <span>Class</span>

            <strong>
              {expectedCourse.className}
            </strong>
          </div>
        )}

      {isClassCheckout &&
        expectedCourse?.trainerName && (
          <div className="checkout-summary__row">
            <span>Trainer</span>

            <strong>
              {expectedCourse.trainerName}
            </strong>
          </div>
        )}

      {isClassCheckout &&
        expectedCourse?.startDate && (
          <div className="checkout-summary__row">
            <span>Opening date</span>

            <strong>
              {formatDate(
                expectedCourse.startDate,
              )}
            </strong>
          </div>
        )}

      {isClassCheckout &&
        expectedCourse
          ?.scheduleDescription && (
          <div className="checkout-summary__row">
            <span>Schedule</span>

            <strong>
              {
                expectedCourse
                  .scheduleDescription
              }
            </strong>
          </div>
        )}

      <div className="checkout-summary__row">
        <span>Order</span>

        <strong>
          {payment?.orderCode ||
            payment?.orderId ||
            "-"}
        </strong>
      </div>

      <div className="checkout-summary__row">
        <span>Gateway</span>

        <strong>
          {payment?.paymentGateway ||
            "SEPAY"}
        </strong>
      </div>

      <div className="checkout-summary__row checkout-summary__row--total">
        <span>Payment amount</span>

        <strong>
          {formatMoney(
            paymentAmount,
            payment?.currency,
          )}
        </strong>
      </div>
    </aside>
  );
}
