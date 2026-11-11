/**
 * The public URL of the site, used to build absolute links for share images and metadata.
 * Set NEXT_PUBLIC_SITE_URL in production; on Vercel it falls back to the production domain.
 */
export function getSiteUrl(): string {
  const explicit = process.env.NEXT_PUBLIC_SITE_URL;
  if (explicit) return explicit.replace(/\/$/, "");
  const vercel = process.env.VERCEL_PROJECT_PRODUCTION_URL;
  if (vercel) return `https://${vercel}`;
  return "http://localhost:3000";
}

export const SITE_NAME = "ResumeForge";
export const SITE_TAGLINE = "ATS-friendly resumes, tailored to every job";
