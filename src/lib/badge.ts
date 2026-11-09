/** Count badge text: hidden at 0, capped at "99+" (TASK-024 MU-02). */
export function formatBadgeCount(count: number | undefined | null): string | undefined {
  if (!count || count < 1) return undefined;
  return count > 99 ? '99+' : String(Math.floor(count));
}
