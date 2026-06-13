# Auth Flow Implementation (F1.3 - F1.9)

## Decisions (chốt với user 2026-06-08)

| Vấn đề | Quyết định |
|---|---|
| Họ/Tên | 1 field fullName (theo backend) |
| Verify token / Reset token | 1 input token + nút Submit. Auto-submit nếu URL có ?token=xxx |
| Refresh token | HttpOnly cookie slp_refresh_token + axios withCredentials. Bỏ refreshToken khỏi localStorage |
| Profile | Form fullName, avatarUrl (paste URL), phoneNumber, bio. PATCH /auth/profile |
| Google login | Dùng @react-oauth/google. VITE_GOOGLE_CLIENT_ID=__SET_ME__ trong .env.example |
| Password rule | uppercase + lowercase + number + special + len>=8. Show real-time checklist |
| Scope | Triển khai full F1.3 -> F1.9 |

## Backend contract (đã verify)

Base URL: http://localhost:8080/api/v1

- POST /auth/register {fullName, email, password, confirmPassword}
- POST /auth/login {email, password} -> {accessToken, tokenType, expiresIn, user}; refresh ở Set-Cookie
- POST /auth/google {idToken} -> giống login
- POST /auth/refresh (cookie) -> giống login
- POST /auth/logout (cookie)
- POST /auth/forgot-password {email}
- POST /auth/reset-password {token, newPassword, confirmPassword}
- POST /auth/verify-email {token}
- POST /auth/resend-verification {email}
- GET /auth/profile -> UserProfileResponse
- PATCH /auth/profile {fullName?, avatarUrl?, phoneNumber?, bio?}
- POST /auth/change-password {currentPassword, newPassword, confirmPassword}

UserProfileResponse: {id, email, fullName, avatarUrl, phoneNumber, bio, role, status, emailVerified, ...}

## Mismatch với spec gốc (đã giải quyết)

- Spec firstName+lastName -> backend fullName (đổi spec FE)
- Spec OTP 6 ô -> backend token string (đổi spec FE thành 1 input)
- Spec localStorage refresh -> backend cookie (đổi spec FE)
- Spec /users/me -> backend /auth/profile (đổi spec FE)
- Spec PUT /users/me/password -> backend POST /auth/change-password (đổi spec FE)
- Spec avatar upload file -> backend chỉ nhận avatarUrl string

## Files mới



## Files sửa

- .env.example -> base URL /api/v1 + VITE_GOOGLE_CLIENT_ID
- package.json -> thêm @react-oauth/google
- src/services/api-client.js -> withCredentials, bỏ refreshToken localStorage
- src/services/auth.service.js -> đổi path /auth/profile, /auth/change-password
- src/app/AppShell.jsx -> wire pages thật + thêm route forgot/reset/verify
- src/app/providers/AppProviders.jsx -> wrap GoogleOAuthProvider

## TODO

- [x] Lưu plan
- [ ] Cập nhật .env.example + npm install
- [ ] Sửa api-client + auth.service.js
- [ ] Tạo schemas + AuthCard + PasswordStrengthChecklist
- [ ] F1.3 RegisterPage
- [ ] F1.4 LoginPage (email + Google)
- [ ] F1.5 ForgotPasswordPage + ResetPasswordPage
- [ ] F1.6 VerifyEmailPage
- [ ] F1.9 ProfilePage (2 tabs)
- [ ] Wire routes + GoogleOAuthProvider
- [ ] Build + lint
