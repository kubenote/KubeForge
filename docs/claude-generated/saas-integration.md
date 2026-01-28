# SaaS Integration Guide

This guide explains how to use KubeForge as a library dependency in a SaaS application.

## Installation

```bash
npm install github:kubenote/kubeforge#v0.2.0
```

## Architecture

KubeForge exposes three main extension points:

1. **Repository interfaces** — abstract database access
2. **Storage provider** — abstract file storage (YAML hosting)
3. **Composable providers** — React context providers for UI

## Custom Repository Implementation

Override the default Prisma repositories with tenant-scoped implementations:

```typescript
import {
  setProjectRepository,
  setHostedYamlRepository,
  setSchemaRepository,
  type IProjectRepository,
} from 'kubeforge/repositories';

class TenantProjectRepository implements IProjectRepository {
  constructor(private tenantId: string) {}

  async findAll() {
    // Your tenant-scoped query
  }
  // ... implement all interface methods
}

// Set during app initialization
setProjectRepository(new TenantProjectRepository(tenantId));
```

## Custom Storage Provider

Replace filesystem storage with S3:

```typescript
import { setStorageProvider, type IStorageProvider } from 'kubeforge/storage';

class S3StorageProvider implements IStorageProvider {
  async save(id: string, content: string) {
    // Upload to S3
  }
  async read(id: string): Promise<string> {
    // Read from S3
  }
  async delete(id: string) {
    // Delete from S3
  }
  async exists(id: string): Promise<boolean> {
    // Check S3
  }
}

setStorageProvider(new S3StorageProvider());
```

## Provider Composition

Use individual providers or the composed wrapper:

```tsx
import { KubeForgeProviders } from 'kubeforge/providers';

// Use the composed wrapper
function App({ children }) {
  return (
    <YourAuthProvider>
      <YourTenantProvider>
        <KubeForgeProviders>
          {children}
        </KubeForgeProviders>
      </YourTenantProvider>
    </YourAuthProvider>
  );
}
```

Or import individual providers:

```tsx
import { VersionProvider, SchemaProvider, NodeProvider } from 'kubeforge/providers';
```

## Type Imports

```typescript
import type {
  IProjectRepository,
  ProjectWithVersions,
  GVK,
  SchemaData,
} from 'kubeforge';
```

## Prisma Schema

The Prisma schema is included in the package (`prisma/schema.prisma`). For SaaS, you'll likely extend it with your own models (users, organizations, etc.) and add tenant ID columns to the existing tables.
