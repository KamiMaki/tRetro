'use client';

import { useState } from 'react';
import type { SectionTone } from '@/lib/types';

/** Minimal row shape the editor renders. Both the room (live, has ids) and
 *  team (local draft) surfaces map their data into this. */
export interface EditableSectionRow {
  /** Stable key for React + reorder/delete targeting. For room sections this
   *  is the room_sections id; for team drafts a local uid. */
  key: string;
  label: string;
  emoji: string;
  tone: SectionTone;
  /** Number of cards currently in this section (room editor only). When > 0
   *  delete requires choosing a destination. Defaults to 0 (team editor). */
  cardCount?: number;
}

/** The five accent tones with their swatch CSS var + a short label. */
export const TONE_OPTIONS: Array<{ tone: SectionTone; varName: string }> = [
  { tone: 'mint', varName: '--aurora-mint' },
  { tone: 'cyan', varName: '--aurora-cyan' },
  { tone: 'violet', varName: '--aurora-violet' },
  { tone: 'pink', varName: '--aurora-pink' },
  { tone: 'amber', varName: '--aurora-amber' },
];

export const MAX_SECTION_LABEL_LEN = 40;

interface SectionEditorProps {
  rows: EditableSectionRow[];
  /** Patch one field of a row. */
  onChange: (key: string, patch: Partial<Pick<EditableSectionRow, 'label' | 'emoji' | 'tone'>>) => void;
  /** Move a row one slot up/down. */
  onMove: (key: string, dir: 'up' | 'down') => void;
  /** Delete a row. `moveToKey` (a sectionKey/label destination) is provided
   *  only when the row still has cards — the editor surfaces the picker. */
  onDelete: (key: string, moveToKey?: string) => void;
  /** Append a new blank-ish section. */
  onAdd: () => void;
  /** Whether deletes need the card-move guard (room editor passes cardCount). */
}

