// @ts-nocheck
import { prisma } from '@/lib/prisma';

export async function getKubeSchemaBranches(): Promise<string[]> {
  try {
    const versions = await prisma.schemaGvk.findMany({
      select: { version: true },
      distinct: ['version'],
      orderBy: { version: 'desc' },
    });

    return versions.map((v: { version: string }) => v.version);
  } catch {
    return [];
  }
}
