'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useRoom } from '@/lib/hooks/useRoom';
import { useShortcuts } from '@/lib/hooks/useShortcuts';
import { RoomHeader } from '@/components/room/RoomHeader';
import { resolveVoteDenominator } from '@/lib/utils/voteDenominator';
import { Board } from '@/components/board/Board';
import { ActionItemList } from '@/components/action-items/ActionItemList';
import { MetricsPanel } from '@/components/metrics/MetricsPanel';
import { Toast } from '@/components/ui/Toast';
import { AuroraBg } from '@/components/ui/Aurora';
import { KeyboardHelp, type KeyboardHelpItem } from '@/components/ui/KeyboardHelp';
import { FacilitatorPanel } from '@/components/room/FacilitatorPanel';
import { OnboardingTour, type TourStep } from '@/components/room/OnboardingTour';
import { RoomSectionsModal } from '@/components/room/RoomSectionsModal';
import { PhaseBar } from '@/components/room/PhaseBar';
import { DiscussionPanel } from '@/components/discussion/DiscussionPanel';
import { ReviewPanel } from '@/components/discussion/ReviewPanel';
import { templateSections } from '@/lib/templates';
import type { BoardSectionView } from '@/lib/types';

interface RoomBoardProps {
  roomId: string;
}

type MainTab = 'board' | 'discussion' | 'review' | 'actions' | 'metrics';

const SHARE_MODE_KEY = 'tretro-share-mode';
const TOOLS_OPEN_KEY = 'tretro-tools-open';
const ONBOARDING_SEEN_KEY = 'tretro-onboarding-seen';

const TOUR_STEPS: TourStep[] = [
  {
    title: '歡迎使用 RetroXpert 👋',
    body: '這是你的回顧看板。這份簡短導覽會帶你認識所有主要功能，大約需要 1 分鐘。',
  },
  {
    target: '[data-tour="tabs"]',
    title: '主要分頁',
    body: '透過這五個分頁切換不同模式：看板（貼卡片）、討論（逐一審視）、檢視（全覽）、行動項目、以及 Sprint 指標。',
  },
  {
    target: 'main .col textarea, main .col input[type="text"]',
    title: '新增卡片',
    body: '在任意欄位的輸入框中輸入文字，按 Enter 或點擊送出按鈕即可新增卡片。你也可以貼上圖片。',
  },
  {
    target: '[data-tour="tools"]',
    title: '工具面板（計時器）',
    body: '展開 Tools 面板來啟動倒數計時器，讓每個階段保持節奏。Scrum Master 可以設定時間並開始/暫停。',
  },
  {
    target: '[data-tour="sections"]',
    title: '自訂區塊',
    body: '點擊 Sections 可新增、刪除或重新命名看板區塊，也能調整顏色。讓看板符合你的回顧模板。',
  },
  {
    target: '[data-tour="guide"]',
    title: '引導手冊（Guide）',
    body: '每個階段都有對應的引導提示與可唸出來的問題，幫助 Facilitator 帶領討論。點擊 Guide 隨時開啟。',
  },
  {
    target: '[data-tour="summary"]',
    title: 'AI 摘要提示（Summary Prompt）',
    body: '點擊後會將整場回顧的內容連同摘要提示一起複製到剪貼簿，貼到任何 AI 工具（ChatGPT、Claude 等）即可獲得主題分析。',
  },
  {
    title: '準備好了！',
    body: '你已經了解所有主要功能。隨時可以點擊右上角的「教學 ?」按鈕重看這份導覽。祝回顧順利！',
  },
];

