/**
 * Shared utilities for project operations
 */

import { getProjectRepository } from '@/repositories/registry';
import { generateFriendlySlug } from '@/lib/friendlySlug';
import { NextResponse } from 'next/server';

/**
 * Generate a unique version slug that doesn't exist in the database
 * Tries up to 10 times before falling back to a timestamp-based slug
 */
export async function generateUniqueVersionSlug(): Promise<string> {
  let attempts = 0;
  const maxAttempts = 10;

  const repo = getProjectRepository();

  while (attempts < maxAttempts) {
    const slug = generateFriendlySlug();
    const isUnique = await repo.isVersionSlugUnique(slug);

    if (isUnique) {
      return slug;
    }

    attempts++;
  }

  // Fallback: add timestamp if we can't generate a unique slug
  return `${generateFriendlySlug()}-${Date.now().toString(36)}`;
}

/**
 * Check if an error is a unique constraint violation from the database
 */
export function isUniqueConstraintError(error: unknown): boolean {
  if (!(error instanceof Error)) {
    return false;
  }

  return (
    error.message.includes('Unique constraint') ||
    error.message.includes('unique constraint') ||
    error.message.includes('projects_name_key') ||
    error.message.includes('projects_slug_key')
  );
}

/**
 * Create a standardized error response for unique constraint violations
 */
export function uniqueConstraintErrorResponse() {
  return NextResponse.json(
    { error: 'A project with this name already exists' },
    { status: 409 }
  );
}

/**
 * Create a standardized internal server error response
 */
export function internalErrorResponse(message: string) {
  return NextResponse.json(
    { error: message },
    { status: 500 }
  );
}

/**
 * Create a standardized not found error response
 */
export function notFoundResponse(resource: string) {
  return NextResponse.json(
    { error: `${resource} not found` },
    { status: 404 }
  );
}

/**
 * Create a standardized bad request error response
 */
export function badRequestResponse(message: string) {
  return NextResponse.json(
    { error: message },
    { status: 400 }
  );
}
