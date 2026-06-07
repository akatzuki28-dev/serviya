import type { MetadataRoute } from "next";

export default function robots(): MetadataRoute.Robots {
  const BASE_URL =
    process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000";

  return {
    rules: [
      {
        userAgent: "*",
        allow: ["/", "/servicios/"],
        disallow: ["/mi-cuenta/", "/admin/", "/proveedor/", "/api/", "/reservar/", "/orden/"],
      },
    ],
    sitemap: `${BASE_URL}/sitemap.xml`,
  };
}
