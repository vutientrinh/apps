/**
 * One auth guard for every protected route (TASK-024 MU-04). The root layout calls `useAuthGuard()`;
 * screens never redirect to login themselves.
 */
import { useEffect } from 'react';
import { useGlobalSearchParams, usePathname, useRouter } from 'expo-router';
import { useAuth } from './session';

/** Routes that need a signed-in shopper. Browse routes (home, categories, search, product, shop) stay public. */
const PROTECTED = /^\/(cart|wallet|me|orders|checkout|pay|order-success|notifications)(\/|$)/;

export function isProtectedPath(pathname: string): boolean {
  return PROTECTED.test(pathname);
}

/** `/orders?status=PAID` → the value passed as `redirect` to the login screen. */
export function returnPath(pathname: string, params: Record<string, string | string[] | undefined>): string {
  const query = new URLSearchParams();
  for (const [key, value] of Object.entries(params)) {
    if (value === undefined) continue;
    // Dynamic segments (e.g. `[id]`) are already part of the pathname.
    if (pathname.split('/').includes(Array.isArray(value) ? value.join('/') : value)) continue;
    for (const item of Array.isArray(value) ? value : [value]) query.append(key, item);
  }
  const search = query.toString();
  return `${pathname}${search ? `?${search}` : ''}`;
}

/**
 * Redirects a guest who opens a protected route to `/login?redirect=<path>` and returns `true` while the
 * current route must stay hidden (session still loading, or guest on a protected route).
 */
export function useAuthGuard(): boolean {
  const auth = useAuth();
  const router = useRouter();
  const pathname = usePathname();
  const params = useGlobalSearchParams();
  const guarded = isProtectedPath(pathname);
  const blocked = guarded && (!auth.initialized || !auth.authenticated);
  const redirect = blocked && auth.initialized ? returnPath(pathname, params) : null;
  useEffect(() => {
    if (redirect) router.replace({ pathname: '/login', params: { redirect } });
  }, [redirect, router]);
  return blocked;
}
