export type CompatibilityInput = {
  interests: string[];
  vibes: string[];
  intention: string;
  age: number;
  preferredAge: { min: number; max: number };
  distanceKm: number | null;
  maxDistanceKm: number;
  lifestyle: Record<string, string>;
  personality: Record<string, string>;
  relationshipGoal: string;
  activity: string;
  communication: string;
};

export type CompatibilityBreakdown = {
  score: number;
  interests: number;
  vibe: number;
  intent: number;
  lifestyle: number;
  distance: number;
  personality: number;
};

function overlap(a: string[], b: string[]): number {
  if (!a.length || !b.length) return 50;
  const set = new Set(a);
  const hits = b.filter((x) => set.has(x)).length;
  return Math.round((hits / Math.max(a.length, b.length)) * 100);
}

function closeness(a: string, b: string): number {
  if (!a || !b) return 55;
  return a === b ? 100 : 42;
}

function ageFit(age: number, range: { min: number; max: number }): number {
  if (age >= range.min && age <= range.max) return 100;
  const delta = age < range.min ? range.min - age : age - range.max;
  return Math.max(0, 100 - delta * 12);
}

function distanceFit(km: number | null, max: number): number {
  if (km === null) return 70;
  if (km <= max) return Math.round(100 - (km / Math.max(max, 1)) * 12);
  return Math.max(10, 70 - (km - max));
}

export function scoreCompatibility(self: CompatibilityInput, other: CompatibilityInput): CompatibilityBreakdown {
  const interests = overlap(self.interests, other.interests);
  const vibe = overlap(self.vibes, other.vibes);
  const intent = closeness(self.intention, other.intention);
  const lifestyleKeys = ["pace", "activity", "schedule", "social"];
  const lifestyleScores = lifestyleKeys.map((key) =>
    closeness(self.lifestyle[key] ?? self.activity, other.lifestyle[key] ?? other.activity),
  );
  const lifestyle = Math.round(lifestyleScores.reduce((a, b) => a + b, 0) / lifestyleScores.length);
  const distance = distanceFit(other.distanceKm, self.maxDistanceKm);
  const personality = Math.round(
    (closeness(self.communication, other.communication) +
      closeness(self.relationshipGoal, other.relationshipGoal) +
      ageFit(other.age, self.preferredAge)) /
      3,
  );
  const score = Math.round(
    interests * 0.22 +
      vibe * 0.2 +
      intent * 0.18 +
      lifestyle * 0.14 +
      distance * 0.12 +
      personality * 0.14,
  );
  return {
    score: Math.min(99, Math.max(12, score)),
    interests,
    vibe,
    intent,
    lifestyle,
    distance,
    personality,
  };
}
