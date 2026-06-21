---
title: "Dev E post-merge frontend fixes"
description: "Fix post-merge Vite export breakage and validate Dev E sprint 1-3 frontend flows against backend contracts."
status: pending
priority: P1
effort: 3h
branch: long
tags: [frontend, dev-e, vite, enrollment, payment]
created: 2026-06-21
---

# Dev E post-merge frontend fixes

## Scope
- Work context: `E:/KLTN/front-end/smart-learnly-frontend`
- Backend read-only reference: `E:/KLTN/back-end/smart-learnly-backend`
- Docs reference: `E:/KLTN/docs/team-assignment.md`, `E:/KLTN/docs/sprint-plan-mvp.md`
- Only modify Dev E frontend scope and shared service exports needed to unblock Dev E pages.
- Do not change backend. KISS/YAGNI/DRY.

## Findings
- `src/services/index.js` exports `orderService` twice. Remove duplicate export.
- `src/services/order.service.js` has a broken merge: `orderService` starts at line 7, `cancel(orderId)` is unfinished, then normalization functions and a second `orderService` are redeclared. This likely causes Vite duplicate export/syntax errors.
- Backend contracts confirmed:
  - `POST /api/v1/orders/checkout`
  - `GET /api/v1/orders/{orderId}`
  - `POST /api/v1/orders/{orderId}/cancel`
  - `POST /api/v1/enrollments/free`
  - `GET /api/v1/enrollments`
  - `GET /api/v1/enrollments/{enrollmentId}/status-history`
  - `GET /api/v1/transactions`
  - `GET /api/v1/transactions/{id}/invoice`
- Potential contract gap: frontend uses `GET /payments/{transactionId}/status`; backend search only showed `/api/v1/payments/webhooks`. Prefer order polling via `GET /orders/{orderId}` unless a payment-status controller exists.
- Routing gap: Dev E pages `MyEnrollmentsPage`, `MyTransactionsPage`, payment result routes appear implemented but not wired in `AppShell.jsx`/`traineeRoutes.jsx`; links to `/my-transactions` likely 404.

## TODO for Dev E

### 1. Fix Vite export breakage
- [ ] In `src/services/index.js`, keep exactly one `export { orderService } from './order.service'`.
- [ ] In `src/services/order.service.js`, collapse to one `orderService` object.
- [ ] Preserve one `unwrap`, `normalizeCheckout`, `normalizeOrderPayment`.
- [ ] Keep backwards-compatible aliases because existing pages call both styles:
  - `checkout(cartId)`
  - `get(orderId)` and `getOrder(orderId)`
  - `cancel(orderId)` and `cancelOrder(orderId)`
- [ ] Ensure `checkout()` returns normalized checkout payload and `get/getOrder()` returns normalized order/payment payload.

### 2. Validate Dev E sprint 1 auth/profile after merge
- [ ] Smoke check register/login/forgot/reset/verify/profile imports still compile.
- [ ] Do not refactor auth unless compile/runtime break found.
- [ ] Confirm `api-client.js` base URL remains `/api/v1` and auth refresh behavior not broken by service export cleanup.

### 3. Validate Dev E sprint 2 owned pages
- [ ] Smoke check preview lessons route `/courses/:courseId/preview` and admin preview route compile.
- [ ] Do not touch Dev D/F course/admin CRUD except if needed to consume fixed `orderService` from course detail buy-now flow.

### 4. Finish Dev E sprint 3 frontend integration
- [ ] Verify free enrollment button posts `{ courseId }` to `/enrollments/free` and handles already-enrolled/reactivated responses safely.
- [ ] Wire trainee routes for enrollment and transaction history under protected trainee/app layout. Prefer paths matching existing links or update links consistently:
  - `/my-enrollments` or `/learning/enrollments`
  - `/my-transactions` or `/learning/transactions`
- [ ] Fix transaction page order calls to use supported aliases after service cleanup.
- [ ] Remove duplicate/unused payment result implementation if routing chooses checkout result only, or wire only one canonical result path. Avoid two competing result pages.
- [ ] If `paymentStatusService.getStatus()` has no backend endpoint, stop using it in active flow; poll `orderService.getOrder(orderId)` instead.
- [ ] Confirm cancel order uses `POST /orders/{orderId}/cancel`.

### 5. Validation commands
Run from `E:/KLTN/front-end/smart-learnly-frontend`:
- [ ] `npm run build`
- [ ] `npm run lint`
- [ ] Optional focused grep checks:
  - `grep -R "export { orderService }" src/services/index.js`
  - `grep -R "orderService\." src/features src/services`
- [ ] Manual smoke in browser with backend running:
  - Login as trainee.
  - Enroll free course.
  - Checkout paid course and open checkout result.
  - Open enrollment history.
  - Open transaction history, invoice modal, cancel pending order.

## Success criteria
- Vite build no duplicate export/syntax error.
- Dev E sprint 1-3 pages compile and protected routes resolve.
- Frontend service methods match backend routes above.
- No backend changes, no broad refactor, no mock-only fixes.

## Unresolved questions
- Is `/payments/{transactionId}/status` implemented elsewhere or planned? Current backend scan did not confirm it.
- Preferred final URL convention: root `/my-transactions`/`/my-enrollments` or nested `/learning/transactions`/`/learning/enrollments`?
