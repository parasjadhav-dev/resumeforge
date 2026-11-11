import type { NextAuthConfig } from "next-auth";
import Google from "next-auth/providers/google";

// Edge-safe config: no database imports, so the proxy can use it.
export default {
  providers: [Google],
  pages: { signIn: "/login" },
} satisfies NextAuthConfig;
