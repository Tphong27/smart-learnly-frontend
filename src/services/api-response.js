/** Bóc một lớp data khỏi Axios hoặc ApiResponse và giữ nguyên payload thô khi không có envelope. */
export function unwrapApiData(response) {
    return response?.data ?? response;
}

/** Bóc tối đa hai lớp data cho các endpoint backend còn trả envelope lồng nhau. */
export function unwrapNestedApiData(response) {
    const root = unwrapApiData(response);
    return root?.data ?? root;
}
