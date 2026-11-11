import { ImageResponse } from "next/og";
import { BrandMarkSvg } from "@/lib/brand-art";

export const size = { width: 180, height: 180 };
export const contentType = "image/png";

// The icon used when the site is added to an iPhone or iPad home screen.
export default function AppleIcon() {
  return new ImageResponse(
    <div style={{ display: "flex", width: "100%", height: "100%" }}>
      <BrandMarkSvg size={180} />
    </div>,
    size,
  );
}
