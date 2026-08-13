import { useState } from "react";
import { RotateCcw } from "lucide-react";
import {
  Button,
  FormActions,
  Modal,
  RadioGroup,
} from "@/shared/components/ui";

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
      <p className="question-bank-restore__description">
        Restore <strong>{bank?.name || "this question bank"}</strong> so it can
        be edited again. Choose the status to apply after restoring.
      </p>
      <RadioGroup
        legend="Status after restoring"
        name="restore-target-detail"
        value={targetStatus}
        options={[
          { value: "draft", label: "Draft — still needs review" },
          { value: "approved", label: "Approved — ready to use" },
        ]}
        onChange={setTargetStatus}
      />
      <FormActions>
        <Button type="button" variant="ghost" onClick={onClose}>Cancel</Button>
        <Button
          type="button"
          leftIcon={<RotateCcw size={15} />}
          onClick={() => onConfirm(targetStatus)}
        >
          Restore
        </Button>
      </FormActions>
    </Modal>
  );
}
