import { NextResponse } from 'next/server';
import { metricRepo } from '@/lib/db/repositories/metric.repo';
import { requireTeamId } from '@/lib/utils/teamAuth';

/**
 * Anonymous team-aggregate metrics history scoped to the requesting
 * team's rooms only. Cross-team leakage is prevented at the SQL layer
 * via `WHERE r.team_id = ?` in metricRepo.getTeamHistory — see plan
 * section 8 PR-8.
 */
export async function GET(request: Request) {
  const gate = requireTeamId(request);
  if ('error' in gate) return gate.error;

  const { searchParams } = new URL(request.url);
  const limitRaw = searchParams.get('limit');
  let limit = 12;
  if (limitRaw) {
    const parsed = parseInt(limitRaw, 10);
    if (Number.isFinite(parsed) && parsed > 0 && parsed <= 50) limit = parsed;
  }

  const history = metricRepo.getTeamHistory(limit, gate.teamId);
  return NextResponse.json({ history });
}
