import { setupServer } from "msw/node";

/** Chặn mọi HTTP request của integration test và chỉ cho phép handler khai báo rõ ràng. */
export const server = setupServer();
