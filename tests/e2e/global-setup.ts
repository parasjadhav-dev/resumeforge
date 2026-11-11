import "dotenv/config";
import { randomUUID } from "node:crypto";
import { mkdirSync, rmSync, writeFileSync } from "node:fs";
import { encode } from "next-auth/jwt";
import pg from "pg";
import { FRESHER_RESUME, FULL_RESUME, IMPORTED_RESUME, UNSUPPORTED_RESUME } from "./seed-data";

export const STATE_DIR = ".playwright";
export const SHOTS_DIR = "ui-shots/latest";
export const TEST_EMAIL_PATTERN = "pw-ui-%@example.com";

const COOKIE = "authjs.session-token";

/**
 * Creates two throwaway users (one with resumes, one with none) in the real database, signs a
 * session for each, and saves them as browser state so the screens can be opened signed in.
 * global-teardown deletes them again.
 */
export default async function globalSetup() {
  if (!process.env.DATABASE_URL || !process.env.AUTH_SECRET) {
    throw new Error("DATABASE_URL and AUTH_SECRET must be set (see .env).");
  }
  rmSync(SHOTS_DIR, { recursive: true, force: true });
  mkdirSync(SHOTS_DIR, { recursive: true });
  mkdirSync(STATE_DIR, { recursive: true });

  const pool = new pg.Pool({ connectionString: process.env.DATABASE_URL });
  try {
    await pool.query('DELETE FROM "User" WHERE email LIKE $1', [TEST_EMAIL_PATTERN]); // stale runs

    const makeUser = async (label: string) => {
      const id = "pw" + randomUUID().replace(/-/g, "");
      const email = `pw-ui-${label}-${Date.now()}@example.com`;
      await pool.query('INSERT INTO "User"(id, email, name) VALUES ($1, $2, $3)', [
        id,
        email,
        "Asha Rao",
      ]);
      const token = await encode({
        token: { sub: id, email },
        secret: process.env.AUTH_SECRET!,
        salt: COOKIE,
      });
      const state = {
        cookies: [
          {
            name: COOKIE,
            value: token,
            domain: "localhost",
            path: "/",
            httpOnly: true,
            secure: false,
            sameSite: "Lax" as const,
            expires: Math.floor(Date.now() / 1000) + 3600,
          },
        ],
        origins: [],
      };
      writeFileSync(`${STATE_DIR}/state-${label}.json`, JSON.stringify(state));
      return id;
    };

    const mainId = await makeUser("main");
    await makeUser("empty");

    const ids: Record<string, string> = {};
    let minutesAgo = 0;
    const addResume = async (key: string, title: string, templateId: string, content: unknown) => {
      const id = "pwr" + randomUUID().replace(/-/g, "");
      ids[key] = id;
      await pool.query(
        `INSERT INTO "Resume"(id, "userId", title, "templateId", content, "updatedAt", "createdAt")
         VALUES ($1, $2, $3, $4, $5, now() - ($6 || ' minutes')::interval, now() - ($6 || ' minutes')::interval)`,
        [id, mainId, title, templateId, JSON.stringify(content), String((minutesAgo += 90))],
      );
    };

    await addResume("classic", "Software Engineer Resume", "classic", FULL_RESUME);
    await addResume("modern", "Modern Design Resume", "modern", FULL_RESUME);
    await addResume("fresher", "Fresher Resume", "classic", FRESHER_RESUME);
    await addResume("imported", "Imported Resume", "classic", IMPORTED_RESUME);
    await addResume("unsupported", "Needs Fixing", "classic", UNSUPPORTED_RESUME);
    await addResume("blank", "Blank Resume", "classic", {});

    writeFileSync(`${STATE_DIR}/seed.json`, JSON.stringify({ ids }));
  } finally {
    await pool.end();
  }
}
