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

  // MP arma el manifiesto con ':' y ';' como separadores y lo firma con HMAC-SHA256:
  //   id:{data.id};request-id:{x-request-id};ts:{ts};
  // Si data.id es alfanumérico debe ir en minúsculas (los payment_id son numéricos,
  // así que toLowerCase es no-op, pero seguimos la spec al pie de la letra).
  const dataId = (req.query["data.id"] as string | undefined)?.toLowerCase();
  const ts = xSignature.split(",").find((p) => p.startsWith("ts="))?.split("=")[1];
  const v1 = xSignature.split(",").find((p) => p.startsWith("v1="))?.split("=")[1];

  if (!ts || !v1) {
    res.status(401).json({ error: "Malformed x-signature" });
    return;
  }

  const manifest = `id:${dataId ?? ""};request-id:${xRequestId};ts:${ts};`;
  const expected = crypto
    .createHmac("sha256", secret)
    .update(manifest)
    .digest("hex");

  // timingSafeEqual tira RangeError si los buffers difieren en longitud, así que
  // comparamos longitud primero y respondemos 401 (no 500) ante una firma rara.
  const expectedBuf = Buffer.from(expected);
  const v1Buf = Buffer.from(v1);
  if (
    expectedBuf.length !== v1Buf.length ||
    !crypto.timingSafeEqual(expectedBuf, v1Buf)
  ) {
    res.status(401).json({ error: "Invalid webhook signature" });
    return;
  }

  // Pasar body parseado para el siguiente handler
  req.body = JSON.parse(rawBody.toString());
  next();
}

export function validateMobbexWebhook(
  req: Request,
  res: Response,
  next: NextFunction
) {
  const rawBody = req.body as Buffer;

  const secret = process.env["MOBBEX_WEBHOOK_SECRET"];
  if (!secret) {
    res.status(500).json({ error: "Webhook secret not configured" });
    return;
  }

  // Mobbex NO firma los webhooks con HMAC. Validamos un secreto compartido que
  // viaja en el query del webhook URL que registramos al crear el checkout
  // (?secret=...). La autenticidad del estado se refuerza en el servicio, que
  // re-consulta la operación a la API de Mobbex.
  const provided = req.query["secret"] as string | undefined;
  const providedBuf = Buffer.from(provided ?? "");
  const secretBuf = Buffer.from(secret);

  if (
    providedBuf.length !== secretBuf.length ||
    !crypto.timingSafeEqual(providedBuf, secretBuf)
  ) {
    res.status(401).json({ error: "Invalid webhook secret" });
    return;
  }

  req.body = JSON.parse(rawBody.toString());
  next();
}

export function validateUalaWebhook(
  req: Request,
  res: Response,
  next: NextFunction
) {
  const rawBody = req.body as Buffer;

  const secret = process.env["UALA_WEBHOOK_SECRET"];
  if (!secret) {
    res.status(500).json({ error: "Webhook secret not configured" });
    return;
  }

  // Ualá Bis NO firma los webhooks con HMAC. Validamos un secreto compartido que
  // viaja en el query del notification_url que registramos al crear la orden
  // (?secret=...). La autenticidad del estado se refuerza en el servicio, que
  // re-consulta la orden a la API de Ualá.
  const provided = req.query["secret"] as string | undefined;
  const providedBuf = Buffer.from(provided ?? "");
  const secretBuf = Buffer.from(secret);

  if (
    providedBuf.length !== secretBuf.length ||
    !crypto.timingSafeEqual(providedBuf, secretBuf)
  ) {
    res.status(401).json({ error: "Invalid webhook secret" });
    return;
  }

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
