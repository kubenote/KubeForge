/**
 * SWR configuration and utilities.
 * Provides a global fetcher and common SWR options.
 */

import { SWRConfiguration } from 'swr';

/**
 * Default fetcher for SWR.
 * Handles JSON responses and error cases.
 */
export async function fetcher<T>(url: string): Promise<T> {
  const res = await fetch(url);

  if (!res.ok) {
    const error = new Error('An error occurred while fetching the data.');
    (error as any).info = await res.json().catch(() => ({}));
    (error as any).status = res.status;
    throw error;
  }

  return res.json();
}

/**
 * Default SWR options for the app.
 * - Deduplication interval handles React StrictMode
 * - Revalidation on focus/reconnect for fresh data
 */
export const swrConfig: SWRConfiguration = {
  fetcher,
  dedupingInterval: 2000,
  revalidateOnFocus: false,
  revalidateOnReconnect: true,
  shouldRetryOnError: false,
};
