'use client';

import type { ActionItem, CreateActionItemPayload, UpdateActionItemPayload } from '@/lib/types';
import { ActionItemCard } from '@/components/action-items/ActionItemCard';
import { ActionItemForm } from '@/components/action-items/ActionItemForm';

interface ParticipantSummary {
  id: string;
  nickname: string;
  isScrumMaster: boolean;
  isOnline: boolean;
}

interface ActionItemListProps {
  actionItems: ActionItem[];
  participants: ParticipantSummary[];
  isScrumMaster: boolean;
  onAdd: (payload: Omit<CreateActionItemPayload, 'roomId'>) => void;
  onUpdate: (payload: UpdateActionItemPayload) => void;
  onDelete: (actionItemId: string) => void;
}

export function ActionItemList({
  actionItems,
  participants,
  isScrumMaster,
  onAdd,
  onUpdate,
  onDelete,
}: ActionItemListProps) {
  const pending = actionItems.filter((a) => !a.isCompleted);
  const completed = actionItems.filter((a) => a.isCompleted);

  return (
    <div className="bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-800 shadow-sm">
      <div className="px-5 py-4 border-b border-gray-100 dark:border-gray-800 flex items-center justify-between">
        <h2 className="font-semibold text-gray-800 dark:text-gray-100 flex items-center gap-2">
          Action Items
          {actionItems.length > 0 && (
            <span className="text-xs bg-indigo-100 dark:bg-indigo-900/40 text-indigo-600 dark:text-indigo-400 px-2 py-0.5 rounded-full font-medium">
              {pending.length} pending
            </span>
          )}
        </h2>
      </div>

      <div className="p-5 space-y-4">
        {/* Pending */}
        {pending.length > 0 && (
          <div className="space-y-2">
            {pending.map((item) => (
              <ActionItemCard
                key={item.id}
                actionItem={item}
                isScrumMaster={isScrumMaster}
                onUpdate={onUpdate}
                onDelete={onDelete}
              />
            ))}
          </div>
        )}

        {/* Empty state */}
        {actionItems.length === 0 && (
          <p className="text-sm text-gray-400 dark:text-gray-600 text-center py-4">
            No action items yet
          </p>
        )}

        {/* Completed */}
        {completed.length > 0 && (
          <div className="space-y-2">
            <h3 className="text-xs font-medium text-gray-400 dark:text-gray-600 uppercase tracking-wide">
              Completed ({completed.length})
            </h3>
            {completed.map((item) => (
              <ActionItemCard
                key={item.id}
                actionItem={item}
                isScrumMaster={isScrumMaster}
                onUpdate={onUpdate}
                onDelete={onDelete}
              />
            ))}
          </div>
        )}

        {/* SM-only form */}
        {isScrumMaster && (
          <div className="pt-2 border-t border-gray-100 dark:border-gray-800">
            <ActionItemForm participants={participants} onSubmit={onAdd} />
          </div>
        )}
      </div>
    </div>
  );
}
