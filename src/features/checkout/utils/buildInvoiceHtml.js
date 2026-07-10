import { formatAmount, formatDateTime } from "@/shared/utils/formatters";
import invoiceTemplate from "./download-invoice.html?raw";
import downloadInvoiceCss from "./download-invoice.css?raw";

function escapeHtml(value) {
  return String(value ?? "--")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

function createSafeFileName(value) {
  return String(value || "invoice").replace(/[^a-zA-Z0-9-_]/g, "_");
}

function formatDisplayDate(value) {
  return value ? formatDateTime(value) : "--";
}

function renderTemplate(template, values) {
  return Object.entries(values).reduce(
    (html, [key, value]) => html.replaceAll(`{{${key}}}`, String(value ?? "")),
    template,
  );
}

export function buildInvoiceHtml({ invoice, order, purchasedItem }) {
  const invoiceNumber = invoice.invoiceNumber || "invoice";
  const currency = invoice.currency || "VND";
  const courseName = purchasedItem?.itemTitle || "Purchased course";
  const className = purchasedItem?.className || "--";
  const itemAmount = purchasedItem?.finalAmount ?? invoice.amount ?? 0;
  const discountAmount = purchasedItem?.discountAmount ?? 0;
  const totalPaid = invoice.amount ?? 0;

  return renderTemplate(invoiceTemplate, {
    INVOICE_CSS: downloadInvoiceCss,
    DOCUMENT_TITLE: escapeHtml(createSafeFileName(invoiceNumber)),
    INVOICE_NUMBER: escapeHtml(invoiceNumber),
    INVOICE_STATUS: escapeHtml(invoice.status),
    ORDER_CODE: escapeHtml(order?.orderCode),
    INVOICE_DATE: escapeHtml(formatDisplayDate(invoice.paidAt)),
    CURRENCY: escapeHtml(currency),
    TRAINEE_NAME: escapeHtml(invoice.traineeName),
    TRAINEE_EMAIL: escapeHtml(invoice.traineeEmail),
    TRAINEE_PHONE: escapeHtml(invoice.traineePhoneNumber),
    COURSE_NAME: escapeHtml(courseName),
    CLASS_NAME: escapeHtml(className),
    TRANSACTION_ID: escapeHtml(invoice.transactionId),
    ITEM_AMOUNT: escapeHtml(formatAmount(itemAmount, currency)),
    SUBTOTAL: escapeHtml(formatAmount(itemAmount, currency)),
    DISCOUNT: escapeHtml(formatAmount(discountAmount, currency)),
    TOTAL_PAID: escapeHtml(formatAmount(totalPaid, currency)),
  });
}
