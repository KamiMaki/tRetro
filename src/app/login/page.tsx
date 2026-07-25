'use client';

import { Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { TeamPicker } from '@/components/team/TeamPicker';

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

  return (
    <TeamPicker
      onAuthed={() => {
        router.replace(next);
        router.refresh();
      }}
    />
  );
}

export default function LoginPage() {
  return (
    <Suspense fallback={null}>
      <LoginForm />
    </Suspense>
  );
}
