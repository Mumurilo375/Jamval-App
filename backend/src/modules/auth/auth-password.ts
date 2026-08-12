import bcrypt from "bcrypt";

const PASSWORD_HASH_ROUNDS = 12;
const MIN_PASSWORD_LENGTH = 8;

export async function hashPassword(password: string): Promise<string> {
  ensurePasswordMeetsMinimumRequirements(password);
  return bcrypt.hash(password, PASSWORD_HASH_ROUNDS);
}

export async function verifyPassword(password: string, passwordHash: string): Promise<boolean> {
  return bcrypt.compare(password, passwordHash);
}

export function ensurePasswordMeetsMinimumRequirements(password: string): void {
  if (password.trim().length < MIN_PASSWORD_LENGTH) {
    throw new Error(`Password must have at least ${MIN_PASSWORD_LENGTH} characters.`);
  }
}
