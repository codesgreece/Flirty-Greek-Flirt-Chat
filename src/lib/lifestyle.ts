export const LIFESTYLE_CHIPS = {
  smoking: { label: "Smoking", options: ["Never", "Socially", "Regularly"] },
  drinking: { label: "Drinking", options: ["Never", "Socially", "Often"] },
  kids: { label: "Kids", options: ["Don't want", "Open", "Have kids", "Want someday"] },
  pets: { label: "Pets", options: ["Dog", "Cat", "None", "Allergic"] },
} as const;

export type LifestyleKey = keyof typeof LIFESTYLE_CHIPS;

export const DEALBREAKERS = [
  { id: "smoking", label: "I don't want smoking", hits: ["Regularly"] },
  { id: "drinking", label: "I don't want heavy drinking", hits: ["Often"] },
  { id: "kids", label: "I don't want kids", hits: ["Have kids", "Want someday"] },
] as const;

export const AVAILABILITY = [
  { id: "", label: "No status" },
  { id: "tonight", label: "Free tonight" },
  { id: "weekend", label: "Free this weekend" },
  { id: "coffee", label: "Free for coffee" },
] as const;

export function lifestyleRecord(value: unknown): Record<string, string> {
  if (!value || typeof value !== "object" || Array.isArray(value)) return {};
  return Object.fromEntries(
    Object.entries(value as Record<string, unknown>).map(([k, v]) => [k, String(v)]),
  );
}

export function hitsDealbreaker(dealbreakers: string[], lifestyle: Record<string, string>) {
  return DEALBREAKERS.some((row) => dealbreakers.includes(row.id) && (row.hits as readonly string[]).includes(lifestyle[row.id] ?? ""));
}

export function lifestyleChips(input: {
  heightCm?: number | null;
  languages?: string[];
  lifestyle?: Record<string, string>;
}) {
  const chips: string[] = [];
  if (input.heightCm) chips.push(`${input.heightCm} cm`);
  for (const lang of input.languages ?? []) {
    if (lang) chips.push(lang);
  }
  for (const [key, meta] of Object.entries(LIFESTYLE_CHIPS)) {
    const value = input.lifestyle?.[key];
    if (value) chips.push(`${meta.label}: ${value}`);
  }
  return chips;
}

export function availabilityLabel(value: string | null | undefined) {
  return AVAILABILITY.find((row) => row.id === value)?.label ?? "";
}
