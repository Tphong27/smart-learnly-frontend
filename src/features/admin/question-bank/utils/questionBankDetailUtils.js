import { getCurrentUser } from "@/services";

/** Cho biết người dùng hiện tại có quyền sửa question bank hay không. */
export function canWriteQuestionBank() {
  const role = getCurrentUser()?.role;
  return role === "ADMIN" || role === "SME";
}

/** Chuẩn hóa response curriculum thành danh sách module dùng cho bộ lọc. */
export function normalizeQuestionModules(payload) {
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

/** Lấy URL media từ các dạng response attachment đang được backend hỗ trợ. */
export function questionMediaUrl(item) {
  return item?.mediaUrl || item?.fileUrl || item?.url || null;
}

/** Lấy tên media để hiển thị và dùng fallback khi backend không trả tên file. */
export function questionMediaName(item, fallback) {
  return item?.fileName || item?.originalFileName || item?.name || fallback;
}

/** Sắp xếp và chia question attachment thành nhóm ảnh, audio và video. */
export function normalizeQuestionMedia(question) {
  const attachments = Array.isArray(question?.mediaAttachments)
    ? question.mediaAttachments
    : [];
  const sorted = [...attachments].sort(
    (left, right) =>
      (left.displayOrder ?? left.orderIndex ?? 0) -
      (right.displayOrder ?? right.orderIndex ?? 0),
  );
  const byType = (mediaType) =>
    sorted.filter(
      (item) =>
        String(item.mediaType || "").toLowerCase() === mediaType &&
        questionMediaUrl(item),
    );
  return {
    images: byType("image"),
    audios: byType("audio"),
    videos: byType("video"),
  };
}
