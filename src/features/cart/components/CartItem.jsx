import { Trash2 } from "lucide-react";

function formatMoney(value, currency = "VND") {
  const amount = Number(value || 0);

  if (amount <= 0) {
    return "Free";
  }

  return new Intl.NumberFormat("vi-VN", {
    style: "currency",
    currency,
    maximumFractionDigits: 0,
  }).format(amount);
}

export function CartItem({ item, removing, onRemove }) {
  const title = item?.courseTitle ?? item?.itemTitle ?? item?.title ?? "Course";

  const className = item?.className ?? item?.classTitle ?? null;

  const amount =
    item?.finalAmount ??
    item?.amount ??
    item?.totalAmount ??
    item?.price ??
    item?.unitPrice ??
    item?.course?.price ??
    0;

  return (
    <article className="cart-item">
      <div className="cart-item__main">
        <h3>{title}</h3>

        {className && <p className="cart-item__class">Class: {className}</p>}

        {item?.courseCode && <small>Course code: {item.courseCode}</small>}
      </div>

      <div className="cart-item__side">
        <strong>{formatMoney(amount, item?.currency)}</strong>

        <button
          type="button"
          className="button button--ghost button--sm"
          onClick={() => onRemove(item.id)}
          disabled={removing}
        >
          <Trash2 size={16} />
          {removing ? "Removing..." : "Remove"}
        </button>
      </div>
    </article>
  );
}
