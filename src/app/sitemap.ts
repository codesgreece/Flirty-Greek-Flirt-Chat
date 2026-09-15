import type { MetadataRoute } from "next";

export default function sitemap(): MetadataRoute.Sitemap {
  const base = process.env.APP_URL || "http://localhost:3000";
  return ["", "/pricing", "/safety", "/privacy", "/terms", "/cookies"].map((path) => ({
    url: `${base}${path || "/"}`,
    lastModified: new Date(),
  }));
}
