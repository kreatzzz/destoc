import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "@/generated/prisma/client";
import { getServerEnv } from "@/lib/env";

const globalForPrisma = globalThis as unknown as {
  prisma?: PrismaClient;
};

export function getPrisma(): PrismaClient {
  if (globalForPrisma.prisma) return globalForPrisma.prisma;

  const adapter = new PrismaPg(getServerEnv().DATABASE_URL);
  const prisma = new PrismaClient({ adapter });

  // Both the web server and the BullMQ worker are long-lived processes.
  // Reuse one client per process so repeated jobs do not leak connection pools.
  globalForPrisma.prisma = prisma;

  return prisma;
}
