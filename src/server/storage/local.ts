import { mkdir, writeFile, readFile } from "fs/promises";
import path from "path";
import { randomBytes } from "crypto";
import sharp from "sharp";
import { prisma } from "@/server/db";
import { AppError } from "@/server/errors";
import { getEnv } from "@/lib/env";

const ALLOWED = new Set(["image/jpeg", "image/png", "image/webp"]);
const MAX_BYTES = 8 * 1024 * 1024;

export function storageRoot() {
  if (process.env.VERCEL) return "/tmp/flirty-uploads";
  return path.resolve(getEnv().STORAGE_LOCAL_PATH);
}

export async function saveProfilePhoto(profileId: string, file: File) {
  if (!ALLOWED.has(file.type)) throw new AppError("INVALID", "Use a JPEG, PNG or WebP photo.", 400);
  if (file.size > MAX_BYTES) throw new AppError("INVALID", "Photos must be under 8MB.", 400);
  const buffer = Buffer.from(await file.arrayBuffer());
  const id = randomBytes(16).toString("hex");
  const dir = path.join(storageRoot(), "photos");
  await mkdir(dir, { recursive: true });
  const largeKey = `photos/${id}-lg.webp`;
  const mediumKey = `photos/${id}-md.webp`;
  const thumbKey = `photos/${id}-th.webp`;
  const image = sharp(buffer).rotate().webp({ quality: 82 });
  const meta = await image.metadata();
  await Promise.all([
    sharp(buffer).rotate().resize(1400, 1800, { fit: "cover" }).webp({ quality: 84 }).toFile(path.join(storageRoot(), largeKey)),
    sharp(buffer).rotate().resize(720, 920, { fit: "cover" }).webp({ quality: 80 }).toFile(path.join(storageRoot(), mediumKey)),
    sharp(buffer).rotate().resize(240, 300, { fit: "cover" }).webp({ quality: 75 }).toFile(path.join(storageRoot(), thumbKey)),
  ]);
  const count = await prisma.profilePhoto.count({ where: { profileId } });
  return prisma.profilePhoto.create({
    data: {
      profileId,
      storageKey: largeKey,
      mediumKey,
      thumbKey,
      mimeType: "image/webp",
      byteSize: buffer.length,
      sortOrder: count,
      isPrimary: count === 0,
      status: "APPROVED",
      width: meta.width,
      height: meta.height,
    },
  });
}

export async function readStoredFile(key: string) {
  if (key.includes("..") || key.startsWith("/")) throw new AppError("INVALID", "Invalid media path.", 400);
  const full = path.join(storageRoot(), key);
  try {
    return await readFile(full);
  } catch {
    return readFile(path.join(process.cwd(), "public", "uploads", key));
  }
}

export async function writeStoredFile(key: string, buffer: Buffer) {
  if (key.includes("..") || key.startsWith("/")) throw new AppError("INVALID", "Invalid media path.", 400);
  const full = path.join(storageRoot(), key);
  await mkdir(path.dirname(full), { recursive: true });
  await writeFile(full, buffer);
}

export async function saveChatImage(conversationId: string, file: File) {
  if (!ALLOWED.has(file.type)) throw new AppError("INVALID", "Use a JPEG, PNG or WebP photo.", 400);
  if (file.size > MAX_BYTES) throw new AppError("INVALID", "Photos must be under 8MB.", 400);
  const buffer = Buffer.from(await file.arrayBuffer());
  const meta = await sharp(buffer).rotate().metadata();
  if (!meta.width || !meta.height) throw new AppError("INVALID", "That file is not a valid image.", 400);
  if (meta.width < 32 || meta.height < 32) throw new AppError("INVALID", "Image is too small.", 400);
  const id = randomBytes(16).toString("hex");
  const largeKey = `chat/${conversationId}/${id}-lg.webp`;
  const thumbKey = `chat/${conversationId}/${id}-th.webp`;
  await mkdir(path.join(storageRoot(), "chat", conversationId), { recursive: true });
  await Promise.all([
    sharp(buffer).rotate().resize(1400, 1400, { fit: "inside", withoutEnlargement: true }).webp({ quality: 82 }).toFile(path.join(storageRoot(), largeKey)),
    sharp(buffer).rotate().resize(480, 480, { fit: "inside", withoutEnlargement: true }).webp({ quality: 75 }).toFile(path.join(storageRoot(), thumbKey)),
  ]);
  return {
    mediaKey: largeKey,
    mediaThumbKey: thumbKey,
    mediaMime: "image/webp",
    mediaWidth: meta.width,
    mediaHeight: meta.height,
  };
}

export async function writePublicAvatarPng(fileName: string, png: Buffer) {
  const dest = path.join(process.cwd(), "public", "avatars", fileName);
  await mkdir(path.dirname(dest), { recursive: true });
  await writeFile(dest, png);
}
