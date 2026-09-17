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
  { id: "wave", src: "https://media.giphy.com/media/3oEjI6SIIHBdRxXI40/giphy.gif", label: "Wave" },
  { id: "hearts", src: "https://media.giphy.com/media/l0MYt5jPR6QX5pnqM/giphy.gif", label: "Hearts" },
  { id: "coffee", src: "https://media.giphy.com/media/3o6Zt6KHxJTbXCnSvu/giphy.gif", label: "Coffee" },
  { id: "dance", src: "https://media.giphy.com/media/l0MYyCdjXwqn8hw3K/giphy.gif", label: "Dance" },
  { id: "yes", src: "https://media.giphy.com/media/111ebonMs90YLu/giphy.gif", label: "Yes" },
  { id: "wow", src: "https://media.giphy.com/media/5VKbvrjxpVJCM/giphy.gif", label: "Wow" },
] as const;

const GIF_HOSTS = new Set(["media.giphy.com", "media0.giphy.com", "media1.giphy.com", "media2.giphy.com", "media3.giphy.com", "media4.giphy.com", "i.giphy.com", "media.tenor.com"]);

export function isAllowedGifUrl(url: string) {
  try {
    const parsed = new URL(url);
    return (parsed.protocol === "https:" && GIF_HOSTS.has(parsed.hostname) && /\.(gif|webp)$/i.test(parsed.pathname)) || STARTER_GIFS.some((g) => g.src === url);
  } catch {
    return false;
  }
}
