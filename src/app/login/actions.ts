"use server";

import { signIn, signOut } from "@/lib/auth";
import { safeRedirect } from "@/lib/safe-redirect";

export async function signInWithGoogle(formData: FormData) {
  await signIn("google", { redirectTo: safeRedirect(formData.get("redirectTo")) });
}

export async function signOutAction() {
  await signOut({ redirectTo: "/login" });
}
