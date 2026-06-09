import NextAuth from "next-auth";
import Google from "next-auth/providers/google";
import Credentials from "next-auth/providers/credentials";
import { DrizzleAdapter } from "@auth/drizzle-adapter";
import { z } from "zod";
import { getDb, schema } from "@sp/db";
import { eq } from "drizzle-orm";

function isAdminEmail(email: string | null | undefined): boolean {
  if (!email) return false;
  const admins = (process.env.ADMIN_EMAILS ?? "")
    .split(",")
    .map((e) => e.trim().toLowerCase())
    .filter(Boolean);
  return admins.includes(email.toLowerCase());
}

export const { handlers, auth, signIn, signOut } = NextAuth({
  adapter: DrizzleAdapter(getDb(), {
    usersTable: schema.users,
    accountsTable: schema.accounts,
  }),
  session: { strategy: "jwt" },
  providers: [
    Google({
      clientId: process.env.GOOGLE_CLIENT_ID,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET,
      // Permitir vincular cuentas OAuth a un user existente cuyo email coincida.
      allowDangerousEmailAccountLinking: true,
    }),
    Credentials({
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Contraseña", type: "password" },
      },
      async authorize(credentials) {
        const parsed = z
          .object({ email: z.string().email(), password: z.string().min(6) })
          .safeParse(credentials);

        if (!parsed.success) return null;

        try {
          const res = await fetch(
            `${process.env.NEXT_PUBLIC_API_URL}/api/auth/login`,
            {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify(parsed.data),
            }
          );

          if (!res.ok) return null;
          const user = await res.json();
          return user;
        } catch {
          return null;
        }
      },
    }),
  ],
  callbacks: {
    async jwt({ token, user }) {
      // user solo está presente en el sign-in inicial.
      if (user?.id) {
        token.id = user.id;
        const db = getDb();

        // Promoción a ADMIN si el email está en ADMIN_EMAILS y la DB aún no lo refleja.
        if (isAdminEmail(user.email)) {
          await db
            .update(schema.users)
            .set({ role: "ADMIN", updatedAt: new Date() })
            .where(eq(schema.users.id, user.id));
          token.role = "ADMIN";
        } else {
          const row = await db.query.users.findFirst({
            where: eq(schema.users.id, user.id),
          });
          token.role = row?.role ?? "CLIENT";
        }
      }
      return token;
    },
    async session({ session, token }) {
      if (session.user) {
        (session.user as { id?: string; role?: string }).id = token.id as string;
        (session.user as { id?: string; role?: string }).role = token.role as string;
      }
      return session;
    },
  },
  pages: {
    signIn: "/auth/login",
  },
  secret: process.env.NEXTAUTH_SECRET,
});
