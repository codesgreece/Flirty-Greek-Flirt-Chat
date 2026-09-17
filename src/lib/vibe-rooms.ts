import type { VibeCode } from "@prisma/client";

export const VIBE_ROOMS = [
  { id: "chill", label: "Chill", vibes: ["CHILL"] as VibeCode[] },
  { id: "night-owl", label: "Night Owl", vibes: ["SOCIAL", "SPONTANEOUS"] as VibeCode[], extras: ["Night Owl"] },
  { id: "travel", label: "Travel", vibes: ["ADVENTUROUS"] as VibeCode[], extras: ["Travel"] },
] as const;

export type VibeRoomId = (typeof VIBE_ROOMS)[number]["id"];

export function findVibeRoom(id: string | null | undefined) {
  if (!id) return null;
  return VIBE_ROOMS.find((row) => row.id === id) ?? null;
}

export function inVibeRoom(
  room: (typeof VIBE_ROOMS)[number],
  vibes: string[],
  extras: string[],
) {
  if (room.vibes.some((code) => vibes.includes(code))) return true;
  const extraNeed = "extras" in room ? room.extras : [];
  return extraNeed.some((label) => extras.includes(label));
}
