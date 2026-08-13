import { Button, ErrorState } from "@/shared/components/ui";
import "./HttpErrorPage.css";

/** Hiển thị layout lỗi HTTP thống nhất cùng hành động phục hồi phù hợp. */
export function HttpErrorPage({
  statusCode,
  title,
  description,
  actionLabel,
  actionTo,
  onAction,
}) {
  return (
    <main className="http-error-page">
      <p className="http-error-page__code" aria-hidden="true">
        {statusCode}
      </p>
      <ErrorState
        className="http-error-page__state"
        title={title}
        description={description}
        action={
          <Button to={actionTo} onClick={onAction} variant="primary">
            {actionLabel}
          </Button>
        }
      />
    </main>
  );
}
