'use client';

import { useState } from 'react';
import { useRoom } from '@/lib/hooks/useRoom';
import { RoomHeader } from '@/components/room/RoomHeader';
import { Board } from '@/components/board/Board';
import { ActionItemList } from '@/components/action-items/ActionItemList';
import { Toast } from '@/components/ui/Toast';

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
  } = roomState;

  const [activeTagFilters, setActiveTagFilters] = useState<string[]>([]);
  const [sortBy, setSortBy] = useState<'time' | 'tagCount'>('time');
  const [sortAsc, setSortAsc] = useState(true);

  return (
    <div className="min-h-screen flex flex-col bg-gray-50 dark:bg-gray-950">
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

      <main className="flex-1 p-4 md:p-6 space-y-6 max-w-screen-2xl mx-auto w-full">
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