export function SectionEditor({ rows, onChange, onMove, onDelete, onAdd }: SectionEditorProps) {
  // Which row is in "confirm delete" mode, plus the chosen move-to target.
  const [deletingKey, setDeletingKey] = useState<string | null>(null);
  const [moveTarget, setMoveTarget] = useState<string>('');

  function beginDelete(row: EditableSectionRow) {
    setDeletingKey(row.key);
    // Default the move target to the first other section, if any.
    const other = rows.find((r) => r.key !== row.key);
    setMoveTarget(other ? toMoveKey(other) : '');
  }

  function confirmDelete(row: EditableSectionRow) {
    const hasCards = (row.cardCount ?? 0) > 0;
    onDelete(row.key, hasCards ? moveTarget : undefined);
    setDeletingKey(null);
    setMoveTarget('');
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
      {rows.map((row, i) => {
        const isDeleting = deletingKey === row.key;
        const hasCards = (row.cardCount ?? 0) > 0;
        const others = rows.filter((r) => r.key !== row.key);
        return (
          <div
            key={row.key}
            style={{
              border: '1px solid var(--glass-border)',
              borderRadius: 10,
              padding: 10,
              background: 'var(--glass-highlight)',
              display: 'flex',
              flexDirection: 'column',
              gap: 8,
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              {/* Emoji */}
              <input
                type="text"
                value={row.emoji}
                onChange={(e) => onChange(row.key, { emoji: e.target.value })}
                aria-label="Section emoji"
                maxLength={16}
                style={{
                  width: 44,
                  textAlign: 'center',
                  padding: '6px 4px',
                  fontSize: 18,
                  background: 'var(--glass-bg-strong)',
                  border: '1px solid var(--glass-border)',
                  borderRadius: 8,
                  color: 'var(--fg-0)',
                  outline: 'none',
                }}
              />
              {/* Label */}
              <input
                type="text"
                value={row.label}
                onChange={(e) => onChange(row.key, { label: e.target.value })}
                aria-label="Section label"
                placeholder="區塊名稱"
                maxLength={MAX_SECTION_LABEL_LEN}
                className="field"
                style={{ flex: 1, minWidth: 0 }}
              />
              {/* Reorder */}
              <div style={{ display: 'inline-flex', flexDirection: 'column', gap: 2 }}>
                <button
                  type="button"
                  onClick={() => onMove(row.key, 'up')}
                  disabled={i === 0}
                  aria-label="Move section up"
                  title="上移"
                  className="btn btn-ghost"
                  style={{ padding: '1px 6px', fontSize: 10, opacity: i === 0 ? 0.4 : 1 }}
                >
                  ▲
                </button>
                <button
                  type="button"
                  onClick={() => onMove(row.key, 'down')}
                  disabled={i === rows.length - 1}
                  aria-label="Move section down"
                  title="下移"
                  className="btn btn-ghost"
                  style={{ padding: '1px 6px', fontSize: 10, opacity: i === rows.length - 1 ? 0.4 : 1 }}
                >
                  ▼
                </button>
              </div>
              {/* Delete */}
              <button
                type="button"
                onClick={() => beginDelete(row)}
                aria-label={`Delete section ${row.label}`}
                title="刪除區塊"
                className="btn btn-ghost"
                style={{ padding: '4px 8px', fontSize: 12, color: 'oklch(0.78 0.16 25)' }}
              >
                ✕
              </button>
            </div>

            {/* Tone swatches */}
            <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
              <span className="text-mono fg-3" style={{ fontSize: 10 }}>tone</span>
              {TONE_OPTIONS.map((opt) => {
                const active = row.tone === opt.tone;
                return (
                  <button
                    key={opt.tone}
                    type="button"
                    onClick={() => onChange(row.key, { tone: opt.tone })}
                    aria-label={`Tone ${opt.tone}`}
                    aria-pressed={active}
                    title={opt.tone}
                    style={{
                      width: 22,
                      height: 22,
                      borderRadius: 999,
                      background: `var(${opt.varName})`,
                      border: active ? '2px solid var(--fg-0)' : '2px solid transparent',
                      boxShadow: active ? '0 0 0 2px var(--glass-border)' : 'none',
                      cursor: 'pointer',
                      padding: 0,
                    }}
                  />
                );
              })}
            </div>

            {/* Delete confirm — with move-cards guard when the section has cards */}
            {isDeleting && (
              <div
                style={{
                  display: 'flex',
                  flexWrap: 'wrap',
                  alignItems: 'center',
                  gap: 6,
                  paddingTop: 8,
                  borderTop: '1px solid var(--glass-border)',
                }}
              >
                {hasCards ? (
                  <>
                    <span className="text-mono fg-2" style={{ fontSize: 11 }}>
                      此區塊有 {row.cardCount} 張卡片，移動到
                    </span>
                    <select
                      value={moveTarget}
                      onChange={(e) => setMoveTarget(e.target.value)}
                      aria-label="Move cards to section"
                      className="field"
                      style={{ padding: '4px 8px', fontSize: 12, maxWidth: 180 }}
                    >
                      {others.length === 0 ? (
                        <option value="">（無其他區塊）</option>
                      ) : (
                        others.map((o) => (
                          <option key={o.key} value={toMoveKey(o)}>
                            {o.emoji} {o.label}
                          </option>
                        ))
                      )}
                    </select>
                  </>
                ) : (
                  <span className="text-mono fg-2" style={{ fontSize: 11 }}>確定刪除此區塊？</span>
                )}
                <button
                  type="button"
                  className="btn btn-danger"
                  disabled={hasCards && (others.length === 0 || !moveTarget)}
                  onClick={() => confirmDelete(row)}
                  style={{ padding: '3px 10px', fontSize: 11 }}
                >
                  刪除
                </button>
                <button
                  type="button"
                  className="btn btn-ghost"
                  onClick={() => { setDeletingKey(null); setMoveTarget(''); }}
                  style={{ padding: '3px 10px', fontSize: 11 }}
                >
                  取消
                </button>
              </div>
            )}
          </div>
        );
      })}

      <button
        type="button"
        className="btn"
        onClick={onAdd}
        style={{ alignSelf: 'flex-start', padding: '6px 12px', fontSize: 12 }}
      >
        + 新增區塊
      </button>
    </div>
  );
}

/** The destination identifier passed back to onDelete for a row. The room
 *  editor needs the sectionKey; we stash it on `key` for team drafts too, so
 *  callers map it. For room rows the caller sets `key` = section_key-bearing
 *  lookup — see RoomSectionsModal which resolves key→sectionKey itself. Here
 *  we just hand back the row's React key and let the caller translate. */
function toMoveKey(row: EditableSectionRow): string {
  return row.key;
}
