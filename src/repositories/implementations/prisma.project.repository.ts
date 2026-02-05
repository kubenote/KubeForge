import { prisma } from '@/lib/prisma';
import type {
  IProjectRepository,
  ProjectCreateInput,
  ProjectUpdateInput,
  ProjectWithVersions,
  ProjectWithLatestVersion,
  ProjectVersionWithProject,
  ProjectVersionRecord,
  PaginatedVersions,
} from '../interfaces/project.repository.interface';

export class PrismaProjectRepository implements IProjectRepository {
  async findAll(): Promise<ProjectWithLatestVersion[]> {
    return prisma.project.findMany({
      include: {
        versions: {
          orderBy: { createdAt: 'desc' },
          take: 1,
        },
        _count: {
          select: {
            versions: true,
            hostedYamls: true,
          },
        },
      },
      orderBy: { updatedAt: 'desc' },
    }) as unknown as ProjectWithLatestVersion[];
  }

  async findById(id: string): Promise<ProjectWithVersions | null> {
    return prisma.project.findUnique({
      where: { id },
      include: {
        versions: {
          orderBy: { createdAt: 'desc' },
          take: 10,
          select: {
            id: true,
            slug: true,
            createdAt: true,
            message: true,
            nodes: true,
            edges: true,
          },
        },
      },
    }) as unknown as ProjectWithVersions | null;
  }

  async findBySlug(slug: string): Promise<ProjectWithVersions | null> {
    return prisma.project.findUnique({
      where: { slug },
      include: {
        versions: {
          orderBy: { createdAt: 'desc' },
          take: 10,
          select: {
            id: true,
            slug: true,
            createdAt: true,
            message: true,
            nodes: true,
            edges: true,
          },
        },
      },
    }) as unknown as ProjectWithVersions | null;
  }

  async create(data: ProjectCreateInput): Promise<ProjectWithLatestVersion> {
    return prisma.project.create({
      data: {
        name: data.name,
        slug: data.slug,
        kubernetesVersion: data.kubernetesVersion,
        gitSource: data.gitSource as unknown as string | undefined,
        versions: {
          create: {
            slug: data.initialVersion.slug,
            nodes: data.initialVersion.nodes,
            edges: data.initialVersion.edges,
            message: data.initialVersion.message,
          },
        },
      },
      include: {
        versions: {
          orderBy: { createdAt: 'desc' },
          take: 1,
        },
      },
    }) as unknown as ProjectWithLatestVersion;
  }

  async update(id: string, data: ProjectUpdateInput): Promise<ProjectWithLatestVersion> {
    return prisma.project.update({
      where: { id },
      data: {
        ...(data.name && { name: data.name }),
        ...(data.slug && { slug: data.slug }),
        ...(data.newVersion && {
          versions: {
            create: {
              slug: data.newVersion.slug,
              nodes: data.newVersion.nodes,
              edges: data.newVersion.edges,
              message: data.newVersion.message,
            },
          },
        }),
      },
      include: {
        versions: {
          orderBy: { createdAt: 'desc' },
          take: 1,
        },
      },
    }) as unknown as ProjectWithLatestVersion;
  }

  async delete(id: string): Promise<{ id: string; name: string }> {
    const deleted = await prisma.project.delete({ where: { id } });
    return { id: deleted.id, name: deleted.name };
  }

  async findVersionsByProjectId(projectId: string, limit: number, offset: number): Promise<PaginatedVersions> {
    const [versions, totalVersions] = await Promise.all([
      prisma.projectVersion.findMany({
        where: { projectId },
        orderBy: { createdAt: 'desc' },
        take: limit,
        skip: offset,
      }),
      prisma.projectVersion.count({ where: { projectId } }),
    ]);

    return {
      versions,
      totalVersions,
      hasMore: offset + versions.length < totalVersions,
    };
  }

  async findVersion(projectId: string, versionIdOrSlug: string, isSlug: boolean): Promise<ProjectVersionWithProject | null> {
    return prisma.projectVersion.findFirst({
      where: {
        projectId,
        ...(isSlug ? { slug: versionIdOrSlug } : { id: versionIdOrSlug }),
      },
      include: { project: true },
    }) as unknown as ProjectVersionWithProject | null;
  }

  async deleteVersion(versionId: string): Promise<void> {
    await prisma.projectVersion.delete({ where: { id: versionId } });
  }

  async findLatestVersion(projectId: string): Promise<ProjectVersionRecord | null> {
    return prisma.projectVersion.findFirst({
      where: { projectId },
      orderBy: { createdAt: 'desc' },
    });
  }

  async isVersionSlugUnique(slug: string): Promise<boolean> {
    const existing = await prisma.projectVersion.findUnique({ where: { slug } });
    return !existing;
  }
}
