import { NextRequest, NextResponse } from 'next/server';
import { TEAM_COOKIE_NAME } from '@/lib/utils/teamCookie';

/**
 * Team gate: every request must present a `tretro-team` cookie. This is a
 * cheap presence/parse check only — real authorisation (does this cookie's
 * team ID actually exist and match the request?) happens where it already
 * did: `requireTeamId()` in the API routes and the Socket.io handshake
 * (`src/lib/socket/middleware.ts`). The proxy never touches the DB.
 *
 * Lives in `src/proxy.ts` per the Next.js 16 file convention (the legacy
 * `middleware` filename is deprecated).
 *
 * Public escape hatches:
 *   - /login          (the team-login form)
 *   - /api/teams      (list/create teams + the login/logout endpoints the
 *                      form needs before it has a cookie; auth-requiring
 *                      sub-routes under this prefix self-guard via
 *                      requireTeamId())
 *   - /api/health     (uptime probes / Docker healthcheck)
 *   - /favicon.ico, /_next/*, static assets — handled via the matcher
 */
export function proxy(req: NextRequest): NextResponse {
  const { nextUrl } = req;
  const { pathname } = nextUrl;

  if (
    pathname === '/login' ||
    pathname.startsWith('/api/teams') ||
    pathname.startsWith('/api/health')
  ) {
    return NextResponse.next();
  }

  const teamId = req.cookies.get(TEAM_COOKIE_NAME)?.value;
  if (teamId) {
    return NextResponse.next();
  }

  // Not authed.
  if (pathname.startsWith('/api/')) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const loginUrl = nextUrl.clone();
  loginUrl.pathname = '/login';
  loginUrl.search = '';
  const nextPath = pathname + (nextUrl.search || '');
  if (nextPath && nextPath !== '/') {
    loginUrl.searchParams.set('next', nextPath);
  }
  return NextResponse.redirect(loginUrl);
}

export const config = {
  // Run on all paths except Next.js internals and obvious static assets.
  // Public files (images, robots.txt, etc.) are matched out so the gate is
  // user-experienced (no flashes of unstyled content) but the actual data
  // pages and APIs remain protected.
  matcher: [
    '/((?!_next/static|_next/image|_next/data|favicon.ico|.*\\.(?:png|jpg|jpeg|gif|svg|webp|ico|css|js|map|woff|woff2|ttf|otf)$).*)',
  ],
};
