import { prismaAdapter } from "@better-auth/prisma-adapter";
import { betterAuth } from "better-auth";
import { headers } from "next/headers";
import { getPrisma } from "@/lib/db";
import { AppError } from "@/lib/errors";
import { getServerEnv } from "@/lib/env";

export const auth = betterAuth({
  database: prismaAdapter(getPrisma(), {
    provider: "postgresql",
  }),
  emailAndPassword: {
    enabled: true,
    minPasswordLength: 8,
    maxPasswordLength: 128,
  },
  secret: getServerEnv().BETTER_AUTH_SECRET,
  baseURL: getServerEnv().BETTER_AUTH_URL,
  advanced: {
    defaultCookieAttributes: {
      sameSite: "lax",
      secure: getServerEnv().NODE_ENV === "production",
      httpOnly: true,
    },
  },
});

export type AuthenticatedUser = {
  id: string;
  email: string;
  name: string;
};

export async function getCurrentUser(): Promise<AuthenticatedUser | null> {
  const session = await auth.api.getSession({
    headers: await headers(),
  });

  if (!session?.user) return null;

  return {
    id: session.user.id,
    email: session.user.email,
    name: session.user.name,
  };
}

export async function requireCurrentUser(): Promise<AuthenticatedUser> {
  const user = await getCurrentUser();
  if (!user) {
    throw new AppError("AUTHENTICATION_REQUIRED", "Sign in to continue.");
  }
  return user;
}
