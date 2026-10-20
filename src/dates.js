export const DAYS = [
  "Sunday",
  "Monday",
  "Tuesday",
  "Wednesday",
  "Thursday",
  "Friday",
  "Saturday",
];

export const PLAN_WEEKS = 8;
export const PLAN_START = new Date(2026, 9, 18);

export function cycleWeek(date, start = PLAN_START, totalWeeks = PLAN_WEEKS) {
  if (date < start) return 1;
  const elapsedDays = Math.floor((date - start) / 86_400_000);
  return Math.min(totalWeeks, Math.floor(elapsedDays / 7) + 1);
}
