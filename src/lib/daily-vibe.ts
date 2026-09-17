export const DAILY_VIBES = [
  "What does a perfect Sunday look like?",
  "Coffee first, or a walk first?",
  "What's a small thing that makes a city feel like home?",
  "Late night talk or early morning quiet?",
  "What are you hoping someone notices about you?",
  "Best meal in the last month?",
  "If tonight is free, what would you actually do?",
];

export function dailyVibeFor(date = new Date()) {
  const start = Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate());
  const day = Math.floor(start / 86400000);
  return DAILY_VIBES[day % DAILY_VIBES.length]!;
}
