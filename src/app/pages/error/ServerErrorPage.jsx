import { HttpErrorPage } from "./HttpErrorPage";

/** Hiển thị lỗi 500 và cho phép tải lại trạng thái hiện tại của ứng dụng. */
export function ServerErrorPage() {
  return (
    <HttpErrorPage
      statusCode="500"
      title="Server error"
      description="The server could not complete this request. Please reload and try again."
      actionLabel="Reload page"
      onAction={() => window.location.reload()}
    />
  );
}
