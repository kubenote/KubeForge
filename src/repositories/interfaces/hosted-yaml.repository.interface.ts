export interface HostedYamlRecord {
  id: string;
  projectId: string | null;
  name: string | null;
  yamlHash: string;
  viewCount: number;
  createdAt: Date;
  lastAccessedAt: Date | null;
  project?: {
    id: string;
    name: string;
    slug: string;
  } | null;
}

export interface HostedYamlCreateInput {
  id: string;
  projectId?: string | null;
  orgId?: string | null;
  name?: string | null;
  yamlHash: string;
}

export interface HostedYamlUpdateInput {
  name?: string;
  projectId?: string | null;
}

export interface IHostedYamlRepository {
  findAll(projectId?: string | null): Promise<HostedYamlRecord[]>;
  create(data: HostedYamlCreateInput): Promise<HostedYamlRecord>;
  update(id: string, data: HostedYamlUpdateInput): Promise<HostedYamlRecord>;
  delete(id: string): Promise<void>;
  incrementViewCount(id: string): Promise<void>;
}
