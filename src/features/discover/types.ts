export type DiscoverCard = {
  userId: string;
  name: string;
  age: number;
  verified: boolean;
  emailVerified?: boolean;
  phoneVerified?: boolean;
  city: string;
  distanceLabel: string | null;
  intention: string;
  bio: string;
  bioEn?: string;
  prompts: { question: string; answer: string }[];
  interests: string[];
  vibes: string[];
  photos: { id: string; src: string; thumb: string }[];
  compatibility: { score: number; interests: number; vibe: number; intent: number; lifestyle: number; distance: number; overall?: number };
  reasons?: string[];
  chips?: string[];
  availability?: string;
  dailyVibe?: { question: string; answer: string } | null;
  voiceIntro?: { src: string; durationMs: number } | null;
  secondChance?: boolean;
  icebreakers?: string[];
};

export type DiscoverFeed = {
  cards: DiscoverCard[];
  empty: { message: string; hours: number } | null;
  passport: { city: string; country: string; active: boolean } | null;
  filters?: {
    minAge: number;
    maxAge: number;
    maxDistanceKm: number;
    verifiedOnly: boolean;
    recentlyActive: boolean;
    intentions: string[];
  };
  locked?: boolean;
};
