import "dotenv/config";
import pg from "pg";
import { TEST_EMAIL_PATTERN } from "./global-setup";

/** Removes the throwaway users (and, by cascade, their resumes). */
export default async function globalTeardown() {
  const pool = new pg.Pool({ connectionString: process.env.DATABASE_URL });
  try {
    await pool.query('DELETE FROM "User" WHERE email LIKE $1', [TEST_EMAIL_PATTERN]);
  } finally {
    await pool.end();
  }
}
