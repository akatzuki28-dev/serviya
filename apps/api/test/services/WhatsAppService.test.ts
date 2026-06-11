import { describe, it, expect, vi, beforeEach } from "vitest";
import axios from "axios";
import { WhatsAppService } from "../../src/services/WhatsAppService";

vi.mock("axios");

beforeEach(() => {
  (axios as any).post = vi.fn().mockResolvedValue({ data: {} });
});

describe("WhatsAppService", () => {
  it("sendTemplate construye payload con componentes y language es_AR", async () => {
    const wa = new WhatsAppService();
    await wa.sendTemplate("5491133334444", "order_confirmation", [
      "limpieza",
      "01/01/2026",
      "10:00",
      "Juan",
    ]);
    const [url, body] = (axios as any).post.mock.calls[0];
    expect(url).toContain("/1234567890/messages");
    expect(body.type).toBe("template");
    expect(body.template.name).toBe("order_confirmation");
    expect(body.template.language.code).toBe("es_AR");
    expect(body.template.components[0].parameters).toHaveLength(4);
  });

  it("sendTemplate sin variables omite components", async () => {
    const wa = new WhatsAppService();
    await wa.sendTemplate("5491133334444", "payment_link", []);
    const body = (axios as any).post.mock.calls[0][1];
    expect(body.template.components).toEqual([]);
  });

  it("sendText envía cuerpo plano", async () => {
    const wa = new WhatsAppService();
    await wa.sendText("5491133334444", "hola");
    const body = (axios as any).post.mock.calls[0][1];
    expect(body.type).toBe("text");
    expect(body.text.body).toBe("hola");
  });

  it("normalizePhone: '011 3333-4444' → '541133334444'", async () => {
    const wa = new WhatsAppService();
    await wa.sendText("011 3333-4444", "x");
    const body = (axios as any).post.mock.calls[0][1];
    expect(body.to).toBe("541133334444");
  });

  it("normalizePhone: ya internacional '5491133334444' se mantiene", async () => {
    const wa = new WhatsAppService();
    await wa.sendText("5491133334444", "x");
    const body = (axios as any).post.mock.calls[0][1];
    expect(body.to).toBe("5491133334444");
  });
});
