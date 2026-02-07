// Centralized API URL constants
// All API endpoint URLs used across the application are defined here.

// Organization URLs
export const orgUrls = {
  list: () => '/api/organizations',
  get: (orgId: string) => `/api/organizations/${orgId}`,
  members: (orgId: string) => `/api/organizations/${orgId}/members`,
  member: (orgId: string, memberId: string) => `/api/organizations/${orgId}/members/${memberId}`,
  invitations: (orgId: string) => `/api/organizations/${orgId}/invitations`,
} as const;

// Project URLs
export const projectUrls = {
  list: () => '/api/projects',
  get: (projectId: string) => `/api/projects/${projectId}`,
  versions: (projectId: string) => `/api/projects/${projectId}/versions`,
  version: (projectId: string, versionId: string) => `/api/projects/${projectId}/versions/${versionId}`,
} as const;

// Cluster URLs
export const clusterUrls = {
  connections: () => '/api/cluster/connections',
  connectionsByOrg: (orgId: string) => `/api/cluster/connections?orgId=${orgId}`,
  connection: (connId: string) => `/api/cluster/connections/${connId}`,
  namespaces: () => '/api/cluster/namespaces',
  resources: () => '/api/cluster/resources',
  import: () => '/api/cluster/import',
  deploy: () => '/api/cluster/deploy',
  logs: () => '/api/cluster/logs',
} as const;

// Git URLs
export const gitUrls = {
  connections: () => '/api/git/connections',
  connectionsByOrg: (orgId: string) => `/api/git/connections?orgId=${orgId}`,
  connection: (connId: string) => `/api/git/connections/${connId}`,
  oauth: (provider: string) => `/api/git/oauth/${provider}`,
  repos: (connId: string) => `/api/git/repos?connectionId=${connId}`,
  branches: (connId: string, repo: string) =>
    `/api/git/branches?connectionId=${connId}&repo=${encodeURIComponent(repo)}`,
  detect: (connId: string, repo: string, branch: string) =>
    `/api/git/detect?connectionId=${connId}&repo=${encodeURIComponent(repo)}&branch=${encodeURIComponent(branch)}`,
  import: () => '/api/git/import',
  exportPr: () => '/api/git/export-pr',
} as const;

// Agent URLs
export const agentUrls = {
  tokensByOrg: (orgId: string) => `/api/agent/tokens?orgId=${orgId}`,
  tokens: () => '/api/agent/tokens',
  token: (tokenId: string) => `/api/agent/tokens/${tokenId}`,
  tokenStatus: (tokenId: string) => `/api/agent/tokens/${tokenId}/status`,
  installManifest: (params: string) => `/api/agent/install-manifest?${params}`,
  details: (connId: string) => `/api/agent/details?connectionId=${connId}`,
} as const;

// Integration URLs
export const integrationUrls = {
  all: (orgId: string) => `/api/integrations/all?orgId=${orgId}`,
  byType: (type: string, orgId: string) => `/api/integrations/${type}?orgId=${orgId}`,
  create: (type: string) => `/api/integrations/${type}`,
  item: (type: string, itemId: string) => `/api/integrations/${type}/${itemId}`,
} as const;

// Storage bucket URLs
export const storageBucketUrls = {
  list: (orgId: string) => `/api/storage-buckets?orgId=${orgId}`,
  create: () => '/api/storage-buckets',
  item: (bucketId: string) => `/api/storage-buckets/${bucketId}`,
} as const;

// Billing URLs
export const billingUrls = {
  subscription: (orgId: string) => `/api/billing/subscription?orgId=${orgId}`,
  portal: () => '/api/billing/portal',
  checkout: () => '/api/billing/checkout',
  enterpriseInquiry: () => '/api/billing/enterprise-inquiry',
  invoices: (orgId: string) => `/api/billing/invoices?orgId=${orgId}&limit=20`,
  syncSeats: () => '/api/billing/sync-seats',
} as const;

// Hosted YAML URLs
export const hostedYamlUrls = {
  list: (orgId: string) => `/api/hosted-yamls?orgId=${orgId}`,
  listAll: () => '/api/hosted-yamls',
  get: (id: string) => `/api/hosted-yamls/${id}`,
  accessRules: (id: string) => `/api/hosted-yamls/${id}/access-rules`,
  accessPolicy: (id: string) => `/api/hosted-yamls/${id}/access-policy`,
  accessLog: (id: string) => `/api/hosted-yamls/${id}/access-log`,
} as const;

// Hosted YAML Bearer Token URLs
export const hostedYamlTokenUrls = {
  list: (orgId: string) => `/api/hosted-yaml-tokens?orgId=${orgId}`,
  create: () => '/api/hosted-yaml-tokens',
  revoke: (tokenId: string) => `/api/hosted-yaml-tokens?tokenId=${tokenId}`,
} as const;

// Audit Log URLs
export const auditLogUrls = {
  list: (orgId: string) => `/api/audit-logs?orgId=${orgId}`,
} as const;

// YAML URLs
export const yamlUrls = {
  upload: () => '/api/yaml/upload',
  file: (id: string) => `/api/yaml/${id}.yml`,
} as const;

// Schema URLs
export const schemaUrls = {
  versions: () => '/api/schema/versions',
  load: (version: string) => `/api/schema/load?version=${version}`,
  loadSchemas: (version: string, kinds: string[], full: boolean) =>
    `/api/schema/load?version=${version}&schemas=${kinds.join(',')}&full=${full}`,
} as const;

// Dashboard URLs
export const dashboardUrls = {
  data: (orgId: string) => `/api/dashboard/data?orgId=${orgId}`,
} as const;

// Invitation URLs
export const invitationUrls = {
  list: () => '/api/invitations',
  accept: () => '/api/invitations/accept',
} as const;
