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
  return readFile(full);
}

export async function writePublicAvatarPng(fileName: string, png: Buffer) {
  const dest = path.join(process.cwd(), "public", "avatars", fileName);
  await mkdir(path.dirname(dest), { recursive: true });
  await writeFile(dest, png);
}
