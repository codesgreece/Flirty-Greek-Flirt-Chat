import type { MetadataRoute } from "next";

export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      { userAgent: "*", allow: ["/", "/pricing", "/safety", "/privacy", "/terms", "/cookies"] },
      { userAgent: "*", disallow: ["/app/", "/admin/", "/api/"] },
    ],
  };
}
