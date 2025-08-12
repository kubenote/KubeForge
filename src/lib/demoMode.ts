/**
 * Check if demo mode is enabled from environment variables
 */
export function isDemoModeEnabled(): boolean {
  return process.env.DEMO_MODE === 'true';
}

/**
 * Demo mode error message for blocked operations
 */
export const DEMO_MODE_MESSAGE = 'This action is disabled in demo mode. Database writes are not permitted.';

/**
 * Check if demo mode is enabled and throw error if so
 */
export function checkDemoMode(): void {
  if (isDemoModeEnabled()) {
    throw new Error(DEMO_MODE_MESSAGE);
  }
}