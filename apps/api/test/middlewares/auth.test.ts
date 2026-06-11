import { describe, it, expect, vi } from "vitest";
import jwt from "jsonwebtoken";
import { requireAuth, requireRole, type AuthRequest } from "../../src/middlewares/auth";

function mockRes() {
  return {
    status: vi.fn().mockReturnThis(),
    json: vi.fn().mockReturnThis(),
  } as any;
}

describe("requireAuth", () => {
  it("401 si no hay header Authorization", () => {
    const req = { headers: {} } as AuthRequest;
    const res = mockRes();
    const next = vi.fn();
    requireAuth(req, res, next);
    expect(res.status).toHaveBeenCalledWith(401);
    expect(next).not.toHaveBeenCalled();
  });

  it("401 si el token es inválido", () => {
    const req = { headers: { authorization: "Bearer not-a-jwt" } } as any;
    const res = mockRes();
    const next = vi.fn();
    requireAuth(req, res, next);
    expect(res.status).toHaveBeenCalledWith(401);
  });

  it("401 si el token fue firmado con otro secret", () => {
    const bad = jwt.sign({ id: "u1", role: "CLIENT" }, "OTRO_SECRET");
    const req = { headers: { authorization: `Bearer ${bad}` } } as any;
    const res = mockRes();
    const next = vi.fn();
    requireAuth(req, res, next);
    expect(res.status).toHaveBeenCalledWith(401);
  });

  it("401 si el token expiró", () => {
    const expired = jwt.sign(
      { id: "u1", role: "CLIENT", email: "u@x.com" },
      process.env.NEXTAUTH_SECRET!,
      { expiresIn: -10 }
    );
    const req = { headers: { authorization: `Bearer ${expired}` } } as any;
    const res = mockRes();
    const next = vi.fn();
    requireAuth(req, res, next);
    expect(res.status).toHaveBeenCalledWith(401);
  });

  it("attach req.user y llama next() en token válido", () => {
    const good = jwt.sign(
      { id: "u1", role: "CLIENT", email: "a@b.c" },
      process.env.NEXTAUTH_SECRET!
    );
    const req = { headers: { authorization: `Bearer ${good}` } } as AuthRequest;
    const res = mockRes();
    const next = vi.fn();
    requireAuth(req, res, next);
    expect(next).toHaveBeenCalled();
    expect(req.user).toMatchObject({ id: "u1", role: "CLIENT" });
  });
});

describe("requireRole", () => {
  it("403 si no hay req.user", () => {
    const res = mockRes();
    const next = vi.fn();
    requireRole("ADMIN")({} as any, res, next);
    expect(res.status).toHaveBeenCalledWith(403);
    expect(next).not.toHaveBeenCalled();
  });

  it("403 si el rol no está en la lista", () => {
    const res = mockRes();
    const next = vi.fn();
    requireRole("ADMIN")(
      { user: { id: "u", role: "CLIENT", email: "x" } } as any,
      res,
      next
    );
    expect(res.status).toHaveBeenCalledWith(403);
  });

  it("acepta múltiples roles", () => {
    const res = mockRes();
    const next = vi.fn();
    requireRole("ADMIN", "PROVIDER")(
      { user: { id: "u", role: "PROVIDER", email: "x" } } as any,
      res,
      next
    );
    expect(next).toHaveBeenCalled();
  });
});
