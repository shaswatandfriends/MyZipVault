import type { NextAuthOptions } from "next-auth";
import CredentialsProvider from "next-auth/providers/credentials";
import { compare } from "bcryptjs";
import { db } from "@/lib/db";

// Server-side superadmin email — never exposed to the client
const SUPERADMIN_EMAIL = process.env.SUPERADMIN_EMAIL || "";

export const authOptions: NextAuthOptions = {
  providers: [
    CredentialsProvider({
      name: "credentials",
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Password", type: "password" },
      },
      async authorize(credentials) {
        if (!credentials?.email || !credentials?.password) {
          throw new Error("Email and password are required");
        }

        // Map the superadmin placeholder to the actual env-configured email
        let lookupEmail = credentials.email;
        if (credentials.email === "__superadmin__" && SUPERADMIN_EMAIL) {
          lookupEmail = SUPERADMIN_EMAIL;
        }

        const user = await db.user.findUnique({
          where: { email: lookupEmail },
        });

        if (!user) {
          throw new Error("Invalid email or password");
        }

        if (user.accountStatus === "suspended" || user.accountStatus === "deleted" || user.accountStatus === "suspended_deleting") {
          throw new Error("Account is not active. Please contact support.");
        }

        // Super Admin gate: only the env-configured email can be super_admin
        if (user.role === "super_admin") {
          if (!SUPERADMIN_EMAIL || user.email.toLowerCase() !== SUPERADMIN_EMAIL.toLowerCase()) {
            throw new Error("Unauthorized access");
          }
        }

        const isValidPassword = await compare(
          credentials.password,
          user.password_hash
        );

        if (!isValidPassword) {
          throw new Error("Invalid email or password");
        }

        return {
          id: String(user.id),
          email: user.email,
          role: user.role,
          organizationId: user.organization_id,
          isApproved: user.is_approved,
          firstName: user.first_name,
          lastName: user.last_name,
        };
      },
    }),
  ],
  session: {
    strategy: "jwt",
    maxAge: 24 * 60 * 60, // 24 hours
  },
  callbacks: {
    async jwt({ token, user }) {
      if (user) {
        token.id = user.id;
        token.role = (user as Record<string, unknown>).role as string;
        token.organizationId = (user as Record<string, unknown>).organizationId as number | null;
        token.isApproved = (user as Record<string, unknown>).isApproved as boolean;
        token.firstName = (user as Record<string, unknown>).firstName as string | null;
        token.lastName = (user as Record<string, unknown>).lastName as string | null;
      }
      return token;
    },
    async session({ session, token }) {
      if (session.user) {
        session.user.id = token.id as string;
        (session.user as Record<string, unknown>).role = token.role;
        (session.user as Record<string, unknown>).organizationId = token.organizationId;
        (session.user as Record<string, unknown>).isApproved = token.isApproved;
        (session.user as Record<string, unknown>).firstName = token.firstName;
        (session.user as Record<string, unknown>).lastName = token.lastName;
      }
      return session;
    },
  },
  pages: {
    signIn: "/login",
    error: "/login",
  },
  secret: process.env.NEXTAUTH_SECRET,
};
