import { hashTeamPassword, verifyTeamPassword } from '@/lib/utils/teamPassword';

describe('teamPassword', () => {
  describe('hashTeamPassword', () => {
    it('produces 128-char lowercase hex hash and 32-char hex salt', async () => {
      const { hash, salt } = await hashTeamPassword('correct horse battery staple');
      expect(hash).toMatch(/^[0-9a-f]{128}$/);
      expect(salt).toMatch(/^[0-9a-f]{32}$/);
    });

    it('produces a different salt on each call (non-deterministic)', async () => {
      const a = await hashTeamPassword('same-password');
      const b = await hashTeamPassword('same-password');
      expect(a.salt).not.toBe(b.salt);
      expect(a.hash).not.toBe(b.hash);
    });
  });

  describe('verifyTeamPassword', () => {
    it('returns true for the original password', async () => {
      const { hash, salt } = await hashTeamPassword('mypass1234');
      const ok = await verifyTeamPassword('mypass1234', hash, salt);
      expect(ok).toBe(true);
    });

    it('returns false for a wrong password with the right salt', async () => {
      const { hash, salt } = await hashTeamPassword('mypass1234');
      const ok = await verifyTeamPassword('mypass-WRONG', hash, salt);
      expect(ok).toBe(false);
    });

    it('returns false for malformed hash (wrong length)', async () => {
      const ok = await verifyTeamPassword('whatever', 'abc', 'a'.repeat(32));
      expect(ok).toBe(false);
    });

    it('returns false for malformed salt (wrong length)', async () => {
      const ok = await verifyTeamPassword('whatever', 'a'.repeat(128), 'short');
      expect(ok).toBe(false);
    });

    it('returns false for non-string inputs without throwing', async () => {
      // @ts-expect-error — deliberately testing runtime guard
      const ok = await verifyTeamPassword(null, 'a'.repeat(128), 'a'.repeat(32));
      expect(ok).toBe(false);
    });
  });
});
