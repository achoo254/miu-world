// Reports a page view each time the route settles on a new path. A redirect (`/` to `/login`, say) settles on its
// target, so only the page actually shown is counted. The visit's source is read on the first render, before any
// redirect drops the address's query.
import { useEffect, useState } from 'react';
import { useLocation } from 'react-router';
import { visitAttribution } from './attribution';
import { trackPageView } from './track';

/** A path must stay this long to count as the page shown. */
export const PAGE_SETTLE_MS = 400;

export function usePageViews(): void {
  useState(visitAttribution);
  const { pathname } = useLocation();
  useEffect(() => {
    const timer = setTimeout(() => trackPageView(pathname), PAGE_SETTLE_MS);
    return () => clearTimeout(timer);
  }, [pathname]);
}
