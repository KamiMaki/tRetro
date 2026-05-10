import { NextResponse } from 'next/server';
import {
  AUTH_COOKIE_NAME,
  getDailyPassword,
  msUntilTaipeiMidnight,
  verifyPassword,
} from '@/lib/utils/dailyPassword';

export async function POST(request: Request) {
  let body: { password?: unknown } = {};
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 });
  }

  if (!verifyPassword(body.password)) {
    return NextResponse.json({ error: 'Invalid password' }, { status: 401 });
  }

  const res = NextResponse.json({ ok: true });
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

export async function DELETE() {
  const res = NextResponse.json({ ok: true });
  res.cookies.delete(AUTH_COOKIE_NAME);
  return res;
}
