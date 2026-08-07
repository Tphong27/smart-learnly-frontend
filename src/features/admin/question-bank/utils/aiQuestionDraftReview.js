import { getCurrentUser } from "@/services/api-client";

/** Cho biết người dùng hiện tại có quyền review và xuất bản AI question draft hay không. */
export function canReviewAiQuestionDrafts() {
  const role = getCurrentUser()?.role;
  return role === "ADMIN" || role === "SME";
}

/** Chuẩn hóa response curriculum thành danh sách module cho form review. */
export function normalizeDraftModules(payload) {
  const root = payload?.data ?? payload;
  const items = Array.isArray(root)
    ? root
    : (root?.items ?? root?.content ?? root?.sections ?? []);
  return items
    .map((item, index) => ({
      id: item.moduleId || item.sectionId || item.id,
      title: item.title || item.name || `Module ${index + 1}`,
    }))
    .filter((item) => item.id);
}

/** Tạo nhãn dễ đọc cho loại source của AI draft batch. */
export function sourceKindLabel(kind) {
  if (kind === "transcript") return "Transcript";
  if (kind === "temporary_file") return "Document";
  if (kind === "pasted_text") return "Pasted text";
  return "Source";
}

/** Định dạng dung lượng source thành B, KB hoặc MB. */
export function formatBytes(value) {
  const bytes = Number(value || 0);
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${Math.round(bytes / 1024)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

/** Định dạng khoảng thời gian evidence transcript thành mm:ss-mm:ss. */
export function formatEvidenceTime(startMs, endMs) {
  if (startMs == null && endMs == null) return null;
  return `${formatMillis(startMs)}-${formatMillis(endMs)}`;
}

/** Đổi millisecond sang chuỗi phút và giây. */
function formatMillis(value) {
  const seconds = Math.floor(Math.max(0, Number(value || 0)) / 1000);
  return `${String(Math.floor(seconds / 60)).padStart(2, "0")}:${String(seconds % 60).padStart(2, "0")}`;
}

/** Cho biết draft đang là bản gốc hay đã được người review chỉnh sửa. */
export function draftEditStatusLabel(draft) {
  return Number(draft?.version || 0) > 0 ? "Edited" : "Original";
}

/** Sắp xếp answer theo displayOrder trước khi hiển thị hoặc lưu. */
export function sortedDraftAnswers(draft) {
  return [...(draft.answers || [])].sort(
    (left, right) => (left.displayOrder ?? 0) - (right.displayOrder ?? 0),
  );
}

/** Tạo state ban đầu của modal edit từ draft và answers đã sắp xếp. */
export function createAiDraftFormValues(draft) {
  return {
    ...draft,
    answers: sortedDraftAnswers(draft),
  };
}

/** Kiểm tra nội dung draft do người review chỉnh trước khi gọi API. */
export function getDraftValidationError(values) {
  const questionText = values.questionText.trim();
  if (!questionText) return "Question text is required.";
  if (!values.moduleId) return "Module is required.";
  const answers = sortedDraftAnswers(values);
  if (values.questionType === "single_choice" || values.questionType === "multiple_choice") {
    if (answers.length < 2 || answers.length > 6) return "MCQ needs 2 to 6 answers.";
    if (answers.some((answer) => !String(answer.answerText || "").trim())) {
      return "Answer text must not be empty.";
    }
  }
  if (values.questionType === "true_false") {
    const labels = answers.map((answer) => String(answer.answerText || "").trim().toLowerCase());
    if (answers.length !== 2 || !labels.includes("true") || !labels.includes("false")) {
      return "True/False answers must be exactly True and False.";
    }
  }
  const correctCount = answers.filter((answer) => answer.correct).length;
  if (
    (values.questionType === "single_choice" ||
      values.questionType === "true_false") &&
    correctCount !== 1
  ) {
    return "Exactly one correct answer is required.";
  }
  if (values.questionType === "multiple_choice" && correctCount < 2) {
    return "Multiple choice requires at least two correct answers.";
  }
  return null;
}

/** Tạo payload cập nhật draft và giữ nguyên optimistic version. */
export function buildDraftPayload(values) {
  return {
    version: values.version,
    questionText: values.questionText.trim(),
    explanation: values.explanation.trim() || null,
    moduleId: values.moduleId || null,
    answers: sortedDraftAnswers(values).map((answer, index) => ({
      answerText: String(answer.answerText || "").trim(),
      correct: Boolean(answer.correct),
      displayOrder: index + 1,
    })),
  };
}
