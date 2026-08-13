import { HttpErrorPage } from "./HttpErrorPage";

/** Hiển thị lỗi 404 và đưa người dùng về trang chủ. */
export function NotFoundPage() {
  return (
    <HttpErrorPage
      statusCode="404"
      title="Page not found"
      description="The page may have moved, been removed, or the address may be incorrect."
      actionLabel="Back to home"
      actionTo="/"
    />
  );
}
