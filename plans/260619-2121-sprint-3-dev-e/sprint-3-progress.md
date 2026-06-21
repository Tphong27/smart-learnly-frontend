# Sprint 3 - Dev E (Frontend) - Trạng thái dở dang

> Cập nhật: 2026-06-21 20:05 (Asia/Saigon)
> Branch: `long`
> Build: `npm run build` PASS sau merge main
> Lint changed files: PASS

## Phạm vi Sprint 3 (Dev E)

| Task | Mô tả | Phụ thuộc BE | Trạng thái |
|---|---|---|---|
| F3.4 | Đăng ký khoá học miễn phí (1 click) | B3.7 `POST /enrollments/free` | DONE |
| F3.5 | Trang lịch sử đăng ký + huỷ đơn | B3.8 `GET /enrollments`, `POST /orders/{id}/cancel` | PARTIAL (chưa có cancel UI - chờ BE thêm orderId vào response) |
| F3.6 | Trang lịch sử giao dịch + invoice | B3.9 `GET /transactions`, `GET /transactions/{id}/invoice` | DONE |
| F3.7 | Notification thanh toán thành công/thất bại | B3.5 webhook + `GET /orders/{id}` (polling) | DONE (đã đối chiếu BE enum `PENDING`, `PAID`, `EXPIRED`, `CANCELLED`) |

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

### Routes (`src/app/routes/traineeRoutes.jsx`)

Sau merge main, trainee routes chuyển về namespace `/learning`. Đã thêm:
```jsx
{ path: "enrollments", element: <MyEnrollmentsPage /> }
{ path: "transactions", element: <MyTransactionsPage /> }
{ path: "/cart", element: <CartPage /> }
{ path: "/checkout/:orderId", element: <CheckoutPage /> }
{ path: "/checkout/:orderId/result", element: <CheckoutPaymentResultPage /> }
{ path: "/payment-result", element: <PaymentResultPage /> }
```

Đã giữ alias cũ để không gãy link đã tạo trước đó:
```jsx
/my-courses -> /learning/courses
/my-enrollments -> /learning/enrollments
/my-transactions -> /learning/transactions
```

### Sidebar (`src/app/layouts/Sidebar.jsx`)

Thêm 2 menu cho TRAINEE theo namespace `/learning`:
```js
{ label: 'My Enrollments', path: '/learning/enrollments', icon: History, roles: [ROLES.TRAINEE] }
{ label: 'My Transactions', path: '/learning/transactions', icon: Receipt, roles: [ROLES.TRAINEE] }
```

Đã sửa import trùng `Receipt` sau merge.

---

## Việc CÒN PHẢI LÀM

### 1. F3.5 - Cancel order UI
**Blocker:** chờ Dev A bổ sung `orderId` vào `EnrollmentHistoryResponse` (hoặc tạo endpoint mới `GET /api/v1/orders` của trainee).

**Plan khi BE sẵn:**
- Thêm cột "Order" + nút "Cancel" trong `MyEnrollmentsPage.jsx`
- Disabled nếu enrollment status là `cancelled` / `refunded` / không có orderId (free enrollment)
- Confirm modal trước khi gọi `orderService.cancel(orderId)`
- Sau khi cancel: refresh page hoặc patch state in-place

### 2. F3.7 - Wire từ checkout
Hiện `/payment-result` đứng độc lập và nhận `orderId` từ query string. Khi Dev F xong trang Checkout (F3.2), cần redirect sang `/payment-result?orderId={orderId}` sau khi tạo order nếu dùng result page canonical của Dev E.

### 3. Trang `/learning/courses`
`FreeEnrollButton` đã redirect về `/learning/courses`, alias `/my-courses` vẫn còn để tương thích link cũ.

---

## Cách test thủ công khi BE up

1. **F3.4:** vào `/courses/{slug}` của 1 course free (`price = 0` hoặc null). Click "Enroll for free". Kỳ vọng: toast success + redirect `/learning/courses`.
2. **F3.5:** vào `/learning/enrollments`. Kỳ vọng: list enrollments của trainee, status badge đúng màu.
3. **F3.6:** vào `/learning/transactions`. Click "View invoice" ở transaction status SUCCESS. Modal hiện invoice + order items.
4. **F3.7:** truy cập trực tiếp `/payment-result?orderId=<UUID>`. Kỳ vọng: hiện loading, polling, đổi sang success/failed khi BE update.

---

## Câu hỏi chưa giải quyết

1. **`EnrollmentHistoryResponse` có nên trả `orderId`?** — Cần để FE wire feature cancel từ enrollment history. Đề xuất với Dev A.
2. **Free enrollment khi user chưa login** — hiện tại `FreeEnrollButton` redirect `/login` nhưng không lưu intent. Có cần lưu `redirect=/courses/{slug}` để sau login quay lại tự enroll không?
3. **Polling timeout (3 phút)** đủ không? BE checkout expiration đang là `PT30M`; có thể cần tăng `MAX_POLL_ATTEMPTS` hoặc đổi sang trang "check later".
4. **Format invoice in/download PDF** — F3.6 hiện chỉ render modal. Dev F task `Invoice PDF generation` (Sprint 3) có blob PDF endpoint không? Nếu có, cần thêm nút "Download PDF" ở `InvoiceModal`.
