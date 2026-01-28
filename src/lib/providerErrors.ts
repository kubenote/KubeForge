/**
 * Provider error utilities with debug mode stack trace support
 */

const getDebugMode = (): boolean => {
  if (typeof process !== 'undefined' && process.env) {
    return process.env.DEBUG_MODE === 'true' || process.env.NODE_ENV === 'development';
  }
  if (typeof window !== 'undefined') {
    return localStorage.getItem('DEBUG_MODE') === 'true';
  }
  return false;
};

/**
 * Create a context error with optional stack trace in debug mode
 * @param hookName - The name of the hook being used (e.g., "useSchema")
 * @param providerName - The name of the provider required (e.g., "SchemaProvider")
 */
export function createProviderError(hookName: string, providerName: string): Error {
  const baseMessage = `${hookName} must be used within a ${providerName}`;

  const error = new Error(baseMessage);

  if (getDebugMode()) {
    // In debug mode, include additional context
    error.message = `${baseMessage}\n\nDebug Info:\n- Hook: ${hookName}\n- Required Provider: ${providerName}\n- Tip: Ensure the component using this hook is wrapped with <${providerName}>\n\nStack trace:`;
  }

  return error;
}

/**
 * Throw a provider context error
 * @param hookName - The name of the hook being used
 * @param providerName - The name of the provider required
 */
export function throwProviderError(hookName: string, providerName: string): never {
  throw createProviderError(hookName, providerName);
}
