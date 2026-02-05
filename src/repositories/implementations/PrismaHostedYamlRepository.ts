import { prisma } from '@/lib/prisma';
import type {
  IHostedYamlRepository,
  HostedYamlRecord,
  HostedYamlCreateInput,
  HostedYamlUpdateInput,
} from '../interfaces/IHostedYamlRepository';

export class PrismaHostedYamlRepository implements IHostedYamlRepository {
  async findAll(projectId?: string | null): Promise<HostedYamlRecord[]> {
    return prisma.hostedYaml.findMany({
      where: projectId ? { projectId } : undefined,
      include: {
        project: {
          select: {
            id: true,
            name: true,
            slug: true,
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  async create(data: HostedYamlCreateInput): Promise<HostedYamlRecord> {
    return prisma.hostedYaml.create({
      data: {
        id: data.id,
        projectId: data.projectId || null,
        orgId: data.orgId || null,
        name: data.name || null,
        yamlHash: data.yamlHash,
      },
    });
  }

  async update(id: string, data: HostedYamlUpdateInput): Promise<HostedYamlRecord> {
    return prisma.hostedYaml.update({
      where: { id },
      data: {
        ...(data.name !== undefined && { name: data.name }),
        ...(data.projectId !== undefined && { projectId: data.projectId }),
      },
    });
  }

  async delete(id: string): Promise<void> {
    await prisma.hostedYaml.delete({ where: { id } });
  }

  async incrementViewCount(id: string): Promise<void> {
    await prisma.hostedYaml.update({
      where: { id },
      data: {
        viewCount: { increment: 1 },
        lastAccessedAt: new Date(),
      },
    });
  }
}
