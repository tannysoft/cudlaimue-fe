import "server-only";
import bcrypt from "bcryptjs";

// Workers CPU budget is ~50ms per request, so we cap rounds at 10 which is
// still well above the OWASP 2023 recommended minimum. Sign-ins are cached by
// session so this only fires on login/change-password.
const ROUNDS = 10;

export async function hashPassword(plaintext: string): Promise<string> {
  return bcrypt.hash(plaintext, ROUNDS);
}

export async function verifyPassword(plaintext: string, hash: string): Promise<boolean> {
  return bcrypt.compare(plaintext, hash);
}
