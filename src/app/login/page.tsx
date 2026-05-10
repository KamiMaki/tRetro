'use client';

import { Suspense, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { AuroraBg, GlassPanel, Logo } from '@/components/ui/Aurora';
import { ThemeToggle } from '@/components/ui/ThemeToggle';

function safeNext(raw: string | null): string {
  if (!raw) return '/';
  // Accept only same-origin paths to avoid open-redirects.
  if (!raw.startsWith('/') || raw.startsWith('//')) return '/';
  if (raw.startsWith('/login')) return '/';
  return raw;
}

function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const next = safeNext(searchParams.get('next'));

  const [password, setPassword] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!password.trim()) return;
    setSubmitting(true);
    setError(null);
    try {
      const res = await fetch('/api/auth', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ password: password.trim() }),
      });
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error(body.error ?? 'Wrong password');
      }
      router.replace(next);
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Wrong password');
      setSubmitting(false);
    }
  }

  return (
    <main
      style={{
        position: 'relative',
        minHeight: '100vh',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: 16,
        isolation: 'isolate',
      }}
    >
      <AuroraBg />

      <div style={{ position: 'absolute', top: 16, right: 16, zIndex: 2 }}>
        <ThemeToggle />
      </div>

      <div style={{ position: 'relative', zIndex: 1, width: 'min(420px, 100%)' }}>
        <div style={{ textAlign: 'center', marginBottom: 24 }}>
          <div style={{ display: 'inline-flex', justifyContent: 'center' }}>
            <Logo size={32} />
          </div>
          <div
            className="text-mono fg-3"
            style={{
              fontSize: 11,
              letterSpacing: '0.12em',
              textTransform: 'uppercase',
              marginTop: 14,
              marginBottom: 4,
            }}
          >
            Restricted access
          </div>
          <h1
            className="text-display aurora-text"
            style={{ fontSize: 28, fontWeight: 600, margin: 0, lineHeight: 1.2 }}
          >
            Enter today&apos;s password
          </h1>
        </div>

        <GlassPanel strong style={{ padding: 28 }}>
          <p className="fg-2" style={{ fontSize: 13, marginTop: 0, marginBottom: 18, lineHeight: 1.55 }}>
            tRetro is gated. Ask your facilitator for today&apos;s code, or open the
            shared room link directly — it can carry the password for you.
          </p>

          <form onSubmit={onSubmit}>
            <input
              id="password"
              type="password"
              inputMode="numeric"
              autoComplete="off"
              aria-label="Password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••"
              maxLength={32}
              disabled={submitting}
              autoFocus
              className="field"
              style={{ marginBottom: 14, letterSpacing: '0.12em' }}
            />

            {error && (
              <div
                role="alert"
                style={{
                  fontSize: 12,
                  color: 'oklch(0.85 0.14 25)',
                  background: 'oklch(0.65 0.18 25 / 0.12)',
                  border: '1px solid oklch(0.65 0.18 25 / 0.25)',
                  padding: '8px 12px',
                  borderRadius: 8,
                  marginBottom: 14,
                }}
              >
                {error}
              </div>
            )}

            <button
              type="submit"
              className="btn btn-primary"
              disabled={submitting || !password.trim()}
              style={{ width: '100%', justifyContent: 'center', padding: '12px 16px' }}
            >
              {submitting ? 'Checking…' : 'Unlock →'}
            </button>
          </form>
        </GlassPanel>
      </div>
    </main>
  );
}

export default function LoginPage() {
  return (
    <Suspense fallback={null}>
      <LoginForm />
    </Suspense>
  );
}
