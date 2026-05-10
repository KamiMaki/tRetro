import { NextRequest, NextResponse } from 'next/server';
import {
  AUTH_COOKIE_NAME,
  PASSWORD_QUERY_PARAM,
  getDailyPassword,
  msUntilTaipeiMidnight,
  verifyPassword,
} from '@/lib/utils/dailyPassword';

/**
 * Anonymous gate: every request must either present a valid auth cookie or
 * carry `?password=YYYYMMDD` (Taipei time). Cookies refresh nightly.
 *
 * Lives in `src/proxy.ts` per the Next.js 16 file convention (the legacy
 * `middleware` filename is deprecated).
 *
 * Public escape hatches:
 *   - /login          (the form itself)
 *   - /api/auth       (the form's POST target)
 *   - /api/health     (uptime probes / Docker healthcheck)
 *   - /favicon.ico, /_next/*, static assets — handled via the matcher
 */
export function proxy(req: NextRequest): NextResponse {
  const { nextUrl } = req;
  const { pathname, searchParams } = nextUrl;

  if (
    pathname === '/login' ||
    pathname.startsWith('/api/auth') ||
    pathname.startsWith('/api/health')
  ) {
    return NextResponse.next();
  }

  // 1. URL bypass: `?password=YYYYMMDD`. If valid, set cookie and 302 to the
  //    same URL with the param stripped so the password isn't preserved in
  //    history, referrers, or shared screenshots.
  const queryPassword = searchParams.get(PASSWORD_QUERY_PARAM);
  if (queryPassword && verifyPassword(queryPassword)) {
    const cleaned = nextUrl.clone();
    cleaned.searchParams.delete(PASSWORD_QUERY_PARAM);
    const res = NextResponse.redirect(cleaned);
    res.cookies.set({
      name: AUTH_COOKIE_NAME,
      value: getDailyPassword(),
      httpOnly: true,
      sameSite: 'lax',
      secure: process.env.NODE_ENV === 'production',
      path: '/',
      maxAge: Math.floor(msUntilTaipeiMidnight() / 1000),
    });
    return res;
  }

  // 2. Cookie check.
  const cookieValue = req.cookies.get(AUTH_COOKIE_NAME)?.value;
  if (verifyPassword(cookieValue)) {
    return NextResponse.next();
  }

  // 3. Not authed.
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
