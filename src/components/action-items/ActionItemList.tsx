'use client';

import type { ActionItem, CreateActionItemPayload, UpdateActionItemPayload } from '@/lib/types';
import { ActionItemCard } from '@/components/action-items/ActionItemCard';
import { ActionItemForm } from '@/components/action-items/ActionItemForm';
import { GlassPanel } from '@/components/ui/Aurora';

interface ActionItemListProps {
  actionItems: ActionItem[];
  isScrumMaster: boolean;
  onAdd: (payload: Omit<CreateActionItemPayload, 'roomId'>) => void;
  onUpdate: (payload: UpdateActionItemPayload) => void;
  onDelete: (actionItemId: string) => void;
  prefilledContent?: string;
  onConsumePrefill?: () => void;
}

export function ActionItemList({
  actionItems,
  isScrumMaster,
  onAdd,
  onUpdate,
  onDelete,
  prefilledContent,
  onConsumePrefill,
}: ActionItemListProps) {
  const pending = actionItems.filter((a) => !a.isCompleted);
  const completed = actionItems.filter((a) => a.isCompleted);

  return (
    <GlassPanel style={{ padding: 0, overflow: 'hidden' }}>
      {/* Header */}
      <div
        style={{
          padding: '16px 20px',
          borderBottom: '1px solid var(--glass-border)',
          display: 'flex',
          alignItems: 'center',
          gap: 10,
        }}
      >
        <div
          style={{
            width: 28,
            height: 28,
            borderRadius: 8,
            background: 'linear-gradient(135deg, var(--aurora-mint), var(--aurora-cyan))',
            display: 'inline-flex',
            alignItems: 'center',
            justifyContent: 'center',
            color: 'oklch(0.15 0.04 270)',
            fontFamily: 'var(--font-mono)',
            fontWeight: 700,
            fontSize: 14,
          }}
        >
          ✓
        </div>
        <div style={{ flex: 1 }}>
          <div className="text-display" style={{ fontSize: 16, fontWeight: 600 }}>
            Action items
          </div>
          {actionItems.length > 0 && (
            <div className="text-mono fg-3" style={{ fontSize: 11 }}>
              {pending.length} pending · {completed.length} done
            </div>
          )}
        </div>
      </div>

      <div style={{ padding: 20, display: 'flex', flexDirection: 'column', gap: 16 }}>
        {pending.length > 0 && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
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

        {actionItems.length === 0 && (
          <div
            className="fg-3 text-mono"
            style={{ textAlign: 'center', fontSize: 12, padding: '12px 0' }}
          >
            no action items yet
          </div>
        )}

        {completed.length > 0 && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            <h3
              className="text-mono fg-3"
              style={{
                fontSize: 10,
                margin: 0,
                letterSpacing: '0.12em',
                textTransform: 'uppercase',
              }}
            >
              Completed · {completed.length}
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

        {isScrumMaster && (
          <div style={{ paddingTop: 8, borderTop: '1px solid var(--glass-border)' }}>
            <ActionItemForm
              onSubmit={onAdd}
              prefilledContent={prefilledContent}
              onConsumePrefill={onConsumePrefill}
            />
          </div>
        )}
      </div>
    </GlassPanel>
  );
}
