import { describe, it, expect, vi, beforeEach } from "vitest";
import express from "express";
import request from "supertest";

// vi.hoisted: la factory de vi.mock se hoistea arriba de los imports, así que
// sendTextMock debe estar inicializado antes de que la factory lo lea.
const { sendTextMock } = vi.hoisted(() => ({
  sendTextMock: vi.fn().mockResolvedValue(undefined),
}));
vi.mock("../../../src/services/WhatsAppService", () => ({
  WhatsAppService: class {
    sendText = sendTextMock;
    sendTemplate = vi.fn();
  },
}));

vi.mock("../../../src/middlewares/validateWebhook", () => ({
  validateMPWebhook: (req: any, _res: any, next: any) => next(),
  validateWhatsAppWebhook: (req: any, _res: any, next: any) => next(),
}));

import { whatsappWebhookRouter } from "../../../src/routes/webhooks/whatsapp";

function makeApp() {
  const app = express();
  app.use(express.json());
  app.use("/api/webhooks/whatsapp", whatsappWebhookRouter);
  return app;
}

beforeEach(() => sendTextMock.mockClear());

describe("GET /api/webhooks/whatsapp — verificación Meta", () => {
  it("200 + challenge si el verify_token coincide", async () => {
    const res = await request(makeApp()).get(
      "/api/webhooks/whatsapp?hub.mode=subscribe&hub.verify_token=test-verify-token&hub.challenge=42"
    );
    expect(res.status).toBe(200);
    expect(res.text).toBe("42");
  });

  it("403 si verify_token no coincide", async () => {
    const res = await request(makeApp()).get(
      "/api/webhooks/whatsapp?hub.mode=subscribe&hub.verify_token=wrong&hub.challenge=42"
    );
    expect(res.status).toBe(403);
  });

  it("403 si mode != subscribe", async () => {
    const res = await request(makeApp()).get(
      "/api/webhooks/whatsapp?hub.mode=foo&hub.verify_token=test-verify-token"
    );
    expect(res.status).toBe(403);
  });
});

describe("POST /api/webhooks/whatsapp — mensajes entrantes", () => {
  function msgPayload(message: any) {
    return {
      entry: [{ changes: [{ value: { messages: [message] } }] }],
    };
  }

  it("responde 200 sincrónico", async () => {
    const res = await request(makeApp())
      .post("/api/webhooks/whatsapp")
      .send(msgPayload({ from: "549", type: "text", text: { body: "hola" } }));
    expect(res.status).toBe(200);
  });

  it("intent 'cancelar' responde con instrucciones", async () => {
    await request(makeApp())
      .post("/api/webhooks/whatsapp")
      .send(msgPayload({ from: "549", type: "text", text: { body: "Quiero cancelar" } }));
    await new Promise((r) => setTimeout(r, 20));
    expect(sendTextMock).toHaveBeenCalledWith("549", expect.stringMatching(/cancelar/i));
  });

  it("intent 'reprogramar'", async () => {
    await request(makeApp())
      .post("/api/webhooks/whatsapp")
      .send(msgPayload({ from: "549", type: "text", text: { body: "REPROGRAMAR" } }));
    await new Promise((r) => setTimeout(r, 20));
    expect(sendTextMock.mock.calls[0][1]).toMatch(/Mis Órdenes/);
  });

  it("intent 'soporte' / 'hablar' / 'ayuda'", async () => {
    for (const w of ["soporte", "hablar con alguien", "ayuda por favor"]) {
      sendTextMock.mockClear();
      await request(makeApp())
        .post("/api/webhooks/whatsapp")
        .send(msgPayload({ from: "549", type: "text", text: { body: w } }));
      await new Promise((r) => setTimeout(r, 20));
      expect(sendTextMock.mock.calls[0][1]).toMatch(/agente/);
    }
  });

  it("intent desconocido devuelve menú", async () => {
    await request(makeApp())
      .post("/api/webhooks/whatsapp")
      .send(msgPayload({ from: "549", type: "text", text: { body: "asdfgh" } }));
    await new Promise((r) => setTimeout(r, 20));
    expect(sendTextMock.mock.calls[0][1]).toMatch(/cancelar.*reprogramar.*soporte/i);
  });

  it("mensaje tipo image responde con ack de comprobante", async () => {
    await request(makeApp())
      .post("/api/webhooks/whatsapp")
      .send(msgPayload({ from: "549", type: "image" }));
    await new Promise((r) => setTimeout(r, 20));
    expect(sendTextMock.mock.calls[0][1]).toMatch(/comprobante/i);
  });

  it("payload sin entry no rompe (200)", async () => {
    const res = await request(makeApp())
      .post("/api/webhooks/whatsapp")
      .send({});
    expect(res.status).toBe(200);
  });
});
