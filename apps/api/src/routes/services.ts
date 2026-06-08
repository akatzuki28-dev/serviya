import { Router } from "express";
import { getDb, schema } from "@sp/db";
import { eq, and, isNull } from "drizzle-orm";

export const servicesRouter = Router();

// GET /api/services — catálogo de servicios con precio base
servicesRouter.get("/", async (_req, res) => {
  const db = getDb();
  const pricing = await db.query.servicePricing.findMany({
    where: isNull(schema.servicePricing.zone),
  });

  const services = pricing.map((p) => ({
    slug: p.serviceType,
    name: formatServiceName(p.serviceType),
    basePrice: Number(p.basePrice),
    extras: p.extras,
    comingSoon: p.comingSoon,
    description: p.description ?? undefined,
  }));

  res.json(services);
});

// GET /api/services/:slug/availability — slots disponibles
servicesRouter.get("/:slug/availability", async (req, res) => {
  // Lógica simple: slots en horario laboral 8-18, excluyendo órdenes ya agendadas
  const slots = generateAvailableSlots();
  res.json({ slots });
});

function generateAvailableSlots(): string[] {
  const slots: string[] = [];
  const today = new Date();

  for (let day = 1; day <= 7; day++) {
    const date = new Date(today);
    date.setDate(today.getDate() + day);

    if (date.getDay() === 0) continue; // No domingos

    for (let hour = 8; hour <= 17; hour++) {
      date.setHours(hour, 0, 0, 0);
      slots.push(date.toISOString());
    }
  }

  return slots;
}

function formatServiceName(slug: string): string {
  return slug
    .split("-")
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(" ");
}
