export const VIETNAMESE_MOBILE_PHONE_PATTERN = /^(?:0|\+84)[35789]\d{8}$/;

export const VIETNAMESE_MOBILE_PHONE_MESSAGE =
    "Enter a valid Vietnamese mobile number, e.g. 0901234567 or +84901234567";

export function isValidOptionalVietnameseMobilePhone(value) {
    const normalized = value?.trim() ?? "";
    return normalized === "" || VIETNAMESE_MOBILE_PHONE_PATTERN.test(normalized);
}
