import crypto from "crypto";
import type { Request, Response, NextFunction } from "express";

export function validateMPWebhook(
  req: Request,
  res: Response,
  next: NextFunction
) {
  const rawBody = req.body as Buffer;
  const xSignature = req.headers["x-signature"] as string | undefined;
  const xRequestId = req.headers["x-request-id"] as string | undefined;

  if (!xSignature || !xRequestId) {
    res.status(401).json({ error: "Missing signature headers" });
    return;
  }

  const secret = process.env["MP_WEBHOOK_SECRET"];
  if (!secret) {
    res.status(500).json({ error: "Webhook secret not configured" });
    return;
  }

  // MP firma: "id={id}&request-id={requestId}&ts={ts}"
  const dataId = req.query["data.id"] as string | undefined;
  const ts = xSignature.split(",").find((p) => p.startsWith("ts="))?.split("=")[1];
  const v1 = xSignature.split(",").find((p) => p.startsWith("v1="))?.split("=")[1];

  if (!ts || !v1) {
    res.status(401).json({ error: "Malformed x-signature" });
    return;
  }

  const manifest = `id=${dataId ?? ""};request-id=${xRequestId};ts=${ts};`;
  const expected = crypto
    .createHmac("sha256", secret)
    .update(manifest)
    .digest("hex");

  if (!crypto.timingSafeEqual(Buffer.from(expected), Buffer.from(v1))) {
    res.status(401).json({ error: "Invalid webhook signature" });
    return;
  }

  // Pasar body parseado para el siguiente handler
  req.body = JSON.parse(rawBody.toString());
  next();
}

export function validateWhatsAppWebhook(
  req: Request,
  res: Response,
  next: NextFunction
) {
  const rawBody = req.body as Buffer;
  const xHubSignature = req.headers["x-hub-signature-256"] as string | undefined;

  if (!xHubSignature) {
    res.status(401).json({ error: "Missing x-hub-signature-256" });
    return;
  }

  const secret = process.env["WA_ACCESS_TOKEN"];
  if (!secret) {
    res.status(500).json({ error: "WA secret not configured" });
    return;
  }

  const expected =
    "sha256=" +
    crypto.createHmac("sha256", secret).update(rawBody).digest("hex");

  if (!crypto.timingSafeEqual(Buffer.from(expected), Buffer.from(xHubSignature))) {
    res.status(401).json({ error: "Invalid webhook signature" });
    return;
  }

  req.body = JSON.parse(rawBody.toString());
  next();
}
