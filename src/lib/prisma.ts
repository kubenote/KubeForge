import { PrismaClient } from '@prisma/client'

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined
}
const url = process.env.DEMO_MODE === 'true' 
  ? (process.env.DATABASE_URL_DEMO || process.env.DATABASE_URL || 'file:./dev.db')
  : (process.env.DATABASE_URL || 'file:./dev.db');

export const prisma = globalForPrisma.prisma ?? new PrismaClient({ datasources: { db: { url } } })

if (process.env.NODE_ENV !== 'production') globalForPrisma.prisma = prisma