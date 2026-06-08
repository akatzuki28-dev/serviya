import { getDb, schema } from "@sp/db";
import { isNull } from "drizzle-orm";

interface SeedService {
  slug: string;
  basePrice: number;
  description: string;
  comingSoon: boolean;
}

const SEED_SERVICES: SeedService[] = [
  {
    slug: "limpieza-de-hogar",
    basePrice: 8500,
    description: "Limpieza integral de ambientes",
    comingSoon: false,
  },
  {
    slug: "plomeria",
    basePrice: 6000,
    description: "Reparaciones y destapaciones",
    comingSoon: true,
  },
  {
    slug: "electricidad",
    basePrice: 5500,
    description: "Instalaciones y reparaciones eléctricas",
    comingSoon: true,
  },
  {
    slug: "gasista",
    basePrice: 7000,
    description: "Instalaciones y habilitaciones de gas",
    comingSoon: true,
  },
  {
    slug: "jardineria",
    basePrice: 5000,
    description: "Mantenimiento y diseño de jardines",
    comingSoon: true,
  },
  {
    slug: "pintura",
    basePrice: 9000,
    description: "Pintura de interiores y exteriores",
    comingSoon: true,
  },
];

/**
 * Inserta los servicios iniciales SOLO si la tabla `service_pricing` está vacía
 * para filas con zone=NULL (las del catálogo público). Idempotente: si ya hay
 * datos, no toca nada — el operador del dashboard pasa a ser la fuente de verdad.
 */
export async function seedServicesIfEmpty(): Promise<void> {
  const db = getDb();
  const existing = await db.query.servicePricing.findMany({
    where: isNull(schema.servicePricing.zone),
    limit: 1,
  });

  if (existing.length > 0) {
    console.log("[seed] service_pricing ya tiene datos, skip.");
    return;
  }

  await db.insert(schema.servicePricing).values(
    SEED_SERVICES.map((s) => ({
      serviceType: s.slug,
      zone: null,
      basePrice: s.basePrice.toFixed(2),
      extras: [],
      comingSoon: s.comingSoon,
      description: s.description,
    }))
  );

  console.log(
    `[seed] inserted ${SEED_SERVICES.length} services into service_pricing.`
  );
}
