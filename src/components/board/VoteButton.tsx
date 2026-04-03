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
      onClick={() => onToggleVote(cardId)}
      className={`flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium transition-all ${
        hasVoted
          ? 'bg-rose-100 dark:bg-rose-900/40 text-rose-600 dark:text-rose-400 hover:bg-rose-200 dark:hover:bg-rose-900/60'
          : 'bg-gray-100 dark:bg-gray-700 text-gray-500 dark:text-gray-400 hover:bg-rose-50 dark:hover:bg-rose-900/20 hover:text-rose-500 dark:hover:text-rose-400'
      }`}
      title={hasVoted ? 'Remove vote' : 'Vote for this card'}
      aria-label={hasVoted ? 'Remove vote' : 'Vote for this card'}
      aria-pressed={hasVoted}
    >
      <svg
        className="w-3.5 h-3.5"
        viewBox="0 0 24 24"
        fill={hasVoted ? 'currentColor' : 'none'}
        stroke="currentColor"
        strokeWidth={2}
      >
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z"
        />
      </svg>
      <span>{voteCount}</span>
    </button>
  );
}
