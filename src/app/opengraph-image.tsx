import { ImageResponse } from "next/og";
import { BrandMarkSvg } from "@/lib/brand-art";
import { SITE_NAME, SITE_TAGLINE } from "@/lib/site";

export const alt = `${SITE_NAME}: ${SITE_TAGLINE}`;
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

// The picture shown when a link to the site is shared (chat apps, social media).
export default function OpenGraphImage() {
  return new ImageResponse(
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        justifyContent: "space-between",
        width: "100%",
        height: "100%",
        padding: 72,
        color: "#ffffff",
        background: "linear-gradient(135deg, #312e81 0%, #4f46e5 55%, #7c3aed 100%)",
      }}
    >
      <div style={{ display: "flex", alignItems: "center", gap: 20 }}>
        <BrandMarkSvg size={72} />
        <div style={{ display: "flex", fontSize: 44, fontWeight: 700, letterSpacing: -1 }}>
          {SITE_NAME}
        </div>
      </div>

      <div style={{ display: "flex", flexDirection: "column", gap: 24 }}>
        <div
          style={{
            display: "flex",
            fontSize: 84,
            fontWeight: 800,
            lineHeight: 1.05,
            letterSpacing: -2,
            maxWidth: 940,
          }}
        >
          Resumes that get past the robots.
        </div>
        <div style={{ display: "flex", fontSize: 34, color: "#c7d2fe", maxWidth: 860 }}>
          Build an ATS-friendly resume, or upload yours and tailor it to any job. The AI never
          invents experience.
        </div>
      </div>
    </div>,
    size,
  );
}
