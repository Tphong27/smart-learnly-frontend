import { useNavigate } from "react-router-dom";
import { HttpErrorPage } from "./HttpErrorPage";

/** Hiển thị lỗi 403 và cho phép người dùng quay lại màn hình trước. */
export function ForbiddenPage() {
  const navigate = useNavigate();

  return (
    <HttpErrorPage
      statusCode="403"
      title="Access denied"
      description="Your account does not have permission to access this area."
      actionLabel="Go back"
      onAction={() => navigate(-1)}
    />
  );
}
