export const PRICE_RANGE_OPTIONS = [
  {
    value: "",
    label: "All prices",
  },
  {
    value: "FREE",
    label: "Free",
  },
  {
    value: "UNDER_500K",
    label: "Under 500,000 ₫",
  },
  {
    value: "BETWEEN_500K_AND_1M",
    label: "500,000 ₫ – 1,000,000 ₫",
  },
  {
    value: "OVER_1M",
    label: "Over 1,000,000 ₫",
  },
];

const PRICE_RANGES = {
  "": {
    minPrice: "",
    maxPrice: "",
  },
  FREE: {
    minPrice: 0,
    maxPrice: 0,
  },
  UNDER_500K: {
    minPrice: 1,
    maxPrice: 499999,
  },
  BETWEEN_500K_AND_1M: {
    minPrice: 500000,
    maxPrice: 1000000,
  },
  OVER_1M: {
    minPrice: 1000001,
    maxPrice: "",
  },
};

export function formatDateInputValue(date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");

  return `${year}-${month}-${day}`;
}

export function getTodayDateValue() {
  return formatDateInputValue(new Date());
}

export function addOneMonthToDateValue(value) {
  if (!value) {
    return "";
  }

  const [year, month, day] = value.split("-").map(Number);

  if (
    !Number.isInteger(year) ||
    !Number.isInteger(month) ||
    !Number.isInteger(day)
  ) {
    return "";
  }

  const result = new Date(year, month - 1, 1);

  result.setMonth(result.getMonth() + 1);

  const lastDayOfTargetMonth = new Date(
    result.getFullYear(),
    result.getMonth() + 1,
    0,
  ).getDate();

  result.setDate(Math.min(day, lastDayOfTargetMonth));

  return formatDateInputValue(result);
}

export function createDefaultOpeningScheduleFilters() {
  const startFrom = getTodayDateValue();

  return {
    keyword: "",
    startFrom,
    startTo: addOneMonthToDateValue(startFrom),
    priceRange: "",
  };
}

export function getPriceRangeParams(priceRange) {
  return PRICE_RANGES[priceRange] || PRICE_RANGES[""];
}

export function isValidPriceRange(priceRange) {
  return Object.hasOwn(PRICE_RANGES, priceRange);
}