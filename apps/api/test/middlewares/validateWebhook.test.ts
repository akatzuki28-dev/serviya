import { describe, it, expect, vi } from "vitest";
import crypto from "node:crypto";
import {
  validateMPWebhook,
  validateMobbexWebhook,
  validateWhatsAppWebhook,
} from "../../src/middlewares/validateWebhook";

function mockRes() {
  return {
    status: vi.fn().mockReturnThis(),
    json: vi.fn().mockReturnThis(),
    send: vi.fn().mockReturnThis(),
  } as any;
}

// ── MERCADO PAGO ───────────────────────────────────────────────────────────
describe("validateMPWebhook", () => {
  const secret = process.env.MP_WEBHOOK_SECRET!;
  const dataId = "PAYMENT-123";
  const requestId = "req-abc";
  const ts = "1700000000";

  function buildSignature(id = dataId, rid = requestId, t = ts, sec = secret) {
    // MP arma el manifiesto con ':' y ';' y lowercasea data.id.
    const manifest = `id:${id.toLowerCase()};request-id:${rid};ts:${t};`;
    const v1 = crypto.createHmac("sha256", sec).update(manifest).digest("hex");
    return `ts=${t},v1=${v1}`;
  }

  function buildReq(overrides: Partial<any> = {}) {
    const body = Buffer.from(JSON.stringify({ type: "payment", data: { id: dataId } }));
    return {
      body,
      headers: {
        "x-signature": buildSignature(),
        "x-request-id": requestId,
        ...overrides.headers,
      },
      query: { "data.id": dataId, ...overrides.query },
    } as any;
  }

  it("happy path: firma válida pasa al next y parsea body", () => {
    const req = buildReq();
    const res = mockRes();
    const next = vi.fn();
    validateMPWebhook(req, res, next);
    expect(next).toHaveBeenCalled();
    expect(req.body).toEqual({ type: "payment", data: { id: dataId } });
  });

  it("401 si falta x-signature", () => {
    const req = buildReq({ headers: { "x-signature": undefined } });
    const res = mockRes();
    const next = vi.fn();
    validateMPWebhook(req, res, next);
    expect(res.status).toHaveBeenCalledWith(401);
    expect(next).not.toHaveBeenCalled();
  });

  it("401 si falta x-request-id", () => {
    const req = buildReq({ headers: { "x-request-id": undefined } });
    const res = mockRes();
    const next = vi.fn();
    validateMPWebhook(req, res, next);
    expect(res.status).toHaveBeenCalledWith(401);
  });

  it("401 si x-signature está malformado (sin ts/v1)", () => {
    const req = buildReq({ headers: { "x-signature": "garbage" } });
    const res = mockRes();
    const next = vi.fn();
    validateMPWebhook(req, res, next);
    expect(res.status).toHaveBeenCalledWith(401);
  });

  it("401 si la firma es válida pero con otro secret", () => {
    const req = buildReq({
      headers: { "x-signature": buildSignature(dataId, requestId, ts, "wrong-secret") },
    });
    const res = mockRes();
    const next = vi.fn();
    validateMPWebhook(req, res, next);
    expect(res.status).toHaveBeenCalledWith(401);
  });

  it("401 si el atacante altera data.id sin recalcular firma", () => {
    const req = buildReq({ query: { "data.id": "TAMPERED" } });
    const res = mockRes();
    const next = vi.fn();
    validateMPWebhook(req, res, next);
    expect(res.status).toHaveBeenCalledWith(401);
  });

  it("500 si MP_WEBHOOK_SECRET no está configurado", () => {
    const prev = process.env.MP_WEBHOOK_SECRET;
    delete process.env.MP_WEBHOOK_SECRET;
    try {
      const req = buildReq();
      const res = mockRes();
      const next = vi.fn();
      validateMPWebhook(req, res, next);
      expect(res.status).toHaveBeenCalledWith(500);
    } finally {
      process.env.MP_WEBHOOK_SECRET = prev;
    }
  });
});

