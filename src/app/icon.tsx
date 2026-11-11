import { ImageResponse } from "next/og";
import { BrandMarkSvg } from "@/lib/brand-art";

export const size = { width: 64, height: 64 };
export const contentType = "image/png";

// The browser-tab icon.
export default function Icon() {
  return new ImageResponse(
    <div style={{ display: "flex", width: "100%", height: "100%" }}>
      <BrandMarkSvg size={64} />
    </div>,
    size,
  );
}
