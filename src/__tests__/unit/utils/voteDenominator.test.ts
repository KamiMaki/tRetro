import { resolveVoteDenominator } from '@/lib/utils/voteDenominator';

describe('resolveVoteDenominator', () => {
  it('returns room.participantCount when positive', () => {
    expect(resolveVoteDenominator({ participantCount: 5 }, 8)).toBe(5);
  });

  it('falls back to sessionParticipantCount when room.participantCount is null', () => {
    expect(resolveVoteDenominator({ participantCount: null }, 4)).toBe(4);
  });

  it('falls back to sessionParticipantCount when room.participantCount is undefined', () => {
    expect(resolveVoteDenominator({}, 6)).toBe(6);
  });

  it('falls back when room.participantCount is 0', () => {
    expect(resolveVoteDenominator({ participantCount: 0 }, 3)).toBe(3);
  });

  it('falls back when room.participantCount is negative', () => {
    expect(resolveVoteDenominator({ participantCount: -1 }, 2)).toBe(2);
  });

  it('returns 1 when both inputs are zero (no div-by-zero)', () => {
    expect(resolveVoteDenominator({ participantCount: 0 }, 0)).toBe(1);
  });

  it('returns 1 when both inputs are null', () => {
    expect(resolveVoteDenominator({ participantCount: null }, 0)).toBe(1);
  });

  it('returns 1 when sessionParticipantCount is negative', () => {
    expect(resolveVoteDenominator({}, -3)).toBe(1);
  });

  it('configured count takes precedence even when smaller than sessions', () => {
    // 5 configured headcount + 10 stale Guest-XXX rows → anonymous room
    // ratio still uses 5.
    expect(resolveVoteDenominator({ participantCount: 5 }, 10)).toBe(5);
  });
});
