import jwt from "jsonwebtoken";

export function token(payload: { id: string; role?: string; email?: string }) {
  return jwt.sign(
    {
      id: payload.id,
      role: payload.role ?? "CLIENT",
      email: payload.email ?? `${payload.id}@example.com`,
    },
    process.env.NEXTAUTH_SECRET!
  );
}

export function bearer(payload: Parameters<typeof token>[0]) {
  return `Bearer ${token(payload)}`;
}
