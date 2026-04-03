'use client';

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
    <div className="bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-800 p-4">
      <h3 className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-3">
        Participants ({online.length} online)
      </h3>
      <ul className="space-y-1.5">
        {sorted.map((p) => (
          <li key={p.id} className="flex items-center gap-2">
            <span
              className={`w-2 h-2 rounded-full shrink-0 ${
                p.isOnline ? 'bg-green-500' : 'bg-gray-300 dark:bg-gray-600'
              }`}
            />
            <span
              className={`text-sm truncate ${
                p.isOnline
                  ? 'text-gray-800 dark:text-gray-100'
                  : 'text-gray-400 dark:text-gray-600'
              }`}
            >
              {p.nickname}
            </span>
            {p.isScrumMaster && (
              <span className="text-xs bg-indigo-100 dark:bg-indigo-900/30 text-indigo-600 dark:text-indigo-400 px-1.5 py-0.5 rounded font-medium shrink-0">
                SM
              </span>
            )}
          </li>
        ))}
      </ul>
    </div>
  );
}
