import type { Request, Response, NextFunction } from "express";

/**
 * Simple shared-secret middleware for admin-only API routes.
 * The web app sends `x-admin-secret` header with the value of
 * ADMIN_SECRET env var. Used by the /admin/* dashboard pages.
 */
export function requireAdminSecret(
  req: Request,
  res: Response,
  next: NextFunction
) {
  const expected = process.env["ADMIN_SECRET"];
  if (!expected) {
    res.status(500).json({ error: "ADMIN_SECRET no configurado en el servidor" });
    return;
  }
  const provided = req.headers["x-admin-secret"];
  if (provided !== expected) {
    res.status(403).json({ error: "Acceso denegado" });
    return;
  }
  next();
}
