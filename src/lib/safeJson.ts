/**
 * Safe JSON parsing utilities with proper error handling
 */

export interface SafeJsonResult<T> {
  success: boolean;
  data: T | null;
  error?: string;
}

/**
 * Safely parse JSON with error handling
 * @param jsonString - The JSON string to parse
 * @param defaultValue - Default value to return on parse failure
 * @returns The parsed value or default value on failure
 */
export function safeJsonParse<T>(jsonString: string, defaultValue: T): T {
  try {
    return JSON.parse(jsonString) as T;
  } catch (error) {
    console.error('JSON parse error:', error instanceof Error ? error.message : 'Unknown error');
    return defaultValue;
  }
}

/**
 * Safely parse JSON with detailed result
 * @param jsonString - The JSON string to parse
 * @returns Object with success status, data, and optional error message
 */
export function safeJsonParseWithResult<T>(jsonString: string): SafeJsonResult<T> {
  try {
    const data = JSON.parse(jsonString) as T;
    return { success: true, data };
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown JSON parse error';
    return { success: false, data: null, error: errorMessage };
  }
}

/**
 * Safely parse JSON or throw a more descriptive error
 * @param jsonString - The JSON string to parse
 * @param context - Context string for better error messages
 * @throws Error with context if parsing fails
 */
export function safeJsonParseOrThrow<T>(jsonString: string, context: string): T {
  try {
    return JSON.parse(jsonString) as T;
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    throw new Error(`Failed to parse JSON for ${context}: ${errorMessage}`);
  }
}
