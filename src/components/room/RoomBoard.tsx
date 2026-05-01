'use client';

import { useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useRoom } from '@/lib/hooks/useRoom';
import { useShortcuts } from '@/lib/hooks/useShortcuts';
import { RoomHeader } from '@/components/room/RoomHeader';
import { Board } from '@/components/board/Board';
import { ActionItemList } from '@/components/action-items/ActionItemList';
import { MetricsPanel } from '@/components/metrics/MetricsPanel';
import { Toast } from '@/components/ui/Toast';
import { AuroraBg } from '@/components/ui/Aurora';
import { KeyboardHelp, type KeyboardHelpItem } from '@/components/ui/KeyboardHelp';

interface RoomBoardProps {
  roomId: string;
}

type SidebarTab = 'actions' | 'metrics';

export function RoomBoard({ roomId }: RoomBoardProps) {
  const sessionToken =
    typeof window !== 'undefined' ? sessionStorage.getItem('sessionToken') ?? '' : '';

  const roomState = useRoom({ roomId, sessionToken });
  const {
    room,
    participants,
    cards,
    tags,
    actionItems,
    isScrumMaster,
    connectionStatus,
    toastMessage,
    clearToast,
    addCard,
    deleteCard,
    revealCard,
    createTag,
    addActionItem,
    updateActionItem,
    deleteActionItem,
    closeRoom,
    reopenRoom,
    addComment,
    toggleReaction,
    toggleVote,
    addDrawing,
    metricsAggregate,
    ownMetricScores,
    submitMetrics,
  } = roomState;

  const router = useRouter();
  const [activeTagFilters, setActiveTagFilters] = useState<string[]>([]);
  const [sortBy, setSortBy] = useState<'time' | 'tagCount'>('time');
  const [sortAsc, setSortAsc] = useState(true);
  const [sidebarTab, setSidebarTab] = useState<SidebarTab>('actions');
  const [helpOpen, setHelpOpen] = useState(false);

  const SHORTCUTS: KeyboardHelpItem[] = [
    { keys: 'n', description: 'Focus the first card composer', group: 'Cards' },
    { keys: 'a', description: 'Show Action items in sidebar', group: 'Sidebar' },
    { keys: 'm', description: 'Show Sprint metrics in sidebar', group: 'Sidebar' },
    { keys: 'g h', description: 'Go to past retros (closed)', group: 'Navigation' },
    { keys: 'g d', description: 'Go to dashboard', group: 'Navigation' },
    { keys: '?', description: 'Show this help', group: 'Help' },
  ];

  useShortcuts([
    {
      keys: 'n',
      description: 'Focus first card composer',
      handler: () => {
        // Find the first card form textarea on the board (in DOM order = went-well first)
        const firstTextarea = document.querySelector(
          'main .col textarea, main .col input[type="text"]',
        ) as HTMLElement | null;
        firstTextarea?.focus();
      },
    },
    {
      keys: 'a',
      description: 'Show Action items',
      handler: () => setSidebarTab('actions'),
    },
    {
      keys: 'm',
      description: 'Show Sprint metrics',
      handler: () => setSidebarTab('metrics'),
    },
    {
      keys: 'g h',
      description: 'Go to past retros',
      handler: () => router.push('/?status=closed'),
    },
    {
      keys: 'g d',
      description: 'Go to dashboard',
      handler: () => router.push('/'),
    },
    {
      keys: '?',
      description: 'Show keyboard shortcuts',
      handler: () => setHelpOpen(true),
    },
  ]);

  const pendingActionsCount = useMemo(
    () => actionItems.filter((a) => !a.isCompleted).length,
    [actionItems],
  );
  const totalSubmissions = useMemo(() => {
    if (!Array.isArray(metricsAggregate)) return 0;
    return metricsAggregate.reduce((max, m) => Math.max(max, m.submissions || 0), 0);
  }, [metricsAggregate]);

  return (
    <div style={{ position: 'relative', minHeight: '100vh', display: 'flex', flexDirection: 'column', isolation: 'isolate' }}>
      <AuroraBg />

      <div style={{ position: 'relative', zIndex: 1, display: 'flex', flexDirection: 'column', minHeight: '100vh' }}>
        <RoomHeader
          room={room}
          participants={participants}
          connectionStatus={connectionStatus}
          isScrumMaster={isScrumMaster}
          roomId={roomId}
          cards={cards}
          actionItems={actionItems}
          onCloseRoom={closeRoom}
          onReopenRoom={reopenRoom}
        />

        <main className="room-shell">
          <div className="room-main">
            <Board
              cards={cards}
              tags={tags}
              isScrumMaster={isScrumMaster}
              participantCount={participants.length}
              activeTagFilters={activeTagFilters}
              setActiveTagFilters={setActiveTagFilters}
              sortBy={sortBy}
              setSortBy={setSortBy}
              sortAsc={sortAsc}
              setSortAsc={setSortAsc}
              onAddCard={addCard}
              onDeleteCard={deleteCard}
              onRevealCard={revealCard}
              onCreateTag={createTag}
              onAddComment={addComment}
              onToggleReaction={toggleReaction}
              onToggleVote={toggleVote}
              onAddDrawing={addDrawing}
            />
          </div>

          <aside className="room-aside" aria-label="Sprint sidebar">
            <div className="aside-tabs" role="tablist" aria-label="Sidebar sections">
              <button
                type="button"
                role="tab"
                aria-selected={sidebarTab === 'actions'}
                aria-controls="aside-panel-actions"
                onClick={() => setSidebarTab('actions')}
                className={sidebarTab === 'actions' ? 'tab tab-active' : 'tab'}
              >
                <svg width="13" height="13" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                  <path d="M3 8l3 3 6-6" />
                </svg>
                Action items
                {pendingActionsCount > 0 && (
                  <span className="badge" aria-label={`${pendingActionsCount} pending`}>
                    {pendingActionsCount}
                  </span>
                )}
              </button>
              <button
                type="button"
                role="tab"
                aria-selected={sidebarTab === 'metrics'}
                aria-controls="aside-panel-metrics"
                onClick={() => setSidebarTab('metrics')}
                className={sidebarTab === 'metrics' ? 'tab tab-active' : 'tab'}
              >
                <svg width="13" height="13" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                  <path d="M3 13V8M8 13V4M13 13v-6" />
                </svg>
                Sprint metrics
                {totalSubmissions > 0 && (
                  <span className="badge badge-soft" aria-label={`${totalSubmissions} submissions`}>
                    {totalSubmissions}
                  </span>
                )}
              </button>
            </div>

            <div className="aside-content">
              <div
                id="aside-panel-actions"
                role="tabpanel"
                hidden={sidebarTab !== 'actions'}
                style={{ display: sidebarTab === 'actions' ? 'block' : 'none' }}
              >
                <ActionItemList
                  actionItems={actionItems}
                  participants={participants}
                  isScrumMaster={isScrumMaster}
                  onAdd={addActionItem}
                  onUpdate={updateActionItem}
                  onDelete={deleteActionItem}
                />
              </div>
              <div
                id="aside-panel-metrics"
                role="tabpanel"
                hidden={sidebarTab !== 'metrics'}
                style={{ display: sidebarTab === 'metrics' ? 'block' : 'none' }}
              >
                <MetricsPanel
                  metricsAggregate={metricsAggregate}
                  ownMetricScores={ownMetricScores}
                  onSubmit={submitMetrics}
                />
              </div>
            </div>
          </aside>
        </main>
      </div>

      {toastMessage && (
        <Toast
          message={toastMessage.message}
          type={toastMessage.type}
          onDismiss={clearToast}
        />
      )}

      <KeyboardHelp
        open={helpOpen}
        items={SHORTCUTS}
        onClose={() => setHelpOpen(false)}
      />

      <style jsx>{`
        .room-shell {
          flex: 1;
          padding: 20px clamp(16px, 3vw, 32px);
          display: grid;
          grid-template-columns: 1fr;
          gap: 20px;
          max-width: 1700px;
          width: 100%;
          margin: 0 auto;
        }
        @media (min-width: 1100px) {
          .room-shell {
            grid-template-columns: minmax(0, 1fr) 380px;
            align-items: start;
          }
        }
        .room-main {
          min-width: 0;
        }
        .room-aside {
          display: flex;
          flex-direction: column;
          gap: 10px;
          min-width: 0;
        }
        @media (min-width: 1100px) {
          .room-aside {
            position: sticky;
            top: 76px;
            max-height: calc(100vh - 96px);
          }
        }
        .aside-tabs {
          display: flex;
          gap: 4px;
          padding: 4px;
          background: var(--glass-bg);
          border: 1px solid var(--glass-border);
          border-radius: 12px;
          backdrop-filter: blur(20px) saturate(160%);
          -webkit-backdrop-filter: blur(20px) saturate(160%);
        }
        .tab {
          flex: 1;
          padding: 8px 10px;
          font-family: var(--font-body);
          font-size: 12px;
          font-weight: 500;
          color: var(--fg-2);
          background: transparent;
          border: none;
          border-radius: 8px;
          cursor: pointer;
          display: inline-flex;
          align-items: center;
          justify-content: center;
          gap: 6px;
          transition: background 0.15s, color 0.15s, transform 0.15s;
          white-space: nowrap;
        }
        .tab:hover {
          color: var(--fg-0);
        }
        .tab-active {
          background: var(--glass-bg-strong);
          color: var(--fg-0);
        }
        .badge {
          display: inline-flex;
          align-items: center;
          justify-content: center;
          min-width: 18px;
          height: 18px;
          padding: 0 5px;
          font-family: var(--font-mono);
          font-size: 10px;
          font-weight: 600;
          background: var(--aurora-violet);
          color: #fff;
          border-radius: 999px;
          letter-spacing: 0;
        }
        .badge-soft {
          background: var(--glass-highlight);
          color: var(--fg-1);
          border: 1px solid var(--glass-border);
        }
        .aside-content {
          flex: 1;
          min-height: 0;
          overflow-y: auto;
          padding-right: 2px;
        }
      `}</style>
    </div>
  );
}
