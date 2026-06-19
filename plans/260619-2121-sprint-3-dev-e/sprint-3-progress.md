# Sprint 3 - Dev E (Frontend) - Trạng thái dở dang

> Cập nhật: 2026-06-19 21:21 (Asia/Saigon)
> Branch: `long`
> Build: `npm run build` PASS

## Phạm vi Sprint 3 (Dev E)

| Task | Mô tả | Phụ thuộc BE | Trạng thái |
|---|---|---|---|
| F3.4 | Đăng ký khoá học miễn phí (1 click) | B3.7 `POST /enrollments/free` | DONE |
| F3.5 | Trang lịch sử đăng ký + huỷ đơn | B3.8 `GET /enrollments`, `POST /orders/{id}/cancel` | PARTIAL (chưa có cancel UI - chờ BE thêm orderId vào response) |
| F3.6 | Trang lịch sử giao dịch + invoice | B3.9 `GET /transactions`, `GET /transactions/{id}/invoice` | DONE |
| F3.7 | Notification thanh toán thành công/thất bại | B3.5 webhook + `GET /orders/{id}` (polling) | DONE (giả định status enum, cần Dev C confirm) |

---

## Files đã tạo / chỉnh sửa

### Services mới
| File | Mô tả |
|---|---|
| `src/services/enrollment.service.js` | `enrollFree(courseId)`, `getMyCourses()`, `getHistory({page,size})`, `getStatusHistory(enrollmentId)` |
| `src/services/order.service.js` | `checkout(cartId)`, `get(orderId)`, `cancel(orderId)` |
| `src/services/transaction.service.js` | `list({page,size})`, `getInvoice(transactionId)` |
| `src/services/index.js` | Export 3 services trên (UPDATED) |

Toàn bộ services đều dùng pattern `unwrap(response)` giống `auth.service.js` - lấy `response.data` hoặc fallback `response`.

### F3.4 - Đăng ký miễn phí

| File | Mô tả |
|---|---|
| `src/features/enrollment/components/FreeEnrollButton.jsx` | Component dùng chung. Props: `courseId`, `label`, `onEnrolled`, `redirectTo`, `size`. Tự check token, hiện toast theo `alreadyEnrolled` / `reactivated` / mặc định, redirect `/my-courses`. |
| `src/features/enrollment/index.js` | Export `FreeEnrollButton` (UPDATED) |
| `src/features/course/pages/CourseDetailPage.jsx` | Thêm `<FreeEnrollButton courseId={course.id} />` vào sidecard khi `isFree` (price <= 0 hoặc null). (UPDATED) |

### F3.5 - Lịch sử đăng ký

| File | Mô tả |
|---|---|
| `src/features/enrollment/pages/MyEnrollmentsPage.jsx` | Table pagination (PAGE_SIZE=20), cột: Course title/slug, Status badge, Enrolled at, Last update, link "View course". |
| `src/features/enrollment/pages/history-page.css` | CSS share cho cả MyEnrollments + MyTransactions (`.history-page`, `.history-card`, `.history-table`, `.history-status--{active|completed|cancelled|...}`, `.history-pagination`). |
| `src/features/enrollment/index.js` | Thêm export `MyEnrollmentsPage` (UPDATED) |

**CHƯA HOÀN THIỆN:** Nút "Cancel order" tại danh sách enrollment. BE response `EnrollmentHistoryResponse` không trả `orderId` nên FE không biết order nào để cancel. Cần xin Dev A bổ sung field `orderId` (nullable, null cho free enrollments) vào response, hoặc chuyển flow cancel sang trang Cart/Checkout của Dev D.

### F3.6 - Lịch sử giao dịch + invoice

| File | Mô tả |
|---|---|
| `src/features/payment/pages/MyTransactionsPage.jsx` | Table transactions: Invoice number, Order ID short, Gateway, Amount (currency-aware), Status, Created, Paid at. Khi `status=SUCCESS` hiện link "View invoice" mở `InvoiceModal`. |
| `src/features/payment/pages/MyTransactionsPage.jsx` (`InvoiceModal`) | Modal show invoice + lazy-load `orderService.get(orderId)` để render order items. Reuse CSS `history-page.css` từ enrollment. |
| `src/features/payment/index.js` | Export `MyTransactionsPage`, `PaymentResultPage` (UPDATED) |

### F3.7 - Payment result

| File | Mô tả |
|---|---|
| `src/features/payment/pages/PaymentResultPage.jsx` | Polling `orderService.get(orderId)` mỗi 4s, max 45 lần (~3 phút). 3 outcome: success / failed / pending / timed-out. Toast tự động khi chuyển sang terminal. |
| `src/features/payment/pages/payment-result.css` | Card style theo outcome (success xanh, failed đỏ, pending vàng + pulse animation). |

