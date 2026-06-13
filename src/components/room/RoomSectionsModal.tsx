'use client';

import { useEffect, useMemo, useState } from 'react';
import { createPortal } from 'react-dom';
import type {
  RoomSection,
  SectionTone,
  CreateSectionPayload,
  UpdateSectionPayload,
  DeleteSectionPayload,
} from '@/lib/types';
import { SectionEditor, type EditableSectionRow } from '@/components/sections/SectionEditor';

interface RoomSectionsModalProps {
  open: boolean;
  onClose: () => void;
  /** The room's live sections (room_sections), already ordered by position. */
  sections: RoomSection[];
  /** Card count per section_key, so delete can surface the move-cards guard. */
  cardCountBySection: Record<string, number>;
  onCreateSection: (payload: CreateSectionPayload) => void;
  onUpdateSection: (payload: UpdateSectionPayload) => void;
  onDeleteSection: (payload: DeleteSectionPayload) => void;
  onReorderSections: (orderedIds: string[]) => void;
}

/**
 * Live room-section editor (US-003). Operates directly on the socket
 * emitters: every edit is sent immediately and the board re-renders when the
 * server echoes SECTIONS_UPDATED (which refreshes `sections` via useRoom).
 *
 * Local text edits (label/emoji) are committed on blur so we don't fire a
 * socket message per keystroke; tone / reorder / delete / add emit at once.
 */
export function RoomSectionsModal({
  open,
  onClose,
  sections,
  cardCountBySection,
  onCreateSection,
  onUpdateSection,
  onDeleteSection,
  onReorderSections,
}: RoomSectionsModalProps) {
  // Mirror server sections into a local draft for responsive text editing.
  // Re-synced whenever the authoritative list changes.
  const [draft, setDraft] = useState<RoomSection[]>(sections);

  useEffect(() => {
    setDraft(sections);
  }, [sections]);

  useEffect(() => {
    if (!open) return;
    function onKey(e: KeyboardEvent) {
      if (e.key === 'Escape') onClose();
    }
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [open, onClose]);

  const rows = useMemo<EditableSectionRow[]>(
    () =>
      draft.map((s) => ({
        key: s.id,
        label: s.label,
        emoji: s.emoji,
        tone: s.tone,
        cardCount: cardCountBySection[s.sectionKey] ?? 0,
      })),
    [draft, cardCountBySection],
  );

  function patchLocal(id: string, patch: Partial<RoomSection>) {
    setDraft((prev) => prev.map((s) => (s.id === id ? { ...s, ...patch } : s)));
  }

  function handleChange(
    key: string,
    patch: Partial<Pick<EditableSectionRow, 'label' | 'emoji' | 'tone'>>,
  ) {
    // Tone is a discrete choice → emit immediately. Label/emoji update the
    // local draft and are flushed on blur (handled below via onBlur capture).
    patchLocal(key, patch as Partial<RoomSection>);
    if (patch.tone !== undefined) {
      onUpdateSection({ id: key, tone: patch.tone as SectionTone });
    }
  }

  // Flush any pending text edits (label/emoji) for every row whose draft
  // differs from the server. Called when focus leaves any field in the modal,
  // so we never fire a socket message per keystroke but still persist edits.
  function flushAllText() {
    for (const local of draft) {
      const server = sections.find((s) => s.id === local.id);
      if (!server) continue;
      const patch: UpdateSectionPayload = { id: local.id };
      let changed = false;
      if (local.label.trim() && local.label !== server.label) {
        patch.label = local.label.trim();
        changed = true;
      }
      if (local.emoji !== server.emoji) {
        patch.emoji = local.emoji;
        changed = true;
      }
      if (changed) onUpdateSection(patch);
    }
  }

  function handleMove(key: string, dir: 'up' | 'down') {
    const idx = draft.findIndex((s) => s.id === key);
    if (idx < 0) return;
    const swapWith = dir === 'up' ? idx - 1 : idx + 1;
    if (swapWith < 0 || swapWith >= draft.length) return;
    const next = [...draft];
    [next[idx], next[swapWith]] = [next[swapWith], next[idx]];
    setDraft(next);
    onReorderSections(next.map((s) => s.id));
  }

  function handleDelete(key: string, moveToKey?: string) {
    // moveToKey from the editor is the *destination row's key* (= its id).
    // Translate it back into that section's section_key for the server.
    const moveToSectionKey = moveToKey
      ? draft.find((s) => s.id === moveToKey)?.sectionKey
      : undefined;
    onDeleteSection({ id: key, moveToSectionKey });
  }

  function handleAdd() {
    // The server assigns the section_key + position; we just supply defaults.
    onCreateSection({ label: '新區塊', emoji: '🗒️', tone: 'violet' });
  }

  if (!open || typeof document === 'undefined') return null;

  return createPortal(
    <div onClick={onClose} className="modal-backdrop">
      <div
        onClick={(e) => e.stopPropagation()}
        onBlur={() => flushAllText()}
        style={{ width: 'min(560px, 100%)', position: 'relative', zIndex: 81 }}
      >
        <div
          style={{
            padding: 24,
            background: 'var(--bg-1)',
            border: '1px solid var(--glass-border)',
            borderRadius: 'var(--radius-lg)',
            boxShadow: '0 24px 60px oklch(0 0 0 / 0.45), 0 1px 0 oklch(1 0 0 / 0.04) inset',
            maxHeight: '85vh',
            overflowY: 'auto',
          }}
        >
          <div
            className="text-mono fg-3"
            style={{ fontSize: 11, letterSpacing: '0.12em', textTransform: 'uppercase', marginBottom: 4 }}
          >
            版面設定 · Sections
          </div>
          <h2 className="text-display" style={{ margin: '0 0 6px', fontSize: 22, fontWeight: 600 }}>
            編輯本場回顧的區塊
          </h2>
          <p className="fg-2" style={{ fontSize: 12, lineHeight: 1.5, margin: '0 0 16px' }}>
            這裡的調整只影響「這一場」回顧，會即時同步給所有人。要改團隊預設，請到團隊設定。
          </p>

          <SectionEditor
            rows={rows}
            onChange={handleChange}
            onMove={handleMove}
            onDelete={handleDelete}
            onAdd={handleAdd}
          />

          <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: 18 }}>
            <button type="button" className="btn btn-primary" onClick={onClose}>
              完成
            </button>
          </div>
        </div>
      </div>
    </div>,
    document.body,
  );
}
