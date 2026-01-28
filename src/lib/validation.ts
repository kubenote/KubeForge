/**
 * Input validation utilities for API endpoints
 */

export interface ValidationResult<T> {
  valid: boolean;
  value: T;
  error?: string;
}

/**
 * Parse and validate an integer from a string
 * @param value - The string value to parse
 * @param options - Validation options
 */
export function parseIntSafe(
  value: string | null | undefined,
  options: {
    default: number;
    min?: number;
    max?: number;
    name?: string;
  }
): ValidationResult<number> {
  const name = options.name || 'value';

  if (value === null || value === undefined || value === '') {
    return { valid: true, value: options.default };
  }

  const parsed = parseInt(value, 10);

  if (isNaN(parsed)) {
    return {
      valid: false,
      value: options.default,
      error: `${name} must be a valid integer`,
    };
  }

  if (options.min !== undefined && parsed < options.min) {
    return {
      valid: false,
      value: options.default,
      error: `${name} must be at least ${options.min}`,
    };
  }

  if (options.max !== undefined && parsed > options.max) {
    return {
      valid: false,
      value: options.default,
      error: `${name} must be at most ${options.max}`,
    };
  }

  return { valid: true, value: parsed };
}

/**
 * Validate that a string is not empty
 */
export function validateRequiredString(
  value: unknown,
  name: string
): ValidationResult<string> {
  if (typeof value !== 'string' || value.trim() === '') {
    return {
      valid: false,
      value: '',
      error: `${name} is required and must be a non-empty string`,
    };
  }
  return { valid: true, value: value.trim() };
}

/**
 * Validate that a value is an array
 */
export function validateArray<T>(
  value: unknown,
  name: string
): ValidationResult<T[]> {
  if (!Array.isArray(value)) {
    return {
      valid: false,
      value: [],
      error: `${name} must be an array`,
    };
  }
  return { valid: true, value: value as T[] };
}

/**
 * Validate pagination parameters
 */
export function validatePagination(
  limitStr: string | null,
  offsetStr: string | null,
  options?: { maxLimit?: number }
): { limit: number; offset: number; error?: string } {
  const maxLimit = options?.maxLimit || 100;

  const limitResult = parseIntSafe(limitStr, {
    default: 10,
    min: 1,
    max: maxLimit,
    name: 'limit',
  });

  if (!limitResult.valid) {
    return { limit: 10, offset: 0, error: limitResult.error };
  }

  const offsetResult = parseIntSafe(offsetStr, {
    default: 0,
    min: 0,
    name: 'offset',
  });

  if (!offsetResult.valid) {
    return { limit: 10, offset: 0, error: offsetResult.error };
  }

  return { limit: limitResult.value, offset: offsetResult.value };
}

/**
 * Validate UUID format (basic check)
 */
export function isValidUUID(value: string): boolean {
  const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
  return uuidRegex.test(value);
}

/**
 * Validate CUID format (used by Prisma)
 */
export function isValidCUID(value: string): boolean {
  // CUIDs start with 'c' and are 25 characters
  return /^c[a-z0-9]{24}$/.test(value);
}

/**
 * Validate ID (either UUID or CUID format)
 */
export function isValidId(value: string): boolean {
  return isValidUUID(value) || isValidCUID(value) || /^[a-zA-Z0-9_-]+$/.test(value);
}
