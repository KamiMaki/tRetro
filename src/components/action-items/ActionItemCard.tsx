'use client';

import type { ActionItem, UpdateActionItemPayload } from '@/lib/types';

interface ActionItemCardProps {
  actionItem: ActionItem;
  isScrumMaster: boolean;
  onUpdate: (payload: UpdateActionItemPayload) => void;
  onDelete: (actionItemId: string) => void;
}

export function ActionItemCard({ actionItem, isScrumMaster, onUpdate, onDelete }: ActionItemCardProps) {
  const handleToggleComplete = () => {
    onUpdate({ actionItemId: actionItem.id, isCompleted: !actionItem.isCompleted });
  };

  const formatDate = (dateStr: string | null) => {
    if (!dateStr) return null;
    const d = new Date(dateStr);
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const isOverdue = d < today && !actionItem.isCompleted;
    return { text: d.toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' }), isOverdue };
  };

  const dateInfo = formatDate(actionItem.dueDate);

  return (
    <div
      className={`flex items-start gap-3 p-3 rounded-lg border transition ${
        actionItem.isCompleted
          ? 'bg-gray-50 dark:bg-gray-800/50 border-gray-100 dark:border-gray-800 opacity-60'
          : 'bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-700'
      }`}
    >
      {/* Checkbox — SM only */}
      <div className="pt-0.5 shrink-0">
        {isScrumMaster ? (
          <input
            type="checkbox"
            checked={actionItem.isCompleted}
            onChange={handleToggleComplete}
            className="w-4 h-4 rounded border-gray-300 dark:border-gray-600 text-indigo-600 focus:ring-indigo-500 cursor-pointer"
          />
        ) : (
          <div
            className={`w-4 h-4 rounded border-2 flex items-center justify-center shrink-0 ${
              actionItem.isCompleted
                ? 'bg-indigo-500 border-indigo-500'
                : 'border-gray-300 dark:border-gray-600'
            }`}
          >
            {actionItem.isCompleted && (
              <svg className="w-3 h-3 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
              </svg>
            )}
          </div>
        )}
      </div>

      {/* Content */}
      <div className="flex-1 min-w-0 space-y-1">
        <p
          className={`text-sm text-gray-800 dark:text-gray-100 leading-snug ${
            actionItem.isCompleted ? 'line-through text-gray-400 dark:text-gray-500' : ''
          }`}
        >
          {actionItem.description}
        </p>

        <div className="flex flex-wrap items-center gap-2">
          {actionItem.assignee && (
            <span className="inline-flex items-center gap-1 text-xs bg-indigo-50 dark:bg-indigo-900/30 text-indigo-600 dark:text-indigo-400 px-2 py-0.5 rounded-full">
              <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
              </svg>
              {actionItem.assignee}
            </span>
          )}
          {dateInfo && (
            <span
              className={`text-xs px-2 py-0.5 rounded-full ${
                dateInfo.isOverdue
                  ? 'bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400'
                  : 'bg-gray-100 dark:bg-gray-700 text-gray-500 dark:text-gray-400'
              }`}
            >
              {dateInfo.isOverdue && '⚠ '}
              {dateInfo.text}
            </span>
          )}
        </div>
      </div>

      {/* Delete — SM only */}
      {isScrumMaster && (
        <button
          onClick={() => onDelete(actionItem.id)}
          className="shrink-0 p-1 rounded text-gray-300 dark:text-gray-600 hover:text-red-500 dark:hover:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 transition opacity-0 group-hover:opacity-100 focus:opacity-100"
          title="Delete action item"
          aria-label="Delete action item"
        >
          <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
          </svg>
        </button>
      )}
    </div>
  );
}
