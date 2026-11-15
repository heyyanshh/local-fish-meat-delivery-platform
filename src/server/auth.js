import NextAuth from "next-auth";
import Credentials from "next-auth/providers/credentials";
import { PrismaAdapter } from "@auth/prisma-adapter";
import { compare } from "bcryptjs";
import { z } from "zod";
import { db, databaseConfigured } from "@/server/db";
import { limitResponse } from "@/server/rate-limit";

const credentialsSchema = z.object({ email: z.email().max(254), password: z.string().min(8).max(128) });

export const { handlers, auth, signIn, signOut } = NextAuth({
  ...(databaseConfigured ? { adapter: PrismaAdapter(db) } : {}),
  session: { strategy: "jwt", maxAge: 60 * 60 * 24 * 7 },
  pages: { signIn: "/sign-in" },
  providers: [Credentials({
    credentials: { email: { label: "Email", type: "email" }, password: { label: "Password", type: "password" } },
    async authorize(input, request) {
      const parsed = credentialsSchema.safeParse(input);
      if (!parsed.success || !databaseConfigured) return null;
      try {
        const retryAfter = await limitResponse(db, request, { scope: "signin", subject: parsed.data.email, limit: 12, windowSeconds: 900 });
        if (retryAfter) return null;
      } catch { return null; }
      const user = await db.user.findUnique({ where: { email: parsed.data.email.toLowerCase() } });
      if (!user?.passwordHash || !(await compare(parsed.data.password, user.passwordHash))) return null;
      return { id: user.id, name: user.name, email: user.email, role: user.role };
    },
  })],
  callbacks: {
    async jwt({ token, user }) { if (user) { token.sub = user.id; token.role = user.role; } return token; },
    async session({ session, token }) { if (session.user) { session.user.id = token.sub; session.user.role = token.role || "CUSTOMER"; } return session; },
  },
});

export async function requireRole(allowedRoles) {
  const session = await auth();
  if (!session?.user?.id || !allowedRoles.includes(session.user.role)) return null;
  return session.user;
}
