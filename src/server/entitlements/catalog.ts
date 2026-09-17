import type { PlanCode } from "@prisma/client";

export const CAPABILITIES = {
  UNLIMITED_LIKES: "UNLIMITED_LIKES",
  UNLIMITED_REWINDS: "UNLIMITED_REWINDS",
  UNLIMITED_FLIRTS: "UNLIMITED_FLIRTS",
  SUPER_LIKES: "SUPER_LIKES",
  DIRECT_MESSAGES: "DIRECT_MESSAGES",
  UNLIMITED_DIRECT_MESSAGES: "UNLIMITED_DIRECT_MESSAGES",
  ADVANCED_FILTERS: "ADVANCED_FILTERS",
  PASSPORT: "PASSPORT",
  INCOGNITO: "INCOGNITO",
  SEE_WHO_LIKED: "SEE_WHO_LIKED",
  BOOST: "BOOST",
  TOP_PICKS: "TOP_PICKS",
  PRIORITY_FLIRT: "PRIORITY_FLIRT",
  FIRST_MESSAGE: "FIRST_MESSAGE",
  PROFILE_PRIORITY: "PROFILE_PRIORITY",
  SUPER_FLIRT: "SUPER_FLIRT",
  NO_ADS: "NO_ADS",
  ADVANCED_COMPATIBILITY: "ADVANCED_COMPATIBILITY",
  EPHEMERAL_PHOTO: "EPHEMERAL_PHOTO",
  SPOTLIGHT: "SPOTLIGHT",
} as const;

export type Capability = (typeof CAPABILITIES)[keyof typeof CAPABILITIES];

export type PlanLimits = {
  likesPerDay: number | null;
  flirtsPerDay: number | null;
  rewindsPerDay: number | null;
  superLikesPerWeek: number;
  directMessagesPerDay: number | null;
  boostsPerMonth: number;
  capabilities: Capability[];
};

export const PLAN_LIMITS: Record<PlanCode, PlanLimits> = {
  FREE: {
    likesPerDay: 50,
    flirtsPerDay: 15,
    rewindsPerDay: 1,
    superLikesPerWeek: 1,
    directMessagesPerDay: 1,
    boostsPerMonth: 0,
    capabilities: [CAPABILITIES.SUPER_LIKES, CAPABILITIES.DIRECT_MESSAGES],
  },
  PLUS: {
    likesPerDay: null,
    flirtsPerDay: null,
    rewindsPerDay: null,
    superLikesPerWeek: 5,
    directMessagesPerDay: 3,
    boostsPerMonth: 0,
    capabilities: [
      CAPABILITIES.UNLIMITED_LIKES,
      CAPABILITIES.UNLIMITED_REWINDS,
      CAPABILITIES.UNLIMITED_FLIRTS,
      CAPABILITIES.SUPER_LIKES,
      CAPABILITIES.DIRECT_MESSAGES,
      CAPABILITIES.ADVANCED_FILTERS,
      CAPABILITIES.PASSPORT,
      CAPABILITIES.INCOGNITO,
      CAPABILITIES.NO_ADS,
    ],
  },
  GOLD: {
    likesPerDay: null,
    flirtsPerDay: null,
    rewindsPerDay: null,
    superLikesPerWeek: 10,
    directMessagesPerDay: 10,
    boostsPerMonth: 1,
    capabilities: [
      CAPABILITIES.UNLIMITED_LIKES,
      CAPABILITIES.UNLIMITED_REWINDS,
      CAPABILITIES.UNLIMITED_FLIRTS,
      CAPABILITIES.SUPER_LIKES,
      CAPABILITIES.DIRECT_MESSAGES,
      CAPABILITIES.ADVANCED_FILTERS,
      CAPABILITIES.PASSPORT,
      CAPABILITIES.INCOGNITO,
      CAPABILITIES.NO_ADS,
      CAPABILITIES.SEE_WHO_LIKED,
      CAPABILITIES.TOP_PICKS,
      CAPABILITIES.ADVANCED_COMPATIBILITY,
      CAPABILITIES.BOOST,
      CAPABILITIES.SUPER_FLIRT,
      CAPABILITIES.EPHEMERAL_PHOTO,
    ],
  },
  PLATINUM: {
    likesPerDay: null,
    flirtsPerDay: null,
    rewindsPerDay: null,
    superLikesPerWeek: 20,
    directMessagesPerDay: null,
    boostsPerMonth: 2,
    capabilities: [
      CAPABILITIES.UNLIMITED_LIKES,
      CAPABILITIES.UNLIMITED_REWINDS,
      CAPABILITIES.UNLIMITED_FLIRTS,
      CAPABILITIES.SUPER_LIKES,
      CAPABILITIES.DIRECT_MESSAGES,
      CAPABILITIES.UNLIMITED_DIRECT_MESSAGES,
      CAPABILITIES.ADVANCED_FILTERS,
      CAPABILITIES.PASSPORT,
      CAPABILITIES.INCOGNITO,
      CAPABILITIES.NO_ADS,
      CAPABILITIES.SEE_WHO_LIKED,
      CAPABILITIES.TOP_PICKS,
      CAPABILITIES.ADVANCED_COMPATIBILITY,
      CAPABILITIES.BOOST,
      CAPABILITIES.SUPER_FLIRT,
      CAPABILITIES.PRIORITY_FLIRT,
      CAPABILITIES.FIRST_MESSAGE,
      CAPABILITIES.PROFILE_PRIORITY,
      CAPABILITIES.EPHEMERAL_PHOTO,
    ],
  },
};

export const PLAN_COPY: Record<PlanCode, { name: string; price: string; tagline: string }> = {
  FREE: { name: "Free", price: "€0", tagline: "Start discovering your people." },
  PLUS: { name: "Plus", price: "€7.99", tagline: "More Flirts. More second chances." },
  GOLD: { name: "Gold", price: "€14.99", tagline: "See who already wants you." },
  PLATINUM: { name: "Platinum", price: "€24.99", tagline: "Maximum presence. First word." },
};
