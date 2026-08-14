# React + Vite

## Google sign-in (local development)

Smart Learnly loads the effective Google OAuth Client ID from
`GET /api/v1/auth/google/config`. `VITE_GOOGLE_CLIENT_ID` is only the fallback
when the backend is unavailable or has no Google Client ID configured. Keep
both values identical to avoid testing a different OAuth client during a
backend outage.

Create or select an OAuth 2.0 Client ID whose application type is **Web
application**, then add these exact entries under **Authorized JavaScript
origins**:

```text
http://localhost
http://localhost:5173
```

For a deployed frontend, also add its exact origin, including the scheme and
port when the port is non-default. Do not add a path such as `/login` and do
not use a wildcard. The current Google Identity Services callback flow does
not need `/login/oauth2/code/google` as an authorized redirect URI.

After changing the Google Cloud credential, wait a few minutes, restart the
frontend if `.env` changed, and retry in a fresh popup. A `401 invalid_client`
error with `no registered origin` means the origin in the browser address bar
is not registered on the OAuth client whose ID the frontend actually loaded.

This template provides a minimal setup to get React working in Vite with HMR and some ESLint rules.

Currently, two official plugins are available:

- [@vitejs/plugin-react](https://github.com/vitejs/vite-plugin-react/blob/main/packages/plugin-react) uses [Oxc](https://oxc.rs)
- [@vitejs/plugin-react-swc](https://github.com/vitejs/vite-plugin-react/blob/main/packages/plugin-react-swc) uses [SWC](https://swc.rs/)

## React Compiler

The React Compiler is not enabled on this template because of its impact on dev & build performances. To add it, see [this documentation](https://react.dev/learn/react-compiler/installation).

## Expanding the ESLint configuration

If you are developing a production application, we recommend using TypeScript with type-aware lint rules enabled. Check out the [TS template](https://github.com/vitejs/vite/tree/main/packages/create-vite/template-react-ts) for information on how to integrate TypeScript and [`typescript-eslint`](https://typescript-eslint.io) in your project.
