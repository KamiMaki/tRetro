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
    return {
      text: d.toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' }),
      isOverdue,
    };
  };

  const dateInfo = formatDate(actionItem.dueDate);

  return (
    <div
      style={{
        display: 'flex',
        alignItems: 'flex-start',
        gap: 12,
        padding: 12,
        borderRadius: 12,
        background: actionItem.isCompleted ? 'var(--glass-highlight)' : 'var(--glass-bg)',
        border: '1px solid var(--glass-border)',
        opacity: actionItem.isCompleted ? 0.65 : 1,
        transition: 'all .15s',
      }}
    >
      <div style={{ paddingTop: 2, flexShrink: 0 }}>
        {isScrumMaster ? (
          <input
            type="checkbox"
            checked={actionItem.isCompleted}
            onChange={handleToggleComplete}
            style={{
              width: 16,
              height: 16,
              borderRadius: 4,
              accentColor: 'oklch(0.68 0.20 285)',
              cursor: 'pointer',
            }}
          />
        ) : (
          <div
            style={{
              width: 16,
              height: 16,
              borderRadius: 4,
              border: actionItem.isCompleted
                ? '1px solid var(--aurora-mint)'
                : '1px solid var(--glass-border)',
              background: actionItem.isCompleted ? 'var(--aurora-mint)' : 'transparent',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              flexShrink: 0,
            }}
          >
            {actionItem.isCompleted && (
              <svg width="10" height="10" viewBox="0 0 16 16" fill="none" stroke="oklch(0.15 0.04 270)" strokeWidth={2.5} aria-hidden="true">
                <path strokeLinecap="round" strokeLinejoin="round" d="M3 8l3 3 7-7" />
              </svg>
            )}
          </div>
        )}
      </div>

      <div style={{ flex: 1, minWidth: 0, display: 'flex', flexDirection: 'column', gap: 6 }}>
        <p
          style={{
            margin: 0,
            fontSize: 13.5,
            lineHeight: 1.5,
            color: 'var(--fg-0)',
            textDecoration: actionItem.isCompleted ? 'line-through' : 'none',
            wordBreak: 'break-word',
          }}
        >
          {actionItem.description}
        </p>

        {(actionItem.assignee || dateInfo) && (
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
            {actionItem.assignee && (
              <span
                className="text-mono"
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: 4,
                  fontSize: 11,
                  padding: '2px 8px',
                  borderRadius: 999,
                  background: 'oklch(0.68 0.20 285 / 0.22)',
                  color: 'oklch(0.92 0.14 285)',
                  border: '1px solid oklch(0.68 0.20 285 / 0.32)',
                }}
              >
                <svg width="9" height="9" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.6" aria-hidden="true">
                  <circle cx="8" cy="6" r="2.5" />
                  <path d="M3 14c.5-2.5 2.5-4 5-4s4.5 1.5 5 4" strokeLinecap="round" />
                </svg>
                {actionItem.assignee}
              </span>
            )}
            {dateInfo && (
              <span
                className="text-mono"
                style={{
                  fontSize: 11,
                  padding: '2px 8px',
                  borderRadius: 999,
                  background: dateInfo.isOverdue
                    ? 'oklch(0.65 0.18 25 / 0.22)'
                    : 'var(--glass-highlight)',
                  color: dateInfo.isOverdue ? 'oklch(0.92 0.10 25)' : 'var(--fg-2)',
                  border: '1px solid ' + (dateInfo.isOverdue ? 'oklch(0.65 0.18 25 / 0.32)' : 'var(--glass-border)'),
                }}
              >
                {dateInfo.isOverdue && '⚠ '}
                {dateInfo.text}
              </span>
            )}
          </div>
        )}
      </div>

      {isScrumMaster && (
        <button
          type="button"
          onClick={() => onDelete(actionItem.id)}
          aria-label="Delete action item"
          title="Delete"
          style={{
            flexShrink: 0,
            padding: 4,
            borderRadius: 6,
            background: 'transparent',
            border: 'none',
            color: 'var(--fg-3)',
            cursor: 'pointer',
            display: 'inline-flex',
            alignItems: 'center',
            transition: 'color .15s',
          }}
          onMouseEnter={(e) => (e.currentTarget.style.color = 'oklch(0.78 0.16 25)')}
          onMouseLeave={(e) => (e.currentTarget.style.color = 'var(--fg-3)')}
        >
          <svg width="13" height="13" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" aria-hidden="true">
            <path d="M3 5h10M6 5V3h4v2M5 5l1 9h4l1-9" />
          </svg>
        </button>
      )}
    </div>
  );
}
