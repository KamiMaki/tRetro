'use client';

interface VoteButtonProps {
  cardId: string;
  voteCount: number;
  hasVoted: boolean;
  onToggleVote: (cardId: string) => void;
}

export function VoteButton({ cardId, voteCount, hasVoted, onToggleVote }: VoteButtonProps) {
  // Color tokens live in globals.css under .btn-vote so light-mode can darken
  // the heart's pink without forking the inline-style branch here.
  return (
    <button
      type="button"
      onClick={() => onToggleVote(cardId)}
      title={hasVoted ? 'Remove vote' : 'Vote for this card'}
      aria-label={hasVoted ? 'Remove vote' : 'Vote for this card'}
      aria-pressed={hasVoted}
      className={'btn-vote' + (hasVoted ? ' is-voted' : '')}
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
