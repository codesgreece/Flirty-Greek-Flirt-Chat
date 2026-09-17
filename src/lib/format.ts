export function formatMessageTime(iso: string | Date) {
  const date = typeof iso === "string" ? new Date(iso) : iso;
  if (Number.isNaN(date.getTime())) return "";
  const now = new Date();
  const sameDay = date.toDateString() === now.toDateString();
  if (sameDay) {
    return date.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
  }
  const yesterday = new Date(now);
  yesterday.setDate(now.getDate() - 1);
  if (date.toDateString() === yesterday.toDateString()) return "Yesterday";
  const diff = now.getTime() - date.getTime();
  if (diff < 7 * 86400_000) return date.toLocaleDateString([], { weekday: "short" });
  return date.toLocaleDateString([], { day: "numeric", month: "short" });
}

export function formatIntention(value: string) {
  return value.toLowerCase().replaceAll("_", " ");
}

export function formatLastActive(iso: string | Date | null | undefined, online?: boolean) {
  if (online) return "Active now";
  if (!iso) return "Active recently";
  const date = typeof iso === "string" ? new Date(iso) : iso;
  if (Number.isNaN(date.getTime())) return "Active recently";
  const diff = Date.now() - date.getTime();
  const minutes = Math.max(1, Math.round(diff / 60000));
  if (minutes < 60) return `Active ${minutes} min ago`;
  const hours = Math.round(minutes / 60);
  if (hours < 24) return `Active ${hours}h ago`;
  const days = Math.round(hours / 24);
  if (days === 1) return "Active yesterday";
  if (days < 7) return `Active ${days}d ago`;
  return "Active this week";
}

