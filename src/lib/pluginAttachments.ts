/**
 * Plugin attachment registry — defines how each plugin node type
 * attaches to target nodes (scope, label, color, injected fields).
 */

export type PluginScope = 'container' | 'pod' | 'metadata' | 'resource';

export interface PluginAttachment {
  scope: PluginScope;
  label: string;
  color: string;
  icon: string;
  injectedFields: string[];
}

export const PLUGIN_ATTACHMENTS: Record<string, PluginAttachment> = {
  StorageBucketNode: {
    scope: 'container',
    label: 'Storage Bucket',
    color: 'amber',
    icon: 'HardDrive',
    injectedFields: ['volumes', 'volumeMounts'],
  },
  SecretRefNode: {
    scope: 'container',
    label: 'Secret',
    color: 'yellow',
    icon: 'KeyRound',
    injectedFields: ['envFrom'],
  },
  ConfigMapNode: {
    scope: 'container',
    label: 'ConfigMap',
    color: 'green',
    icon: 'FileCode',
    injectedFields: ['envFrom', 'volumes', 'volumeMounts'],
  },
  DatabaseNode: {
    scope: 'container',
    label: 'Database',
    color: 'cyan',
    icon: 'Database',
    injectedFields: ['env'],
  },
  MessageQueueNode: {
    scope: 'container',
    label: 'Queue',
    color: 'pink',
    icon: 'MessageSquare',
    injectedFields: ['env'],
  },
  RegistryNode: {
    scope: 'pod',
    label: 'Registry',
    color: 'blue',
    icon: 'Container',
    injectedFields: ['imagePullSecrets'],
  },
  LoggingSidecarNode: {
    scope: 'pod',
    label: 'Logging',
    color: 'orange',
    icon: 'ScrollText',
    injectedFields: ['containers', 'volumes', 'volumeMounts'],
  },
  ServiceAccountNode: {
    scope: 'pod',
    label: 'ServiceAccount',
    color: 'indigo',
    icon: 'UserCog',
    injectedFields: ['serviceAccountName'],
  },
  MonitoringNode: {
    scope: 'metadata',
    label: 'Monitoring',
    color: 'emerald',
    icon: 'Activity',
    injectedFields: ['metadata.annotations'],
  },
  IngressNode: {
    scope: 'resource',
    label: 'Ingress',
    color: 'purple',
    icon: 'Globe',
    injectedFields: [],
  },
};

/** All node types considered "plugin" nodes */
export const PLUGIN_NODE_TYPES = new Set(Object.keys(PLUGIN_ATTACHMENTS));

/** Check if a node type is a plugin */
export function isPluginNodeType(type: string): boolean {
  return PLUGIN_NODE_TYPES.has(type);
}
