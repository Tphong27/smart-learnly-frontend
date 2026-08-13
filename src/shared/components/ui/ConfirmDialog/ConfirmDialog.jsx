import { Button } from "../Button";
import { Modal } from "../Modal";

/** Hiển thị xác nhận cho thao tác quan trọng với cancel và confirm có thứ bậc rõ ràng. */
export function ConfirmDialog({
  open,
  title,
  description,
  children,
  confirmLabel = "Confirm",
  cancelLabel = "Cancel",
  tone = "danger",
  loading = false,
  loadingLabel = "Processing...",
  onConfirm,
  onClose,
}) {
  return (
    <Modal
      open={open}
      title={title}
      description={description}
      size="sm"
      closeDisabled={loading}
      closeOnOverlayClick={!loading}
      onClose={onClose}
      footer={
        <>
          <Button variant="ghost" onClick={onClose} disabled={loading}>{cancelLabel}</Button>
          <Button
            variant={tone === "danger" ? "danger" : "primary"}
            onClick={onConfirm}
            loading={loading}
            loadingLabel={loadingLabel}
          >
            {confirmLabel}
          </Button>
        </>
      }
    >
      {children}
    </Modal>
  );
}
