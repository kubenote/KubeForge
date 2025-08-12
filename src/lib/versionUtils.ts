/**
 * Utility functions for working with version identifiers in URLs
 * Now uses friendly slugs like "mighty-eagle" instead of cryptic IDs
 */
import { isValidFriendlySlug } from './friendlySlug';

export function getVersionUrlId(version: { id: string; slug?: string | null }): string {
  // Use friendly slug if available, otherwise fall back to ID
  return version.slug || version.id;
}

export function findVersionByUrlId(urlId: string, allVersions: Array<{ id: string; slug?: string | null }>): { id: string; slug?: string | null } | null {
  // First try to find by slug, then by ID
  if (isValidFriendlySlug(urlId)) {
    const match = allVersions.find(v => v.slug === urlId);
    if (match) return match;
  }
  
  // Fall back to ID search
  const match = allVersions.find(v => v.id === urlId);
  return match || null;
}

export function isValidVersionId(urlId: string): boolean {
  // Accept either friendly slugs or CUID format
  return isValidFriendlySlug(urlId) || /^c[a-z0-9]+$/.test(urlId);
}