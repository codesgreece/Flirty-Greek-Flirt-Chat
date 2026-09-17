import { hash, verify } from "@node-rs/argon2";

/** Interactive-login Argon2id: fast on Vercel while remaining memory-hard. */
export const ARGON2_OPTIONS = {
  memoryCost: 4096,
  timeCost: 1,
  outputLen: 32,
  parallelism: 1,
  algorithm: 2, // argon2id
} as const;

export function hashPassword(password: string) {
  return hash(password, ARGON2_OPTIONS);
}

export function verifyPassword(hashValue: string, password: string) {
  return verify(hashValue, password);
}

export function passwordHashNeedsUpgrade(hashValue: string) {
  return (
    !hashValue.includes(`m=${ARGON2_OPTIONS.memoryCost}`) ||
    !hashValue.includes(`t=${ARGON2_OPTIONS.timeCost}`)
  );
}
