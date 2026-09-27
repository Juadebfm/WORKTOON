import type Database from "better-sqlite3";
import bcrypt from "bcryptjs";
import { createHash, randomBytes, randomUUID } from "node:crypto";

const missingUserPasswordHash = bcrypt.hashSync(randomUUID(), 12);

export interface SupportUser {
  id: string;
  email: string;
  role: "SUPPORT_AGENT" | "ADMIN";
}

export interface Session extends SupportUser {
  token: string;
  expiresAt: string;
}

function hashToken(token: string): string {
  // Store only a digest, so a database leak cannot replay a session token.
  return createHash("sha256").update(token).digest("hex");
}

export function authenticateSupportUser(
  database: Database.Database,
  email: string,
  password: string,
  now: Date,
): SupportUser | undefined {
  const user = database
    .prepare("SELECT id, email, password_hash, role FROM users WHERE email = ?")
    .get(email) as { id: string; email: string; password_hash: string; role: SupportUser["role"] } | undefined;

  // Compare a dummy hash for missing users to reduce timing differences.
  if (!bcrypt.compareSync(password, user?.password_hash ?? missingUserPasswordHash) || !user) {
    return undefined;
  }

  database.prepare("UPDATE users SET last_login_at = ? WHERE id = ?").run(now.toISOString(), user.id);

  return { id: user.id, email: user.email, role: user.role };
}

export function createSession(database: Database.Database, user: SupportUser, now: Date): Session {
  const expiresAt = new Date(now.getTime() + 8 * 60 * 60 * 1000).toISOString();
  // Generate a high-entropy bearer token instead of a predictable identifier.
  const token = randomBytes(32).toString("base64url");

  database
    .prepare("INSERT INTO user_sessions (id, user_id, token_hash, expires_at, created_at) VALUES (?, ?, ?, ?, ?)")
    .run(randomUUID(), user.id, hashToken(token), expiresAt, now.toISOString());

  return { ...user, token, expiresAt };
}

export function getSessionUser(database: Database.Database, token: string, now: Date): SupportUser | undefined {
  // Clear expired tokens before the authenticated lookup.
  database.prepare("DELETE FROM user_sessions WHERE expires_at <= ?").run(now.toISOString());

  const user = database
    .prepare(
      "SELECT users.id, users.email, users.role FROM user_sessions JOIN users ON users.id = user_sessions.user_id WHERE user_sessions.token_hash = ?",
    )
    .get(hashToken(token)) as SupportUser | undefined;

  return user;
}

export function deleteSession(database: Database.Database, token: string): void {
  database.prepare("DELETE FROM user_sessions WHERE token_hash = ?").run(hashToken(token));
}
