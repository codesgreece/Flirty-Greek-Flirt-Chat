import { hash, verify } from "@node-rs/argon2";

const OPTIONS = {
  memoryCost: 19456,
  timeCost: 2,
  outputLen: 32,
  parallelism: 1,
  algorithm: 2, // argon2id
} as const;

export function hashPassword(password: string) {
  return hash(password, OPTIONS);
}

export function verifyPassword(hashValue: string, password: string) {
  return verify(hashValue, password, OPTIONS);
}
