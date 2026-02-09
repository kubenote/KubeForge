// Core schema types
export interface Schema {
  type?: string | string[];
  $ref?: string;
  properties?: Record<string, Schema>;
  items?: Schema;
  additionalProperties?: boolean | Schema;
  description?: string;
  required?: string[];
}

// Plugin slot entry — tracks a plugin connected to a target node
export interface PluginSlotEntry {
  sourceNodeId: string;
  sourceNodeType: string;
  containerName?: string;
}

// Node data types
export interface BaseNodeData extends Record<string, unknown> {
  kind: string;
  apiVersion?: string;
  values?: Record<string, unknown>;
  pluginSlots?: PluginSlotEntry[];
  editing?: boolean;
  sourceFile?: string;
  showReadOnlyFields?: boolean;
}

export interface KindNodeData extends BaseNodeData {
  type: string;
}

export interface ObjectRefNodeData extends BaseNodeData {
  objectRef: string;
  nodeId?: string;
}

// Edge type - matches @xyflow/react Edge type
export interface FlowEdge {
  id: string;
  source: string;
  sourceHandle: string | null | undefined;
  target: string;
  targetHandle: string | null | undefined;
}

// Context types
export interface SchemaData {
  [key: string]: Schema;
}

export interface GVK {
  group: string;
  version: string;
  kind: string;
}

// Event system types
export type EventCallback<T = unknown> = (val: T) => void;
export type UnsubscribeFunction = () => void;

// Warning system types
export interface NodeWarning {
  id: number;
  ruleId: string;
  title: string;
  message: string;
  level?: 'info' | 'warn' | 'danger';
  nodes?: string[];
  fieldPath?: string;
}

export interface Notification {
  id: number;
  ruleId: string;
  title: string;
  message: string;
  level?: 'info' | 'warn' | 'danger';
  nodes?: string[];
  fieldPath?: string;
}

export type WarningContextType = {
  notifications: Notification[];
  setNotifications: (data: Notification[]) => void;
  suppressedKeys: Set<string>;
  suppressWarning: (key: string) => void;
  unsuppressWarning: (key: string) => void;
  filterNodeId: string | null;
  setFilterNodeId: (id: string | null) => void;
};

// Default flow data structure (from defaultFlow.json)
export interface DefaultFlowData {
  nodes: unknown[];
  edges: unknown[];
  schemdaData?: SchemaData; // Note: typo in original JSON file
}

// Node Provider types
export interface AddNodeParams {
  data: BaseNodeData;
  id?: string | null;
  targetNode?: string | null;
  type?: "KindNode" | "ObjectRefNode" | "StorageBucketNode" | "SecretRefNode" | "RegistryNode" | "ConfigMapNode" | "IngressNode" | "DatabaseNode" | "MessageQueueNode" | "LoggingSidecarNode" | "MonitoringNode" | "ServiceAccountNode";
}

export interface GetSchemaParams {
  schemas: string[];
  v?: string | null;
}

export type NodeContextType = {
  addNode: (params: AddNodeParams) => Promise<void>;
  getSchema: (params: GetSchemaParams) => Promise<boolean>;
};

// Context provider types
export type SchemaContextType = {
  schemaGvks: GVK[];
  setSchemaGvks: (data: GVK[]) => void;
  schemaData: SchemaData;
  setSchemaData: (data: SchemaData | ((prev: SchemaData) => SchemaData)) => void;
  loadGvks: (version: string) => Promise<void>;
};

export type VersionContextType = {
  version: string;
  setVersion: (v: string) => void;
  schemaData: SchemaData;
  setSchemaData: (data: SchemaData) => void;
  preRefSchemaData: SchemaData;
  setPreRefSchemaData: (data: SchemaData) => void;
  setProjectContext: (projectId: string | null, projectVersion: string | null) => void;
};