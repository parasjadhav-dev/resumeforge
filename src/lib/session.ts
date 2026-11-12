import { connection } from "next/server";
import { auth } from "@/lib/auth";

export class UnauthorizedError extends Error {
  constructor() {
    super("Unauthorized");
    this.name = "UnauthorizedError";
  }
}

/**
 * The current session, or null. Use this instead of calling auth() directly: Auth.js makes a
 * random CSRF token while reading the session, and with cacheComponents Next.js requires that to
 * happen at request time, which connection() guarantees.
 */
export async function getSession() {
  await connection();
  return auth();
}

/** Returns the signed-in user, or throws. Call this in every route and server action. */
export async function requireUser() {
  const session = await getSession();
  if (!session?.user?.id) throw new UnauthorizedError();
  return session.user;
}
