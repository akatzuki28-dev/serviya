import type { MetadataRoute } from "next";

const BASE_URL =
  process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000";

const SERVICES = [
  "limpieza-de-hogar",
  "plomeria",
  "electricidad",
  "gasista",
  "jardineria",
  "pintura",
];

const ZONES = ["palermo", "belgrano", "recoleta", "caballito", "flores"];

export default function sitemap(): MetadataRoute.Sitemap {
  const servicePages = SERVICES.map((slug) => ({
    url: `${BASE_URL}/servicios/${slug}`,
    lastModified: new Date(),
    changeFrequency: "weekly" as const,
    priority: 0.8,
  }));

  const zonePages = SERVICES.flatMap((slug) =>
    ZONES.map((zona) => ({
      url: `${BASE_URL}/servicios/${slug}/${zona}`,
      lastModified: new Date(),
      changeFrequency: "weekly" as const,
      priority: 0.7,
    }))
  );

  return [
    { url: BASE_URL, lastModified: new Date(), priority: 1.0 },
    ...servicePages,
    ...zonePages,
  ];
}
