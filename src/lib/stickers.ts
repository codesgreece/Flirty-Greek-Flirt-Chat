export const STICKERS = [
  { id: "heart", emoji: "❤️", label: "Heart" },
  { id: "fire", emoji: "🔥", label: "Fire" },
  { id: "wink", emoji: "😉", label: "Wink" },
  { id: "laugh", emoji: "😂", label: "Laugh" },
  { id: "kiss", emoji: "😘", label: "Kiss" },
  { id: "coffee", emoji: "☕", label: "Coffee" },
  { id: "wine", emoji: "🍷", label: "Wine" },
  { id: "travel", emoji: "✈️", label: "Travel" },
  { id: "night", emoji: "🌙", label: "Night" },
  { id: "spark", emoji: "✨", label: "Spark" },
] as const;

export const STARTER_GIFS = [
  { id: "wave", src: "/gifs/wave.gif", label: "Wave" },
  { id: "hearts", src: "/gifs/hearts.gif", label: "Hearts" },
  { id: "coffee", src: "/gifs/coffee.gif", label: "Coffee" },
  { id: "dance", src: "/gifs/dance.gif", label: "Dance" },
  { id: "yes", src: "/gifs/yes.gif", label: "Yes" },
  { id: "wow", src: "/gifs/wow.gif", label: "Wow" },
] as const;

const GIF_HOSTS = new Set([
  "media.giphy.com",
  "media0.giphy.com",
  "media1.giphy.com",
  "media2.giphy.com",
  "media3.giphy.com",
  "media4.giphy.com",
  "i.giphy.com",
  "media.tenor.com",
]);

export function isAllowedGifUrl(url: string) {
  if (/^\/gifs\/[a-z0-9-]+\.gif$/i.test(url)) return true;
  if (STARTER_GIFS.some((gif) => gif.src === url)) return true;
  try {
    const parsed = new URL(url);
    return parsed.protocol === "https:" && GIF_HOSTS.has(parsed.hostname) && /\.(gif|webp)$/i.test(parsed.pathname);
  } catch {
    return false;
  }
}
