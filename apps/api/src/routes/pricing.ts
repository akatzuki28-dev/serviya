import { Router } from "express";
import { z } from "zod";
import { PricingService } from "../services/PricingService";

export const pricingRouter = Router();

const quoteSchema = z.object({
  serviceType: z.string().min(1),
  zone: z.string().optional(),
  extras: z.array(z.string()).optional(),
});

// POST /api/pricing/quote — cotización dinámica
pricingRouter.post("/quote", async (req, res) => {
  const parsed = quoteSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.flatten() });
    return;
  }

  try {
    const quote = await PricingService.quote(parsed.data);
    res.json(quote);
  } catch (err) {
    if (err instanceof Error && err.message.startsWith("No pricing found")) {
      res.status(404).json({ error: err.message });
      return;
    }
    res.status(500).json({ error: "Error al calcular cotización" });
  }
});