// ── MOBBEX ─────────────────────────────────────────────────────────────────
describe("validateMobbexWebhook", () => {
  const secret = process.env.MOBBEX_WEBHOOK_SECRET!;

  // null = omitir el secreto del query (no usamos undefined: pasarlo dispararía
  // el valor por defecto del parámetro).
  function buildReq(querySecret: string | null = secret) {
    const body = Buffer.from(
      JSON.stringify({ type: "payment", data: { payment: { id: "p1" } } })
    );
    return {
      body,
      headers: {},
      query: querySecret === null ? {} : { secret: querySecret },
    } as any;
  }

  it("happy path: secreto correcto pasa al next y parsea body", () => {
    const req = buildReq();
    const res = mockRes();
    const next = vi.fn();
    validateMobbexWebhook(req, res, next);
    expect(next).toHaveBeenCalled();
    expect(req.body).toEqual({ type: "payment", data: { payment: { id: "p1" } } });
  });

  it("401 si falta el secreto en el query", () => {
    const req = buildReq(null);
    const res = mockRes();
    const next = vi.fn();
    validateMobbexWebhook(req, res, next);
    expect(res.status).toHaveBeenCalledWith(401);
    expect(next).not.toHaveBeenCalled();
  });

  it("401 si el secreto no coincide", () => {
    const req = buildReq("wrong-secret");
    const res = mockRes();
    const next = vi.fn();
    validateMobbexWebhook(req, res, next);
    expect(res.status).toHaveBeenCalledWith(401);
  });

  it("500 si MOBBEX_WEBHOOK_SECRET no está configurado", () => {
    const prev = process.env.MOBBEX_WEBHOOK_SECRET;
    delete process.env.MOBBEX_WEBHOOK_SECRET;
    try {
      const req = buildReq("anything");
      const res = mockRes();
      const next = vi.fn();
      validateMobbexWebhook(req, res, next);
      expect(res.status).toHaveBeenCalledWith(500);
    } finally {
      process.env.MOBBEX_WEBHOOK_SECRET = prev;
    }
  });
});

// ── WHATSAPP / META ────────────────────────────────────────────────────────
describe("validateWhatsAppWebhook", () => {
  const secret = process.env.WA_ACCESS_TOKEN!;

  function buildReq(payload: object = { entry: [] }, customSig?: string) {
    const raw = Buffer.from(JSON.stringify(payload));
    const sig =
      customSig ??
      "sha256=" + crypto.createHmac("sha256", secret).update(raw).digest("hex");
    return {
      body: raw,
      headers: { "x-hub-signature-256": sig },
    } as any;
  }

  it("happy path: firma SHA-256 válida pasa al next", () => {
    const req = buildReq({ entry: [{ id: "x" }] });
    const res = mockRes();
    const next = vi.fn();
    validateWhatsAppWebhook(req, res, next);
    expect(next).toHaveBeenCalled();
    expect(req.body).toEqual({ entry: [{ id: "x" }] });
  });

  it("401 si falta el header x-hub-signature-256", () => {
    const req = { body: Buffer.from("{}"), headers: {} } as any;
    const res = mockRes();
    const next = vi.fn();
    validateWhatsAppWebhook(req, res, next);
    expect(res.status).toHaveBeenCalledWith(401);
  });

  it("401 si la firma no coincide (body tampered)", () => {
    const raw = Buffer.from(JSON.stringify({ entry: [] }));
    const sig =
      "sha256=" +
      crypto.createHmac("sha256", secret).update(Buffer.from("{}")).digest("hex");
    const req = { body: raw, headers: { "x-hub-signature-256": sig } } as any;
    const res = mockRes();
    const next = vi.fn();
    validateWhatsAppWebhook(req, res, next);
    expect(res.status).toHaveBeenCalledWith(401);
  });
});