export function RoomBoard({ roomId }: RoomBoardProps) {
  const sessionToken =
    typeof window !== 'undefined' ? sessionStorage.getItem('sessionToken') ?? '' : '';

  const roomState = useRoom({ roomId, sessionToken });
  const {
    room,
    participants,
    cards,
    tags,
    sections,
    reactionEmojis,
    actionItems,
    isScrumMaster,
    connectionStatus,
    toastMessage,
    clearToast,
    addCard,
    updateCard,
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
    deleteComment,
    updateComment,
    toggleReaction,
    toggleVote,
    addDrawing,
    deleteDrawing,
    metricsAggregate,
    ownMetricScores,
    submitMetrics,
    phaseState,
    setPhase,
    createSection,
    updateSection,
    deleteSection,
    reorderSections,
  } = roomState;

  const router = useRouter();
  const [activeTab, setActiveTab] = useState<MainTab>('board');
  const [helpOpen, setHelpOpen] = useState(false);
  const [facilitatorOpen, setFacilitatorOpen] = useState(false);
  const [sectionsModalOpen, setSectionsModalOpen] = useState(false);
  const [prefilledActionContent, setPrefilledActionContent] = useState('');

  // Onboarding tour — SSR-safe, shows once on first visit.
  const [tourOpen, setTourOpen] = useState(false);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    if (window.localStorage.getItem(ONBOARDING_SEEN_KEY) !== '1') {
      setTourOpen(true);
    }
  }, []);

  const handleTourClose = useCallback(() => {
    setTourOpen(false);
    if (typeof window !== 'undefined') {
      window.localStorage.setItem(ONBOARDING_SEEN_KEY, '1');
    }
  }, []);

  // SM share-mode toggle. SessionStorage so a tab refresh during a live retro
  // doesn't accidentally drop the SM out of share mode.
  const [shareMode, setShareModeState] = useState(false);
  const [toolsOpen, setToolsOpenState] = useState(false);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    /* eslint-disable react-hooks/set-state-in-effect */
    setShareModeState(sessionStorage.getItem(SHARE_MODE_KEY) === '1');
    setToolsOpenState(sessionStorage.getItem(TOOLS_OPEN_KEY) === '1');
    /* eslint-enable react-hooks/set-state-in-effect */
  }, []);

  const setShareMode = useCallback((next: boolean) => {
    setShareModeState(next);
    if (typeof window !== 'undefined') {
      sessionStorage.setItem(SHARE_MODE_KEY, next ? '1' : '0');
    }
  }, []);

  const setToolsOpen = useCallback((next: boolean) => {
    setToolsOpenState(next);
    if (typeof window !== 'undefined') {
      sessionStorage.setItem(TOOLS_OPEN_KEY, next ? '1' : '0');
    }
  }, []);

  // Force share mode off if the participant is no longer SM (defence in depth;
  // the toggle button is also gated on isScrumMaster).
  useEffect(() => {
    if (!isScrumMaster && shareMode) {
      setShareMode(false);
    }
  }, [isScrumMaster, shareMode, setShareMode]);

  const handleConvertCardToAction = (content: string) => {
    setActiveTab('actions');
    setPrefilledActionContent(content);
  };

  const onUpdateCardTags = useCallback(
    (cardId: string, tagIds: string[]) => {
      updateCard({ cardId, tagIds });
    },
    [updateCard],
  );

  const onUpdateCardContent = useCallback(
    (cardId: string, content: string) => {
      updateCard({ cardId, content });
    },
    [updateCard],
  );

  const SHORTCUTS: KeyboardHelpItem[] = [
    { keys: 'b', description: 'Switch to Board tab', group: 'Tabs' },
    { keys: 'd', description: 'Switch to Discussion tab', group: 'Tabs' },
    { keys: 'r', description: 'Switch to Review tab', group: 'Tabs' },
    { keys: 'a', description: 'Switch to Action items tab', group: 'Tabs' },
    { keys: 'm', description: 'Switch to Sprint metrics tab', group: 'Tabs' },
    { keys: 't', description: 'Toggle Tools drawer (timer + filter + sort)', group: 'Tabs' },
    ...(isScrumMaster
      ? [{ keys: 's', description: 'Toggle Share mode (anonymise board)', group: 'Tabs' }]
      : []),
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
      keys: 'd',
      description: 'Switch to discussion',
      handler: () => setActiveTab('discussion'),
    },
    {
      keys: 'r',
      description: 'Switch to review',
      handler: () => setActiveTab('review'),
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
      keys: 't',
      description: 'Toggle tools drawer',
      handler: () => setToolsOpen(!toolsOpen),
    },
    ...(isScrumMaster
      ? [
          {
            keys: 's',
            description: 'Toggle share mode',
            handler: () => setShareMode(!shareMode),
          },
        ]
      : []),
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

  // The room's board sections (server data), with a template-derived
  // fallback for the brief window before ROOM_JOINED arrives.
  const boardSections = useMemo<BoardSectionView[]>(
    () => (sections.length > 0 ? sections : templateSections(room?.templateId)),
    [sections, room?.templateId],
  );
  // Card count per section_key — drives the "move cards" guard in the section
  // editor's delete flow.
  const cardCountBySection = useMemo<Record<string, number>>(() => {
    const counts: Record<string, number> = {};
    for (const c of cards) counts[c.section] = (counts[c.section] ?? 0) + 1;
    return counts;
  }, [cards]);
  // Where the SM "park" action sends a card: the room's deep-dive section if
  // it still exists, otherwise the last section.
  const parkSectionKey = useMemo(() => {
    const deepDive = boardSections.find((s) => s.sectionKey === 'deep-dive');
    return deepDive?.sectionKey ?? boardSections[boardSections.length - 1]?.sectionKey;
  }, [boardSections]);

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
      key: 'discussion',
      label: 'Discussion',
      icon: (
        <svg width="13" height="13" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
          <circle cx="8" cy="8" r="3" />
          <path d="M8 1v2M8 13v2M1 8h2M13 8h2" />
        </svg>
      ),
    },
    {
      key: 'review',
      label: 'Review',
      icon: (
        <svg width="13" height="13" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
          <rect x="2" y="2" width="5" height="5" rx="1" />
          <rect x="9" y="2" width="5" height="5" rx="1" />
          <rect x="2" y="9" width="5" height="5" rx="1" />
          <rect x="9" y="9" width="5" height="5" rx="1" />
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

  const hasTimer = phaseState.durationSec != null;

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
          onCloseRoom={closeRoom}
          onReopenRoom={reopenRoom}
          onOpenFacilitator={() => setFacilitatorOpen(true)}
        />

        <main className="room-shell">
          {/* Top control row: tabs + tools / share-mode pills */}
          <div className="top-controls">
            <nav className="main-tabs" role="tablist" aria-label="Retro tabs" data-tour="tabs">
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

            <div className="control-pills">
              <button
                type="button"
                onClick={() => setToolsOpen(!toolsOpen)}
                aria-expanded={toolsOpen}
                aria-controls="tools-drawer"
                className={toolsOpen ? 'pill pill-active' : 'pill'}
                title="Timer · Filter · Sort"
                data-tour="tools"
              >
                <svg width="12" height="12" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                  <path d="M2 4h12M2 8h12M2 12h8" />
                </svg>
                Tools
                {hasTimer && !toolsOpen && (
                  <span className="pill-dot" aria-hidden="true" />
                )}
              </button>
              <button
                type="button"
                onClick={() => setSectionsModalOpen(true)}
                className="pill"
                title="版面設定 — 編輯這場回顧的區塊"
                data-tour="sections"
              >
                <svg width="12" height="12" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                  <rect x="2" y="2" width="5" height="12" rx="1" />
                  <rect x="9" y="2" width="5" height="5" rx="1" />
                  <path d="M11.5 10v3M10 11.5h3" />
                </svg>
                Sections
              </button>
              {isScrumMaster && (
                <button
                  type="button"
                  onClick={() => setShareMode(!shareMode)}
                  aria-pressed={shareMode}
                  className={shareMode ? 'pill pill-share-on' : 'pill'}
                  title={
                    shareMode
                      ? 'Share mode ON — board hides "You", reveal, and your private metric scores'
                      : 'Switch to share mode for screen-sharing (hides personal info)'
                  }
                >
                  <svg width="12" height="12" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                    <rect x="2" y="3" width="12" height="8" rx="1.5" />
                    <path d="M5 14h6M8 11v3" />
                  </svg>
                  {shareMode ? 'Sharing' : 'Share mode'}
                  {shareMode && <span className="live-dot" aria-hidden="true" />}
                </button>
              )}

              {/* Replay onboarding tour */}
              <button
                type="button"
                onClick={() => setTourOpen(true)}
                className="pill"
                title="重看新手導覽"
                aria-label="重看新手導覽"
              >
                <svg width="12" height="12" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                  <circle cx="8" cy="8" r="6" />
                  <path d="M8 5v3.5l2 2" />
                </svg>
                教學
              </button>
            </div>
          </div>

          {/* Tools drawer — collapsed by default, holds just the phase timer
              now. Filter + sort were removed; sort by tag happens directly
              inside the fullscreen view of each section. */}
          {toolsOpen && (
            <div id="tools-drawer" className="tools-drawer" role="region" aria-label="Tools">
              <PhaseBar
                phaseState={phaseState}
                isScrumMaster={isScrumMaster}
                onSetPhase={setPhase}
              />
            </div>
          )}

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
              participantCount={resolveVoteDenominator(room ?? {}, participants.length)}
              sections={boardSections}
              reactionEmojis={reactionEmojis}
              parkSectionKey={parkSectionKey}
              shareMode={shareMode}
              isAnonymousRoom={room?.isAnonymous ?? true}
              onAddCard={addCard}
              onDeleteCard={deleteCard}
              onRevealCard={revealCard}
              onUnrevealCard={unrevealCard}
              onMoveCard={moveCard}
              onCreateTag={createTag}
              onAddComment={addComment}
              onDeleteComment={deleteComment}
              onUpdateComment={(commentId, _cardId, content, imageData) => updateComment(commentId, content, imageData)}
              onToggleReaction={toggleReaction}
              onToggleVote={toggleVote}
              onAddDrawing={addDrawing}
              onDeleteDrawing={deleteDrawing}
              onConvertToAction={handleConvertCardToAction}
              onUpdateCardTags={onUpdateCardTags}
              onUpdateCardContent={onUpdateCardContent}
            />
          </div>

          <div
            id="main-panel-discussion"
            role="tabpanel"
            hidden={activeTab !== 'discussion'}
            style={{ display: activeTab === 'discussion' ? 'block' : 'none' }}
          >
            <DiscussionPanel
              cards={cards}
              sections={boardSections}
              onAddComment={addComment}
              onDeleteComment={deleteComment}
              onUpdateComment={(commentId, _cardId, content, imageData) => updateComment(commentId, content, imageData)}
              isScrumMaster={isScrumMaster}
              onCreateActionItem={(description) => addActionItem({ description })}
            />
          </div>

          <div
            id="main-panel-review"
            role="tabpanel"
            hidden={activeTab !== 'review'}
            style={{ display: activeTab === 'review' ? 'block' : 'none' }}
          >
            <ReviewPanel
              cards={cards}
              sections={boardSections}
              onAddComment={addComment}
              onDeleteComment={deleteComment}
              onUpdateComment={(commentId, _cardId, content, imageData) => updateComment(commentId, content, imageData)}
              isScrumMaster={isScrumMaster}
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
              shareMode={shareMode}
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

      <RoomSectionsModal
        open={sectionsModalOpen}
        onClose={() => setSectionsModalOpen(false)}
        sections={sections}
        cardCountBySection={cardCountBySection}
        onCreateSection={createSection}
        onUpdateSection={updateSection}
        onDeleteSection={deleteSection}
        onReorderSections={reorderSections}
      />

      {tourOpen && (
        <OnboardingTour steps={TOUR_STEPS} onClose={handleTourClose} />
      )}

      <style jsx>{`
        .room-shell {
          flex: 1;
          padding: 18px clamp(16px, 3vw, 32px) 24px;
          display: flex;
          flex-direction: column;
          gap: 14px;
          max-width: 1700px;
          width: 100%;
          margin: 0 auto;
        }
        .top-controls {
          display: flex;
          flex-wrap: wrap;
          align-items: center;
          gap: 8px;
        }
        .control-pills {
          display: inline-flex;
          gap: 6px;
          margin-left: auto;
          flex-wrap: wrap;
        }
        .pill {
          display: inline-flex;
          align-items: center;
          gap: 6px;
          padding: 7px 12px;
          font-family: var(--font-body);
          font-size: 12px;
          font-weight: 500;
          color: var(--fg-1);
          background: var(--glass-bg);
          border: 1px solid var(--glass-border);
          border-radius: 999px;
          cursor: pointer;
          transition: background 0.15s, color 0.15s, border-color 0.15s;
          backdrop-filter: blur(20px) saturate(160%);
          -webkit-backdrop-filter: blur(20px) saturate(160%);
        }
        .pill:hover {
          background: var(--glass-bg-strong);
          color: var(--fg-0);
        }
        .pill-active {
          background: var(--glass-bg-strong);
          color: var(--fg-0);
          border-color: var(--aurora-violet);
          box-shadow: 0 0 0 3px oklch(0.68 0.20 285 / 0.18);
        }
        .pill-share-on {
          background: oklch(0.78 0.15 175 / 0.20);
          border-color: oklch(0.78 0.15 175 / 0.45);
          color: oklch(0.92 0.12 175);
          box-shadow: 0 0 0 3px oklch(0.78 0.15 175 / 0.16);
        }
        .pill-dot {
          width: 6px;
          height: 6px;
          border-radius: 999px;
          background: var(--aurora-violet);
          margin-left: 2px;
        }
        .tools-drawer {
          display: flex;
          flex-direction: column;
          gap: 12px;
          padding: 12px;
          background: var(--glass-bg);
          border: 1px solid var(--glass-border);
          border-radius: 14px;
          backdrop-filter: blur(20px) saturate(160%);
          -webkit-backdrop-filter: blur(20px) saturate(160%);
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
