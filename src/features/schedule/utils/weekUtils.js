export function parseLocalDate(value) {
  if (value instanceof Date) {
    return new Date(value.getFullYear(), value.getMonth(), value.getDate());
  }

  const [year, month, day] = String(value).split("-").map(Number);

  return new Date(year, month - 1, day);
}

export function toDateKey(value) {
  const date = parseLocalDate(value);
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");

  return `${year}-${month}-${day}`;
}

export function addDays(value, amount) {
  const date = parseLocalDate(value);
  date.setDate(date.getDate() + amount);
  return date;
}

export function startOfWeek(value = new Date()) {
  const date = parseLocalDate(value);
  const dayIndex = (date.getDay() + 6) % 7;

  date.setDate(date.getDate() - dayIndex);
  return date;
}

export function getIsoWeekInfo(value) {
  const localDate = parseLocalDate(value);

  const target = new Date(
    Date.UTC(
      localDate.getFullYear(),
      localDate.getMonth(),
      localDate.getDate(),
    ),
  );

  const dayNumber = (target.getUTCDay() + 6) % 7;
  target.setUTCDate(target.getUTCDate() - dayNumber + 3);
  const year = target.getUTCFullYear();
  const firstThursday = new Date(Date.UTC(year, 0, 4));
  const firstDayNumber = (firstThursday.getUTCDay() + 6) % 7;
  firstThursday.setUTCDate(firstThursday.getUTCDate() - firstDayNumber + 3);
  const week =
    1 +
    Math.round(
      (target.getTime() - firstThursday.getTime()) / (7 * 24 * 60 * 60 * 1000),
    );

  return { year, week };
}

export function fromIsoWeek(year, week) {
  const januaryFourth = new Date(year, 0, 4);
  const firstMonday = startOfWeek(januaryFourth);

  return addDays(firstMonday, (week - 1) * 7);
}

export function formatWeekInput(value) {
  const { year, week } = getIsoWeekInfo(value);

  return `${year}-W${String(week).padStart(2, "0")}`;
}
