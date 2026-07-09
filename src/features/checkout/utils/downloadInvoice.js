import { formatAmount, formatDateTime } from "@/shared/utils/formatters";
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

export function downloadInvoice({ invoice, order, purchasedItem, onBlocked }) {
  if (!invoice) return;

  const invoiceNumber = invoice.invoiceNumber || "invoice";
  const safeInvoiceNumber = createSafeFileName(invoiceNumber);

  const courseName = purchasedItem?.itemTitle || "Purchased course";
  const className = purchasedItem?.className || "--";
  const itemAmount = purchasedItem?.finalAmount ?? invoice.amount;
  const discountAmount = purchasedItem?.discountAmount ?? 0;

  const html = `
    <!doctype html>
    <html>
      <head>
        <title>${escapeHtml(invoiceNumber)}</title>
        <style>
          ${downloadInvoiceCss}
        </style>
      </head>

      <body>
        <div class="page">
          <div class="topbar"></div>

          <main class="invoice">
            <header class="header">
              <div class="brand-wrap">
                <div class="logo">SL</div>

                <div>
                  <div class="brand">Smart Learnly Platform</div>
                  <div class="brand-subtitle">Online learning platform</div>
                </div>
              </div>

              <div class="invoice-title">
                <h1>INVOICE</h1>

                <div class="invoice-number">
                  ${escapeHtml(invoice.invoiceNumber)}
                </div>

                <div class="status-pill">
                  ${escapeHtml(invoice.status)}
                </div>
              </div>
            </header>

            <section class="summary-band">

              <div class="meta-card">
                <div class="meta-row">
                  <span class="label">Order code</span>
                  <span class="value">${escapeHtml(order?.orderCode)}</span>
                </div>

                <div class="meta-row">
                  <span class="label">Invoice date</span>
                  <span class="value">${escapeHtml(formatDisplayDate(invoice.paidAt))}</span>
                </div>

                <div class="meta-row">
                  <span class="label">Currency</span>
                  <span class="value">${escapeHtml(invoice.currency)}</span>
                </div>
              </div>
            </section>

            <section class="section">
              <h2 class="section-title">Billing information</h2>

              <div class="party-grid">
                <div class="party-card">
                  <div class="party-name">Smart Learnly Platform</div>
                  <div class="info-line">Seller / Platform provider</div>
                  <div class="info-line">Hanoi, Vietnam</div>
                  <div class="info-line">support@smartlearnly.dev</div>
                </div>

                <div class="party-card">
                  <div class="party-name">
                    ${escapeHtml(invoice.traineeName)}
                  </div>

                  <div class="info-line">Buyer / Trainee</div>

                  <div class="info-line">
                    Email: ${escapeHtml(invoice.traineeEmail)}
                  </div>

                  <div class="info-line">
                    Phone: ${escapeHtml(invoice.traineePhoneNumber)}
                  </div>
                </div>
              </div>
            </section>

            <section class="section">
              <h2 class="section-title">Purchased class</h2>

              <table class="item-table">
                <thead>
                  <tr>
                    <th>Description</th>
                    <th class="text-right">Amount</th>
                  </tr>
                </thead>

                <tbody>
                  <tr>
                    <td>
                      <div class="item-title">
                        ${escapeHtml(courseName)}
                      </div>

                      <div class="item-subtitle">
                        Class: ${escapeHtml(className)}
                      </div>

                      <div class="item-subtitle">
                        Transaction ID: ${escapeHtml(invoice.transactionId)}
                      </div>
                    </td>

                    <td class="text-right amount">
                      ${escapeHtml(formatAmount(itemAmount, invoice.currency))}
                    </td>
                  </tr>
                </tbody>
              </table>

              <div class="totals">
                <div class="total-row">
                  <span>Subtotal</span>
                  <strong>${escapeHtml(formatAmount(itemAmount, invoice.currency))}</strong>
                </div>

                <div class="total-row">
                  <span>Discount</span>
                  <strong>${escapeHtml(formatAmount(discountAmount, invoice.currency))}</strong>
                </div>

                <div class="total-row final">
                  <span>Total paid</span>
                  <span>${escapeHtml(formatAmount(invoice.amount, invoice.currency))}</span>
                </div>
              </div>
            </section>

            <div class="note">
              This document confirms a successful payment for the listed Smart Learnly Platform class.
              It is generated from transaction and order data in the system.
            </div>

            <footer class="footer">
              Thank you for learning with Smart Learnly Platform.
            </footer>
          </main>
        </div>

        <script>
          window.onload = function () {
            document.title = "${escapeHtml(safeInvoiceNumber)}";
            window.print();
          };
          window.onafterprint = function () {
            window.close();
          };
        </script>
      </body>
    </html>
  `;

  const printWindow = window.open("", "_blank", "width=900,height=700");

  if (!printWindow) {
    onBlocked?.();
    return;
  }

  printWindow.document.open();
  printWindow.document.write(html);
  printWindow.document.close();
}