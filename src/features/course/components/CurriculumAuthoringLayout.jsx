import { RotateCcw } from "lucide-react";
import { Button } from "@/shared/components/ui";
import "../course-admin.css";

/**
 * Dùng chung page shell của curriculum tổng và curriculum theo lớp.
 * Component giữ nhất quán header, loading, error và khoảng cách; nghiệp vụ CRUD do màn hình cha cung cấp.
 */
export function CurriculumAuthoringLayout({
  title = "Curriculum",
  subtitle = "Organise sections and lessons so learners can follow a logical flow.",
  context,
  headerActions,
  backLabel,
  onBack,
  loading = false,
  error = "",
  errorTitle = "Curriculum unavailable",
  onRetry,
  embedded = false,
  children,
}) {
  const pageClassName = [
    "sl-cm-page",
    "sl-cm-page--curriculum",
    embedded ? "sl-cm-page--embedded" : "",
  ]
    .filter(Boolean)
    .join(" ");

  if (loading) {
    return (
      <div className={pageClassName} role="status" aria-live="polite">
        <div className="sl-cm-workspace" aria-busy="true">
          <div
            className="sl-cm-skeleton"
            style={{ width: "40%", marginBottom: 12 }}
          />
          <div
            className="sl-cm-skeleton"
            style={{ width: "70%", marginBottom: 24 }}
          />
          <div
            className="sl-cm-skeleton"
            style={{ width: "100%", height: 64 }}
          />
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className={pageClassName}>
        <div className="sl-cm-workspace sl-cm-load-error" role="alert">
          <h1 className="sl-cm-header__title">{errorTitle}</h1>
          <p>{error}</p>
          <div className="sl-cm-load-error__actions">
            {onBack && (
              <Button variant="outline" onClick={onBack}>
                {backLabel || "Go back"}
              </Button>
            )}
            {onRetry && (
              <Button leftIcon={<RotateCcw size={16} />} onClick={onRetry}>
                Try again
              </Button>
            )}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className={pageClassName}>
      <header className="sl-cm-header">
        <div>
          {onBack && (
            <button type="button" className="sl-cm-back" onClick={onBack}>
              ← {backLabel || "Go back"}
            </button>
          )}
          <h1 className="sl-cm-header__title">{title}</h1>
          <p className="sl-cm-header__subtitle">{subtitle}</p>
          {context && <p className="sl-cm-header__context">{context}</p>}
        </div>
        {headerActions && (
          <div className="sl-cm-header__actions">{headerActions}</div>
        )}
      </header>

      {children}
    </div>
  );
}
