import { buildInvoiceHtml } from "./buildInvoiceHtml";

/** Mở hóa đơn trong cửa sổ in của trình duyệt. */
export function downloadInvoice({
  invoice,
  order,
  purchasedItem,
  onBlocked,
}) {
  if (!invoice) {
    return;
  }

  const printWindow = window.open(
    "",
    "_blank",
    "width=900,height=700",
  );

  if (!printWindow) {
    onBlocked?.();
    return;
  }

  const html = buildInvoiceHtml({
    invoice,
    order,
    purchasedItem,
  });

  printWindow.document.open();
  printWindow.document.write(html);
  printWindow.document.close();
}