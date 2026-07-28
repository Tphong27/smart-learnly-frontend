export function normalizeCards(cards) {
  if (!Array.isArray(cards)) return [];
  return [...cards].sort(
    (left, right) => Number(left?.orderIndex ?? 0) - Number(right?.orderIndex ?? 0),
  );
}

export function getApiStatus(error) {
  return (
    error?.originalError?.response?.status ||
    error?.response?.status ||
    error?.status ||
    null
  );
}

export function getErrorMessage(error, fallback) {
  const fieldErrors = error?.errors
    ?.map((item) => item?.message)
    .filter(Boolean);

  return (
    fieldErrors?.join(", ") ||
    error?.message ||
    error?.error?.message ||
    fallback
  );
}

export function formatPersonalFlashcardDate(value) {
  if (!value) return "Not updated yet";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "Not updated yet";
  return date.toLocaleDateString(undefined, {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

export function moveItem(items, fromIndex, toIndex) {
  if (
    fromIndex === toIndex ||
    fromIndex < 0 ||
    toIndex < 0 ||
    fromIndex >= items.length ||
    toIndex >= items.length
  ) {
    return items;
  }

  const next = [...items];
  const [moved] = next.splice(fromIndex, 1);
  next.splice(toIndex, 0, moved);
  return next;
}

export function withSequentialOrderIndices(cards) {
  return cards.map((card, index) => ({
    ...card,
    orderIndex: index,
  }));
}

export function isCompleteCardOrder(cards, ids) {
  if (!Array.isArray(cards) || !Array.isArray(ids) || cards.length !== ids.length) {
    return false;
  }

  const expected = new Set(cards.map((card) => String(card.id)));
  const supplied = new Set(ids.map(String));
  return expected.size === cards.length && supplied.size === ids.length &&
    [...expected].every((id) => supplied.has(id));
}

export function hasSameCardOrder(cards, ids) {
  return cards.every((card, index) => String(card.id) === String(ids[index]));
}

export function cardPreview(value, fallback) {
  const normalized = String(value ?? "").trim();
  if (!normalized) return fallback;
  return normalized.length > 110 ? `${normalized.slice(0, 107)}...` : normalized;
}
