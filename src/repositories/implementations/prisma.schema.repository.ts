import { prisma } from '@/lib/prisma';
import type {
  ISchemaRepository,
  SchemaGvkRecord,
  KubernetesSchemaRecord,
  SchemaUpsertInput,
  GvkUpsertInput,
} from '../interfaces/schema.repository.interface';

export class PrismaSchemaRepository implements ISchemaRepository {
  async getGvks(version: string): Promise<SchemaGvkRecord[]> {
    return prisma.schemaGvk.findMany({
      where: { version },
      orderBy: [{ group: 'asc' }, { kind: 'asc' }],
    });
  }

  async getSchemas(version: string, keys: string[], resolved: boolean): Promise<KubernetesSchemaRecord[]> {
    return prisma.kubernetesSchema.findMany({
      where: {
        version,
        schemaKey: { in: keys },
        isFullyResolved: resolved,
      },
    });
  }

  async upsertSchema(data: SchemaUpsertInput): Promise<void> {
    await prisma.kubernetesSchema.upsert({
      where: {
        version_schemaKey_isFullyResolved: {
          version: data.version,
          schemaKey: data.schemaKey,
          isFullyResolved: data.isFullyResolved,
        },
      },
      create: {
        version: data.version,
        schemaKey: data.schemaKey,
        schemaData: data.schemaData,
        isFullyResolved: data.isFullyResolved,
      },
      update: {
        schemaData: data.schemaData,
      },
    });
  }

  async upsertGvk(data: GvkUpsertInput): Promise<void> {
    await prisma.schemaGvk.upsert({
      where: {
        version_group_gvkVersion_kind: {
          version: data.version,
          group: data.group,
          gvkVersion: data.gvkVersion,
          kind: data.kind,
        },
      },
      create: {
        version: data.version,
        group: data.group,
        gvkVersion: data.gvkVersion,
        kind: data.kind,
      },
      update: {},
    });
  }

  async hasVersion(version: string): Promise<boolean> {
    const count = await prisma.schemaGvk.count({ where: { version } });
    return count > 0;
  }
}
