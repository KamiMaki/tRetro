'use client';

import { useState } from 'react';
import { useRoom } from '@/lib/hooks/useRoom';
import { RoomHeader } from '@/components/room/RoomHeader';
import { Board } from '@/components/board/Board';
import { ActionItemList } from '@/components/action-items/ActionItemList';
import { MetricsPanel } from '@/components/metrics/MetricsPanel';
import { Toast } from '@/components/ui/Toast';
import { AuroraBg } from '@/components/ui/Aurora';

interface RoomBoardProps {
  roomId: string;
}

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
    addComment,
    toggleReaction,
    toggleVote,
    addDrawing,
    metricsAggregate,
    ownMetricScores,
    submitMetrics,
  } = roomState;

  const [activeTagFilters, setActiveTagFilters] = useState<string[]>([]);
  const [sortBy, setSortBy] = useState<'time' | 'tagCount'>('time');
  const [sortAsc, setSortAsc] = useState(true);

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
        />

        <main
          style={{
            flex: 1,
            padding: '20px clamp(16px, 3vw, 32px)',
            display: 'flex',
            flexDirection: 'column',
            gap: 20,
            maxWidth: 1600,
            width: '100%',
            margin: '0 auto',
          }}
        >
          <Board
            cards={cards}
            tags={tags}
            isScrumMaster={isScrumMaster}
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

          <MetricsPanel
            metricsAggregate={metricsAggregate}
            ownMetricScores={ownMetricScores}
            onSubmit={submitMetrics}
          />

          <ActionItemList
            actionItems={actionItems}
            participants={participants}
            isScrumMaster={isScrumMaster}
            onAdd={addActionItem}
            onUpdate={updateActionItem}
            onDelete={deleteActionItem}
          />
        </main>
      </div>

      {toastMessage && (
        <Toast
          message={toastMessage.message}
          type={toastMessage.type}
          onDismiss={clearToast}
        />
      )}
    </div>
  );
}
