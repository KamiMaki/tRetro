'use client';

interface VoteButtonProps {
  cardId: string;
  voteCount: number;
  hasVoted: boolean;
  onToggleVote: (cardId: string) => void;
}

export function VoteButton({ cardId, voteCount, hasVoted, onToggleVote }: VoteButtonProps) {
  return (
    <button
      type="button"
      onClick={() => onToggleVote(cardId)}
      title={hasVoted ? 'Remove vote' : 'Vote for this card'}
      aria-label={hasVoted ? 'Remove vote' : 'Vote for this card'}
      aria-pressed={hasVoted}
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: 3,
        padding: '3px 8px',
        borderRadius: 999,
        fontSize: 11,
        fontFamily: 'var(--font-mono)',
        background: hasVoted ? 'oklch(0.82 0.12 350 / 0.25)' : 'var(--glass-highlight)',
        color: hasVoted ? 'oklch(0.92 0.10 350)' : 'var(--fg-2)',
        border: '1px solid ' + (hasVoted ? 'oklch(0.82 0.12 350 / 0.4)' : 'transparent'),
        cursor: 'pointer',
        transition: 'all .15s',
      }}
    >
      <svg
        width="11"
        height="11"
        viewBox="0 0 16 16"
        fill={hasVoted ? 'currentColor' : 'none'}
        stroke="currentColor"
        strokeWidth={1.6}
        aria-hidden="true"
      >
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          d="M3 6.5a3 3 0 015 0L8 7l.5-.5a3 3 0 115 4L8 14 3 10.5a3 3 0 010-4z"
        />
      </svg>
      {voteCount}
    </button>
  );
}
