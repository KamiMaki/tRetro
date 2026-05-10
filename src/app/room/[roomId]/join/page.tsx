import { redirect } from 'next/navigation';

/**
 * Legacy nickname-picker page — retired. The board auto-creates a guest
 * participant on first visit, so /join just bounces straight to /room/{id}.
 * Kept as a redirect so old share links still work.
 */
export default async function JoinRedirect({
  params,
}: {
  params: Promise<{ roomId: string }>;
}) {
  const { roomId } = await params;
  redirect(`/room/${roomId}`);
}
