export interface ProjectCreateInput {
  name: string;
  slug: string;
  kubernetesVersion?: string;
  initialVersion: {
    slug: string;
    nodes: string;
    edges: string;
    message?: string;
  };
}

export interface ProjectUpdateInput {
  name?: string;
  slug?: string;
  newVersion?: {
    slug: string;
    nodes: string;
    edges: string;
    message?: string;
  };
}

export interface ProjectWithVersions {
  id: string;
  name: string;
  slug: string;
  kubernetesVersion: string | null;
  createdAt: Date;
  updatedAt: Date;
  versions: ProjectVersionRecord[];
}

export interface ProjectWithLatestVersion {
  id: string;
  name: string;
  slug: string;
  kubernetesVersion: string | null;
  createdAt: Date;
  updatedAt: Date;
  versions: ProjectVersionRecord[];
  _count?: {
    versions: number;
    hostedYamls: number;
  };
}

export interface ProjectVersionRecord {
  id: string;
  slug: string | null;
  projectId: string;
  nodes: string;
  edges: string;
  createdAt: Date;
  message: string | null;
}

export interface ProjectVersionWithProject extends ProjectVersionRecord {
  project: {
    id: string;
    name: string;
    slug: string;
    kubernetesVersion: string | null;
    createdAt: Date;
    updatedAt: Date;
  };
}

export interface PaginatedVersions {
  versions: ProjectVersionRecord[];
  totalVersions: number;
  hasMore: boolean;
}

export interface IProjectRepository {
  findAll(): Promise<ProjectWithLatestVersion[]>;
  findById(id: string): Promise<ProjectWithVersions | null>;
  findBySlug(slug: string): Promise<ProjectWithVersions | null>;
  create(data: ProjectCreateInput): Promise<ProjectWithLatestVersion>;
  update(id: string, data: ProjectUpdateInput): Promise<ProjectWithLatestVersion>;
  delete(id: string): Promise<{ id: string; name: string }>;

  findVersionsByProjectId(projectId: string, limit: number, offset: number): Promise<PaginatedVersions>;
  findVersion(projectId: string, versionIdOrSlug: string, isSlug: boolean): Promise<ProjectVersionWithProject | null>;
  deleteVersion(versionId: string): Promise<void>;
  findLatestVersion(projectId: string): Promise<ProjectVersionRecord | null>;
  isVersionSlugUnique(slug: string): Promise<boolean>;
}
