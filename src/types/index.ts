// Core schema types
export interface Schema {
  type?: string | string[];
  $ref?: string;
  properties?: Record<string, Schema>;
  items?: Schema;
  description?: string;
}

// Node data types
export interface BaseNodeData extends Record<string, unknown> {
  kind: string;
  apiVersion?: string;
  values?: Record<string, unknown>;
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
  title: string;
  message: string;
  level?: 'info' | 'warn' | 'danger';
  nodes?: string[];
}

// Node Provider types
export interface AddNodeParams {
  data: BaseNodeData;
  id?: string | null;
  targetNode?: string | null;
  type?: "KindNode" | "ObjectRefNode";
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
};

export type VersionContextType = {
  version: string;
  setVersion: (v: string) => void;
  schemaData: SchemaData;
  setSchemaData: (data: SchemaData) => void;
  preRefSchemaData: SchemaData;
  setPreRefSchemaData: (data: SchemaData) => void;
};