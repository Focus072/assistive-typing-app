import { MetadataRoute } from "next"

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "TypeFlow - Assistive Typing Engine",
    short_name: "TypeFlow",
    description: "Transform your text into natural, human-like typing. Perfect for accessibility and assistive technology.",
    start_url: "/dashboard",
    display: "standalone",
    background_color: "#0f172a",
    theme_color: "#8b5cf6",
    icons: [
      {
        src: "/icon-192.png",
        sizes: "192x192",
        type: "image/png",
      },
      {
        src: "/icon-512.png",
        sizes: "512x512",
        type: "image/png",
      },
    ],
    categories: ["productivity", "accessibility"],
    orientation: "any",
    screenshots: [],
  }
}

