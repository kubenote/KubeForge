/**
 * Shared utilities for object manipulation
 */

/**
 * Recursively remove null fields from an object
 * @param obj - The object to clean
 * @returns A new object with null fields removed
 */
export function removeNullFields<T>(obj: T): T {
  if (Array.isArray(obj)) {
    return obj.map(removeNullFields) as T;
  } else if (obj && typeof obj === 'object') {
    const cleaned: Record<string, unknown> = {};
    for (const key in obj) {
      const value = (obj as Record<string, unknown>)[key];
      if (value !== null) {
        const cleanedValue = removeNullFields(value);
        if (cleanedValue !== null && cleanedValue !== undefined) {
          cleaned[key] = cleanedValue;
        }
      }
    }
    return cleaned as T;
  }
  return obj;
}

/**
 * Deep clone an object
 * @param obj - The object to clone
 * @returns A deep copy of the object
 */
export function deepClone<T>(obj: T): T {
  return structuredClone(obj);
}

/**
 * Check if an object is empty (no keys)
 * @param obj - The object to check
 * @returns true if the object has no keys
 */
export function isEmpty(obj: unknown): boolean {
  if (obj === null || obj === undefined) return true;
  if (typeof obj !== 'object') return false;
  return Object.keys(obj).length === 0;
}
