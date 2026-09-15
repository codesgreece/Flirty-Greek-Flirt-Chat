export const MINIMUM_AGE = 18;

export function ageFromDob(dob: Date, now = new Date()): number {
  let age = now.getUTCFullYear() - dob.getUTCFullYear();
  const month = now.getUTCMonth() - dob.getUTCMonth();
  if (month < 0 || (month === 0 && now.getUTCDate() < dob.getUTCDate())) age -= 1;
  return age;
}

export function assertAdult(dob: Date) {
  if (ageFromDob(dob) < MINIMUM_AGE) {
    throw new Error("FLIRTY is only available to adults 18 and over.");
  }
}

export function startOfUtcDay(date = new Date()): Date {
  return new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate()));
}

export function periodKey(unit: "day" | "week" | "month", date = new Date()): string {
  if (unit === "day") return date.toISOString().slice(0, 10);
  if (unit === "week") {
    const tmp = new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate()));
    const day = tmp.getUTCDay() || 7;
    tmp.setUTCDate(tmp.getUTCDate() - day + 1);
    return `week:${tmp.toISOString().slice(0, 10)}`;
  }
  return `month:${date.getUTCFullYear()}-${String(date.getUTCMonth() + 1).padStart(2, "0")}`;
}
