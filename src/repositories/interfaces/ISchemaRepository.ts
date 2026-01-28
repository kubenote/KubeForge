export interface SchemaGvkRecord {
  id: string;
  version: string;
  group: string;
  gvkVersion: string;
  kind: string;
  createdAt: Date;
}

export interface KubernetesSchemaRecord {
  id: string;
  version: string;
  schemaKey: string;
  schemaData: string;
  isFullyResolved: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export interface SchemaUpsertInput {
  version: string;
  schemaKey: string;
  schemaData: string;
  isFullyResolved: boolean;
}

export interface GvkUpsertInput {
  version: string;
  group: string;
  gvkVersion: string;
  kind: string;
}

export interface ISchemaRepository {
  getGvks(version: string): Promise<SchemaGvkRecord[]>;
  getSchemas(version: string, keys: string[], resolved: boolean): Promise<KubernetesSchemaRecord[]>;
  upsertSchema(data: SchemaUpsertInput): Promise<void>;
  upsertGvk(data: GvkUpsertInput): Promise<void>;
  hasVersion(version: string): Promise<boolean>;
}
