import { useState } from "react";
import { RotateCcw } from "lucide-react";
import { Button, Modal } from "@/shared/components/ui";

/** Hiển thị ảnh question ở kích thước lớn mà không thay đổi dữ liệu. */
export function QuestionImagePreviewModal({ preview, onClose }) {
  return (
    <Modal
      open={Boolean(preview)}
      title={preview?.title || "Question image"}
      size="xl"
      onClose={onClose}
    >
      {preview?.url && (
        <div className="question-card__image-modal">
          <img src={preview.url} alt={preview.title || "Question attachment"} />
          {preview.fileName && (
            <p className="question-card__media-modal-name">{preview.fileName}</p>
          )}
        </div>
      )}
    </Modal>
  );
}

/** Đặt lại state lựa chọn mỗi lần mở restore modal. */
export function RestoreQuestionBankModal({ open, bank, onClose, onConfirm }) {
  return (
    <RestoreQuestionBankModalContent
      key={open ? "open" : "closed"}
      open={open}
      bank={bank}
      onClose={onClose}
      onConfirm={onConfirm}
    />
  );
}

/** Cho người quản trị chọn trạng thái draft hoặc approved khi khôi phục bank. */
function RestoreQuestionBankModalContent({ open, bank, onClose, onConfirm }) {
  const [targetStatus, setTargetStatus] = useState("draft");
  return (
    <Modal open={open} title="Restore question bank" size="sm" onClose={onClose}>
      <p style={{ marginTop: 0, color: "#475569" }}>
        Restore <strong>{bank?.name || "this question bank"}</strong> so it can
        be edited again. Choose the status to apply after restoring.
      </p>
      <div style={{ display: "flex", flexDirection: "column", gap: 8, marginBottom: 18 }}>
        <label style={{ display: "flex", gap: 8, alignItems: "center" }}>
          <input
            type="radio"
            name="restore-target-detail"
            value="draft"
            checked={targetStatus === "draft"}
            onChange={() => setTargetStatus("draft")}
          />
          <span>Restore as <strong>Draft</strong> (still needs review)</span>
        </label>
        <label style={{ display: "flex", gap: 8, alignItems: "center" }}>
          <input
            type="radio"
            name="restore-target-detail"
            value="approved"
            checked={targetStatus === "approved"}
            onChange={() => setTargetStatus("approved")}
          />
          <span>Restore as <strong>Approved</strong> (ready to use)</span>
        </label>
      </div>
      <div style={{ display: "flex", justifyContent: "flex-end", gap: 10 }}>
        <Button type="button" variant="ghost" onClick={onClose}>Cancel</Button>
        <Button
          type="button"
          leftIcon={<RotateCcw size={15} />}
          onClick={() => onConfirm(targetStatus)}
        >
          Restore
        </Button>
      </div>
    </Modal>
  );
}
