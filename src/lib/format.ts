/**
 * Shared formatting utilities.
 */

/**
 * Returns a human-readable relative time string (e.g., "Just now", "5m ago", "3d ago").
 */
export function timeAgo(dateStr: string): string {
  const diff = Date.now() - new Date(dateStr).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return 'Just now';
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  const days = Math.floor(hrs / 24);
  if (days < 30) return `${days}d ago`;
  return new Date(dateStr).toLocaleDateString();
}

/**
 * Formats a date string into a localized date.
 */
export function formatDate(dateStr: string): string {
  return new Date(dateStr).toLocaleDateString();
}

/**
 * Formats a date string into a full localized date+time string.
 */
export function formatDateTime(dateStr: string): string {
  if (!dateStr) return '—';
  return new Date(dateStr).toLocaleString();
}

/**
 * Formats a date string into separate date and time parts.
 */
export function formatDateParts(dateStr: string): { date: string; time: string } {
  const d = new Date(dateStr);
  return { date: d.toLocaleDateString(), time: d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) };
}
