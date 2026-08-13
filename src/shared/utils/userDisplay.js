import { ROLES } from "@/shared/constants/roles";

/** Chọn tên hiển thị tốt nhất từ hồ sơ người dùng và fallback của từng workspace. */
export function getUserDisplayName(user, fallback = "User") {
    return (
        user?.fullName ||
        [user?.firstName, user?.lastName].filter(Boolean).join(" ") ||
        user?.email ||
        fallback
    );
}

/** Lấy tên gọi ngắn ở đầu chuỗi tên để dùng trong lời chào. */
export function getFirstName(name, fallback = "User") {
    return String(name || "").trim().split(/\s+/)[0] || fallback;
}

/** Tạo tối đa hai ký tự đại diện cho avatar chữ. */
export function getInitials(name, fallback = "U") {
    return (
        String(name || "")
            .split(/\s+/)
            .filter(Boolean)
            .map((part) => part[0])
            .join("")
            .slice(0, 2)
            .toUpperCase() || fallback
    );
}

/** Đổi role hệ thống thành nhãn ngắn, cho phép từng shell chọn cách gọi trainee. */
export function getUserRoleLabel(role, traineeLabel = "Learner") {
    const labels = {
        [ROLES.TRAINEE]: traineeLabel,
        [ROLES.TRAINER]: "Trainer",
        [ROLES.SME]: "SME",
        [ROLES.TMO]: "TMO",
        [ROLES.ADMIN]: "Admin",
        [ROLES.GUEST]: "Guest",
    };
    return labels[role?.toLowerCase()] || labels[role] || "User";
}
