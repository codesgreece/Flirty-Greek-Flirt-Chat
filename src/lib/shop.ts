export const SHOP_PACKS = [
  {
    id: "super_likes_5",
    name: "Extra Super Likes",
    tagline: "5 Super Likes, ready now",
    price: "€4.99",
    priceCents: 499,
    grant: { superLikes: 5, firstMessages: 0, boosts: 0, spotlights: 0 },
    activate: null as "boost" | "spotlight" | null,
  },
  {
    id: "boost_now",
    name: "1 Boost now",
    tagline: "30 minutes at the top of Discover",
    price: "€3.99",
    priceCents: 399,
    grant: { superLikes: 0, firstMessages: 0, boosts: 1, spotlights: 0 },
    activate: "boost" as const,
  },
  {
    id: "first_message",
    name: "1 First Message",
    tagline: "Message before a match, no Platinum required",
    price: "€2.99",
    priceCents: 299,
    grant: { superLikes: 0, firstMessages: 1, boosts: 0, spotlights: 0 },
    activate: null,
  },
  {
    id: "spotlight_30",
    name: "Spotlight 30 min",
    tagline: "Stand out on Discover for half an hour",
    price: "€4.99",
    priceCents: 499,
    grant: { superLikes: 0, firstMessages: 0, boosts: 0, spotlights: 1 },
    activate: "spotlight" as const,
  },
] as const;

export type ShopPackId = (typeof SHOP_PACKS)[number]["id"];

export function findShopPack(id: string) {
  return SHOP_PACKS.find((pack) => pack.id === id) ?? null;
}
