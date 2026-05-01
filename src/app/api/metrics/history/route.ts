import { NextResponse } from 'next/server';
import { metricRepo } from '@/lib/db/repositories/metric.repo';

/**
 * Anonymous team-aggregate metrics history across recent rooms.
 * Never returns individual scores or participant identities.
 */
export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const limitRaw = searchParams.get('limit');
  let limit = 12;
  if (limitRaw) {
    const parsed = parseInt(limitRaw, 10);
    if (Number.isFinite(parsed) && parsed > 0 && parsed <= 50) limit = parsed;
  }

  const history = metricRepo.getTeamHistory(limit);
  return NextResponse.json({ history });
}
