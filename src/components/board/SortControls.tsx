'use client';

interface SortControlsProps {
  sortBy: 'time' | 'tagCount';
  setSortBy: (sort: 'time' | 'tagCount') => void;
  sortAsc: boolean;
  setSortAsc: (asc: boolean) => void;
}

export function SortControls({ sortBy, setSortBy, sortAsc, setSortAsc }: SortControlsProps) {
  return (
    <div className="flex items-center gap-2 bg-white dark:bg-gray-900 rounded-lg border border-gray-200 dark:border-gray-800 px-3 py-2">
      <span className="text-xs font-medium text-gray-500 dark:text-gray-400 shrink-0">Sort:</span>
      <select
        value={sortBy}
        onChange={(e) => setSortBy(e.target.value as 'time' | 'tagCount')}
        className="text-xs bg-transparent text-gray-700 dark:text-gray-300 border-none focus:outline-none cursor-pointer"
      >
        <option value="time">By Time</option>
        <option value="tagCount">By Tag Count</option>
      </select>
      <button
        onClick={() => setSortAsc(!sortAsc)}
        className="flex items-center gap-1 text-xs px-2 py-1 rounded bg-gray-100 dark:bg-gray-800 hover:bg-gray-200 dark:hover:bg-gray-700 text-gray-600 dark:text-gray-400 transition"
        title={sortAsc ? 'Ascending — click for descending' : 'Descending — click for ascending'}
      >
        <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          {sortAsc ? (
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 4h13M3 8h9m-9 4h6m4 0l4-4m0 0l4 4m-4-4v12" />
          ) : (
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 4h13M3 8h9m-9 4h9m5-4v12m0 0l-4-4m4 4l4-4" />
          )}
        </svg>
        {sortAsc ? 'Asc' : 'Desc'}
      </button>
    </div>
  );
}
