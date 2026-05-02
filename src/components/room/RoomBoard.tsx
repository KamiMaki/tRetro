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
import { FacilitatorPanel } from '@/components/room/FacilitatorPanel';
import { PhaseBar } from '@/components/room/PhaseBar';
import { findTemplate } from '@/lib/templates';

interface RoomBoardProps {
  roomId: string;
}

type MainTab = 'board' | 'actions' | 'metrics';

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
    unrevealCard,
    moveCard,
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
    phaseState,
    setPhase,
    setTagDefault,
  } = roomState;

  const router = useRouter();
  const [activeTagFilters, setActiveTagFilters] = useState<string[]>([]);
  const [sortBy, setSortBy] = useState<'time' | 'tagCount'>('time');
  const [sortAsc, setSortAsc] = useState(true);
  const [activeTab, setActiveTab] = useState<MainTab>('board');
  const [helpOpen, setHelpOpen] = useState(false);
  const [facilitatorOpen, setFacilitatorOpen] = useState(false);
  const [prefilledActionContent, setPrefilledActionContent] = useState('');

  const handleConvertCardToAction = (content: string) => {
    setActiveTab('actions');
    setPrefilledActionContent(content);
  };

  const SHORTCUTS: KeyboardHelpItem[] = [
    { keys: 'b', description: 'Switch to Board tab', group: 'Tabs' },
    { keys: 'a', description: 'Switch to Action items tab', group: 'Tabs' },
    { keys: 'm', description: 'Switch to Sprint metrics tab', group: 'Tabs' },
    { keys: 'n', description: 'Focus the first card composer', group: 'Cards' },
    { keys: 'g f', description: 'Open facilitator guide', group: 'Help' },
    { keys: 'g h', description: 'Past retros (closed)', group: 'Navigation' },
    { keys: 'g d', description: 'Back to dashboard', group: 'Navigation' },
    { keys: '?', description: 'Show keyboard shortcuts', group: 'Help' },
  ];

  useShortcuts([
    {
      keys: 'b',
      description: 'Switch to board',
      handler: () => setActiveTab('board'),
    },
    {
      keys: 'a',
      description: 'Switch to action items',
      handler: () => setActiveTab('actions'),
    },
    {
      keys: 'm',
      description: 'Switch to metrics',
      handler: () => setActiveTab('metrics'),
    },
    {
      keys: 'n',
      description: 'Focus first card composer',
      handler: () => {
        setActiveTab('board');
        setTimeout(() => {
          const firstTextarea = document.querySelector(
            'main .col textarea, main .col input[type="text"]',
          ) as HTMLElement | null;
          firstTextarea?.focus();
        }, 0);
      },
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
      keys: 'g f',
      description: 'Open facilitator guide',
      handler: () => setFacilitatorOpen(true),
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

  const template = useMemo(() => findTemplate(room?.templateId), [room?.templateId]);

  const TABS: Array<{ key: MainTab; label: string; badge?: number; badgeSoft?: boolean; icon: React.ReactNode }> = [
    {
      key: 'board',
      label: 'Board',
      icon: (
        <svg width="13" height="13" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
          <rect x="2" y="2" width="5" height="12" rx="1" />
          <rect x="9" y="2" width="5" height="12" rx="1" />
        </svg>
      ),
    },
    {
      key: 'actions',
      label: 'Action items',
      badge: pendingActionsCount,
      icon: (
        <svg width="13" height="13" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
          <path d="M3 8l3 3 6-6" />
        </svg>
      ),
    },
    {
      key: 'metrics',
      label: 'Sprint metrics',
      badge: totalSubmissions,
      badgeSoft: true,
      icon: (
        <svg width="13" height="13" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
          <path d="M3 13V8M8 13V4M13 13v-6" />
        </svg>
      ),
    },
  ];

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
          onOpenFacilitator={() => setFacilitatorOpen(true)}
        />

        <main className="room-shell">
          <PhaseBar
            phaseState={phaseState}
            isScrumMaster={isScrumMaster}
            onSetPhase={setPhase}
          />

          <nav className="main-tabs" role="tablist" aria-label="Retro tabs">
            {TABS.map((t) => {
              const isActive = activeTab === t.key;
              return (
                <button
                  key={t.key}
                  type="button"
                  role="tab"
                  aria-selected={isActive}
                  aria-controls={`main-panel-${t.key}`}
                  onClick={() => setActiveTab(t.key)}
                  className={isActive ? 'main-tab main-tab-active' : 'main-tab'}
                >
                  {t.icon}
                  {t.label}
                  {t.badge != null && t.badge > 0 && (
                    <span
                      className={t.badgeSoft ? 'main-badge main-badge-soft' : 'main-badge'}
                      aria-label={`${t.badge}`}
                    >
                      {t.badge}
                    </span>
                  )}
                </button>
              );
            })}
          </nav>

          <div
            id="main-panel-board"
            role="tabpanel"
            hidden={activeTab !== 'board'}
            style={{ display: activeTab === 'board' ? 'block' : 'none' }}
          >
            <Board
              cards={cards}
              tags={tags}
              isScrumMaster={isScrumMaster}
              participantCount={participants.length}
              template={template}
              activeTagFilters={activeTagFilters}
              setActiveTagFilters={setActiveTagFilters}
              sortBy={sortBy}
              setSortBy={setSortBy}
              sortAsc={sortAsc}
              setSortAsc={setSortAsc}
              onAddCard={addCard}
              onDeleteCard={deleteCard}
              onRevealCard={revealCard}
              onUnrevealCard={unrevealCard}
              onMoveCard={moveCard}
              onCreateTag={createTag}
              onAddComment={addComment}
              onToggleReaction={toggleReaction}
              onToggleVote={toggleVote}
              onAddDrawing={addDrawing}
              onConvertToAction={handleConvertCardToAction}
              onSetTagDefault={setTagDefault}
            />
          </div>

          <div
            id="main-panel-actions"
            role="tabpanel"
            hidden={activeTab !== 'actions'}
            style={{ display: activeTab === 'actions' ? 'block' : 'none' }}
          >
            <ActionItemList
              actionItems={actionItems}
              participants={participants}
              isScrumMaster={isScrumMaster}
              onAdd={addActionItem}
              onUpdate={updateActionItem}
              onDelete={deleteActionItem}
              prefilledContent={prefilledActionContent}
              onConsumePrefill={() => setPrefilledActionContent('')}
            />
          </div>

          <div
            id="main-panel-metrics"
            role="tabpanel"
            hidden={activeTab !== 'metrics'}
            style={{ display: activeTab === 'metrics' ? 'block' : 'none' }}
          >
            <MetricsPanel
              metricsAggregate={metricsAggregate}
              ownMetricScores={ownMetricScores}
              onSubmit={submitMetrics}
            />
          </div>
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

      <FacilitatorPanel
        open={facilitatorOpen}
        onClose={() => setFacilitatorOpen(false)}
      />

      <style jsx>{`
        .room-shell {
          flex: 1;
          padding: 18px clamp(16px, 3vw, 32px) 24px;
          display: flex;
          flex-direction: column;
          gap: 16px;
          max-width: 1700px;
          width: 100%;
          margin: 0 auto;
        }
        .main-tabs {
          display: inline-flex;
          gap: 4px;
          padding: 4px;
          background: var(--glass-bg);
          border: 1px solid var(--glass-border);
          border-radius: 14px;
          backdrop-filter: blur(20px) saturate(160%);
          -webkit-backdrop-filter: blur(20px) saturate(160%);
          align-self: flex-start;
        }
        .main-tab {
          padding: 8px 14px;
          font-family: var(--font-body);
          font-size: 13px;
          font-weight: 500;
          color: var(--fg-2);
          background: transparent;
          border: none;
          border-radius: 10px;
          cursor: pointer;
          display: inline-flex;
          align-items: center;
          gap: 8px;
          transition: background 0.15s, color 0.15s;
          white-space: nowrap;
        }
        .main-tab:hover {
          color: var(--fg-0);
        }
        .main-tab-active {
          background: var(--glass-bg-strong);
          color: var(--fg-0);
          box-shadow: 0 1px 0 var(--glass-highlight) inset, 0 4px 12px oklch(0 0 0 / 0.15);
        }
        .main-badge {
          display: inline-flex;
          align-items: center;
          justify-content: center;
          min-width: 20px;
          height: 20px;
          padding: 0 6px;
          font-family: var(--font-mono);
          font-size: 11px;
          font-weight: 600;
          background: var(--aurora-violet);
          color: #fff;
          border-radius: 999px;
        }
        .main-badge-soft {
          background: var(--glass-highlight);
          color: var(--fg-1);
          border: 1px solid var(--glass-border);
        }
      `}</style>
    </div>
  );
}
