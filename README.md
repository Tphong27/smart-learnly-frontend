# Smart Learnly Frontend

React and Vite frontend for Smart Learnly Platform.

## Local setup

Create a local `.env.local` when custom values are needed:

```text
VITE_API_BASE_URL=http://localhost:8080/api/v1
VITE_GOOGLE_CLIENT_ID=your-google-web-client-id.apps.googleusercontent.com
```

`VITE_GOOGLE_CLIENT_ID` is a public browser client identifier, not a secret. It
must match the backend `GOOGLE_CLIENT_ID`.

## Auth assumptions

- Access tokens are held in memory only.
- The backend owns the rotating HttpOnly refresh cookie.
- API requests always include credentials.
- A `401` triggers one refresh attempt and retries the original request once.
- Auth responses use the backend `ApiResponse` envelope and validation errors
  use the `errors: [{ field, message }]` shape.

## Commands

```powershell
npm run dev
npm run lint
npm test
npm run build
```
