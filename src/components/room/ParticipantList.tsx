'use client';

import { Avatar, GlassPanel } from '@/components/ui/Aurora';

interface ParticipantSummary {
  id: string;
  nickname: string;
  isScrumMaster: boolean;
  isOnline: boolean;
}

interface ParticipantListProps {
  participants: ParticipantSummary[];
}

export function ParticipantList({ participants }: ParticipantListProps) {
  const online = participants.filter((p) => p.isOnline);
  const offline = participants.filter((p) => !p.isOnline);
  const sorted = [...online, ...offline];

  return (
    <GlassPanel style={{ padding: 16 }}>
      <div
        className="text-mono fg-3"
        style={{
          fontSize: 11,
          letterSpacing: '0.12em',
          textTransform: 'uppercase',
          marginBottom: 12,
          display: 'flex',
          alignItems: 'center',
          gap: 8,
        }}
      >
        <span className="live-dot" />
        Participants · {online.length} online
      </div>
      <ul style={{ listStyle: 'none', padding: 0, margin: 0, display: 'flex', flexDirection: 'column', gap: 8 }}>
        {sorted.map((p, i) => (
          <li key={p.id} style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <Avatar
              name={p.nickname}
              size={24}
              colorIndex={i}
            />
            <span
              style={{
                flex: 1,
                fontSize: 13,
                color: p.isOnline ? 'var(--fg-0)' : 'var(--fg-3)',
                overflow: 'hidden',
                textOverflow: 'ellipsis',
                whiteSpace: 'nowrap',
                opacity: p.isOnline ? 1 : 0.6,
              }}
            >
              {p.nickname}
            </span>
            {p.isScrumMaster && (
              <span
                className="text-mono"
                style={{
                  padding: '1px 7px',
                  borderRadius: 999,
                  fontSize: 10,
                  background: 'oklch(0.68 0.20 285 / 0.22)',
                  color: 'oklch(0.92 0.14 285)',
                  border: '1px solid oklch(0.68 0.20 285 / 0.32)',
                }}
              >
                SM
              </span>
            )}
          </li>
        ))}
      </ul>
    </GlassPanel>
  );
}
