import { useEffect, useState } from "react";

/** Trì hoãn giá trị thay đổi nhanh để tránh gọi API tìm kiếm hoặc lọc quá dày. */
export function useDebouncedValue(value, delay = 350) {
  const [debouncedValue, setDebouncedValue] = useState(value);

  useEffect(() => {
    const timeoutId = window.setTimeout(() => setDebouncedValue(value), delay);
    return () => window.clearTimeout(timeoutId);
  }, [delay, value]);

  return debouncedValue;
}