Constants quan trọng (cần align với BE):
```js
const POLL_INTERVAL_MS = 4000
const MAX_POLL_ATTEMPTS = 45
const TERMINAL_STATUSES = new Set(['PAID', 'CANCELLED', 'EXPIRED', 'FAILED'])

function resolveOutcome(order) {
  const status = (order?.status || '').toUpperCase()
  if (status === 'PAID') return 'success'
  if (status === 'CANCELLED' || status === 'EXPIRED' || status === 'FAILED') return 'failed'
  return 'pending'
}
```

### Routes (`src/app/AppShell.jsx`)

Đã thêm 3 route trong block `ProtectedRoute` + `AppLayout`:
```jsx
<Route path="/my-enrollments" element={<MyEnrollmentsPage />} />
<Route path="/my-transactions" element={<MyTransactionsPage />} />
<Route path="/payment-result" element={<PaymentResultPage />} />
```

Imports đã thêm:
```jsx
import { MyEnrollmentsPage } from '../features/enrollment'
import { MyTransactionsPage, PaymentResultPage } from '../features/payment'
```

### Sidebar (`src/app/layouts/Sidebar.jsx`)

Thêm 2 menu cho TRAINEE:
```js
{ label: 'My Enrollments', path: '/my-enrollments', icon: History, roles: [ROLES.TRAINEE] }
{ label: 'My Transactions', path: '/my-transactions', icon: Receipt, roles: [ROLES.TRAINEE] }
```

Icons mới import từ `lucide-react`: `History`, `Receipt`.

---

## Việc CÒN PHẢI LÀM

### 1. F3.5 - Cancel order UI
**Blocker:** chờ Dev A bổ sung `orderId` vào `EnrollmentHistoryResponse` (hoặc tạo endpoint mới `GET /api/v1/orders` của trainee).

**Plan khi BE sẵn:**
- Thêm cột "Order" + nút "Cancel" trong `MyEnrollmentsPage.jsx`
- Disabled nếu enrollment status là `cancelled` / `refunded` / không có orderId (free enrollment)
- Confirm modal trước khi gọi `orderService.cancel(orderId)`
- Sau khi cancel: refresh page hoặc patch state in-place

### 2. F3.7 - Confirm enum order status với Dev C
Hiện đang **giả định** các giá trị: `PAID`, `CANCELLED`, `EXPIRED`, `FAILED`, `PENDING`.
**Action:** Đọc `OrderStatus` enum ở `E:/KLTN/back-end/smart-learnly-backend/src/main/java/com/smartlearnly/backend/commerce/entity/` và update `TERMINAL_STATUSES` + `resolveOutcome()` trong `PaymentResultPage.jsx` nếu khác.

### 3. F3.7 - Wire từ checkout
Hiện `/payment-result` đứng độc lập. Khi Dev F xong trang Checkout (F3.2), cần redirect sang `/payment-result?orderId={orderId}` sau khi tạo order.

### 4. Trang `/my-courses`
Đang là `PlaceholderPage`. `FreeEnrollButton` đang redirect tới đó - sẽ thấy placeholder cho tới khi Dev D làm xong (F4.1 ở Sprint 4 mới làm trang này).

---

## Cách test thủ công khi BE up

1. **F3.4:** vào `/courses/{slug}` của 1 course free (`price = 0` hoặc null). Click "Enroll for free". Kỳ vọng: toast success + redirect `/my-courses`.
2. **F3.5:** vào `/my-enrollments`. Kỳ vọng: list enrollments của trainee, status badge đúng màu.
3. **F3.6:** vào `/my-transactions`. Click "View invoice" ở transaction status SUCCESS. Modal hiện invoice + order items.
4. **F3.7:** truy cập trực tiếp `/payment-result?orderId=<UUID>`. Kỳ vọng: hiện loading, polling, đổi sang success/failed khi BE update.

---

## Câu hỏi chưa giải quyết

1. **`OrderResponse.status` enum chính xác là gì?** — `PAID` hay `SUCCESS`? `CANCELLED` hay `CANCELED`? Đọc entity ở BE để confirm.
2. **`EnrollmentHistoryResponse` có nên trả `orderId`?** — Cần để FE wire feature cancel. Đề xuất với Dev A.
3. **Free enrollment khi user chưa login** — hiện tại `FreeEnrollButton` redirect `/login` nhưng không lưu intent. Có cần lưu `redirect=/courses/{slug}` để sau login quay lại tự enroll không?
4. **Polling timeout (3 phút)** đủ không? SePay timeout default thường 15 phút. Có thể cần tăng `MAX_POLL_ATTEMPTS` hoặc đổi sang trang "check later".
5. **Format invoice in/download PDF** — F3.6 hiện chỉ render modal. Dev F task `Invoice PDF generation` (Sprint 3) có blob PDF endpoint không? Nếu có, cần thêm nút "Download PDF" ở `InvoiceModal`.
