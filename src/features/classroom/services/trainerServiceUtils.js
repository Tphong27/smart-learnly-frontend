/** Chặn request trainer thiếu định danh trước khi tạo URL API. */
export function requireTrainerResourceId(value, label) {
    if (!value) {
        throw new Error(`${label} is required`);
    }
}
