import type { Room, ActionItem } from '../types';

/**
 * Build a Markdown checklist digest of action items, suitable for posting
 * to Slack incoming webhooks, Discord webhooks, or any "POST JSON" sink.
 *
 * Slack accepts `{ text: "..." }` with Mrkdwn; Discord accepts the same
 * shape with `content`. We send both keys so a single payload works for
 * either platform without code branching.
 */
export function buildActionItemDigestMarkdown(
  room: Room,
  actionItems: ActionItem[],
): string {
  const lines: string[] = [];
  lines.push(`*🎯 Retro action items — ${room.name}*`);
  lines.push(`_Closed at ${room.closedAt ?? new Date().toISOString()}_`);
  lines.push('');
  if (actionItems.length === 0) {
    lines.push('_(no action items captured)_');
  } else {
    for (const item of actionItems) {
      const check = item.isCompleted ? '✅' : '⬜️';
      const owner = item.assignee ? ` · *@${item.assignee}*` : '';
      const due = item.dueDate ? ` · due \`${item.dueDate}\`` : '';
      lines.push(`${check} ${item.description}${owner}${due}`);
    }
  }
  return lines.join('\n');
}

export interface DigestPostResult {
  ok: boolean;
  status: number;
  error?: string;
}

/**
 * Fire-and-forget POST of an action-item digest to a user-supplied URL.
 *
 * Caller MUST treat this as best-effort — the room close transaction has
 * already committed by the time we get here, so we never want a webhook
 * failure to roll back state. We return a result so the caller can log,
 * but errors are swallowed by default.
 *
 * 8-second timeout so a slow webhook host doesn't pin the request handler.
 */
export async function sendActionItemDigest(
  room: Room,
  actionItems: ActionItem[],
): Promise<DigestPostResult> {
  if (!room.webhookUrl) return { ok: false, status: 0, error: 'no_webhook' };

  const text = buildActionItemDigestMarkdown(room, actionItems);
  const payload = {
    // Slack accepts `text`; Discord accepts `content`. Send both so a single
    // URL configuration works on either platform without code branching.
    text,
    content: text,
    room: { id: room.id, name: room.name, closedAt: room.closedAt },
    actionItems: actionItems.map((a) => ({
      description: a.description,
      assignee: a.assignee ?? null,
      dueDate: a.dueDate ?? null,
      isCompleted: a.isCompleted,
    })),
  };

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 8000);

  try {
    const res = await fetch(room.webhookUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
      signal: controller.signal,
    });
    return { ok: res.ok, status: res.status };
  } catch (err) {
    return {
      ok: false,
      status: 0,
      error: err instanceof Error ? err.message : 'unknown',
    };
  } finally {
    clearTimeout(timer);
  }
}

/**
 * Lightly validate a webhook URL before we accept it from the SM. We
 * don't want to call back into localhost / file:// / arbitrary protocols.
 */
export function isAllowedWebhookUrl(raw: string): boolean {
  try {
    const u = new URL(raw);
    if (u.protocol !== 'https:' && u.protocol !== 'http:') return false;
    // Block obvious SSRF targets in dev. Production deployments behind a
    // private network should harden this further or run an allowlist.
    const host = u.hostname.toLowerCase();
    if (host === 'localhost' || host === '127.0.0.1' || host === '0.0.0.0') return false;
    return true;
  } catch {
    return false;
  }
}
