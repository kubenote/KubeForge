// Analytics stub — no-op implementations so core/ can build independently.
// The SaaS wrapper re-exports the real PostHog-backed analytics module via
// the @saas/lib/analytics path alias, but when core is used standalone this
// file keeps every call safe.

/* eslint-disable @typescript-eslint/no-unused-vars */

export const analytics = {
  nodeAdded: (nodeType: string, kind?: string) => {},
  nodeDeleted: (nodeType: string, kind?: string) => {},
  nodesConnected: (sourceType: string, targetType: string) => {},
  nodesCopied: (count: number) => {},
  nodesPasted: (count: number) => {},
  autoLayoutUsed: () => {},
  viewModeChanged: (mode: 'graph' | 'split' | 'yaml') => {},
  projectVersionSaved: (projectId: string, hasMessage: boolean) => {},
  track: (eventName: string, properties?: Record<string, unknown>) => {},
};
