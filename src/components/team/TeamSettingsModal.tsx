'use client';

import { useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import type { SectionTone, TeamSection } from '@/lib/types';
import { DEFAULT_SUMMARY_PROMPT } from '@/lib/utils/aiExportTemplate';
import { DEFAULT_REACTION_EMOJIS } from '@/lib/constants/reactions';
import { SectionEditor, type EditableSectionRow } from '@/components/sections/SectionEditor';

interface TeamSettingsModalProps {
  onClose: () => void;
}

/** Local draft row for a team default section. `sectionKey` is preserved for
 *  existing rows (kept stable across saves) and undefined for new ones. */
interface DraftSection {
  uid: string;
  sectionKey?: string;
  label: string;
  emoji: string;
  tone: SectionTone;
}

let uidCounter = 0;
function nextUid(): string {
  uidCounter += 1;
  return `draft-${uidCounter}`;
}

/**
 * Team-level settings editor (US-003/004/005). Three areas:
 *   (a) 版面預設  — the team's default board sections (team_sections), edited
 *       in local state and saved via PUT (no live socket — these are
 *       defaults copied into future rooms only).
 *   (b) Summary Prompt — textarea seeded with the team's prompt; the default
 *       prompt is shown as the placeholder/empty-state. "回復預設" clears to null.
 *   (c) 常用 Emoji — editable reaction palette chips. "回復預設" restores the
 *       saved value to null (so DEFAULT_REACTION_EMOJIS applies).
 *
 * Saving PUTs all three at once.
 */
export function TeamSettingsModal({ onClose }: TeamSettingsModalProps) {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [sections, setSections] = useState<DraftSection[]>([]);
  const [summaryPrompt, setSummaryPrompt] = useState<string>('');
  const [emojis, setEmojis] = useState<string[]>(DEFAULT_REACTION_EMOJIS);
  // Whether the palette is currently "default" (null on the server). Drives the
  // empty-state hint and lets "回復預設" reset to null on save.
  const [emojisAreDefault, setEmojisAreDefault] = useState(true);
  const [newEmoji, setNewEmoji] = useState('');

  const loadedRef = useRef(false);

  useEffect(() => {
    if (loadedRef.current) return;
    loadedRef.current = true;
    let cancelled = false;
    fetch('/api/teams/settings')
      .then(async (res) => {
        if (cancelled) return;
        if (!res.ok) {
          setError('無法載入團隊設定');
          setLoading(false);
          return;
        }
        const data = await res.json();
        setSections(
          (data.sections as TeamSection[]).map((s) => ({
            uid: nextUid(),
            sectionKey: s.sectionKey,
            label: s.label,
            emoji: s.emoji,
            tone: s.tone,
          })),
        );
        setSummaryPrompt(typeof data.summaryPrompt === 'string' ? data.summaryPrompt : '');
        if (Array.isArray(data.reactionEmojis) && data.reactionEmojis.length > 0) {
          setEmojis(data.reactionEmojis);
          setEmojisAreDefault(false);
        } else {
          setEmojis(DEFAULT_REACTION_EMOJIS);
          setEmojisAreDefault(true);
        }
        setLoading(false);
      })
      .catch(() => {
        if (!cancelled) {
          setError('無法載入團隊設定');
          setLoading(false);
        }
      });
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === 'Escape') onClose();
    }
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [onClose]);

  // ── Section editor wiring (local state) ──
  const rows: EditableSectionRow[] = sections.map((s) => ({
    key: s.uid,
    label: s.label,
    emoji: s.emoji,
    tone: s.tone,
    // Team defaults have no live card counts — deletes never need a move.
    cardCount: 0,
  }));

  function handleSectionChange(
    key: string,
    patch: Partial<Pick<EditableSectionRow, 'label' | 'emoji' | 'tone'>>,
  ) {
    setSections((prev) => prev.map((s) => (s.uid === key ? { ...s, ...patch } : s)));
  }
  function handleSectionMove(key: string, dir: 'up' | 'down') {
    setSections((prev) => {
      const idx = prev.findIndex((s) => s.uid === key);
      if (idx < 0) return prev;
      const swap = dir === 'up' ? idx - 1 : idx + 1;
      if (swap < 0 || swap >= prev.length) return prev;
      const next = [...prev];
      [next[idx], next[swap]] = [next[swap], next[idx]];
      return next;
    });
  }
  function handleSectionDelete(key: string) {
    setSections((prev) => prev.filter((s) => s.uid !== key));
  }
  function handleSectionAdd() {
    setSections((prev) => [...prev, { uid: nextUid(), label: '新區塊', emoji: '🗒️', tone: 'violet' }]);
  }

  // ── Reaction palette wiring ──
  function addEmoji() {
    const e = newEmoji.trim();
    if (!e) return;
    setEmojis((prev) => (prev.includes(e) ? prev : [...prev, e]));
    setEmojisAreDefault(false);
    setNewEmoji('');
  }
  function removeEmoji(idx: number) {
    setEmojis((prev) => prev.filter((_, i) => i !== idx));
    setEmojisAreDefault(false);
  }
  function resetEmojis() {
    setEmojis(DEFAULT_REACTION_EMOJIS);
    setEmojisAreDefault(true);
  }
  function resetSummaryPrompt() {
    setSummaryPrompt('');
  }

  async function handleSave() {
    setSaving(true);
    setError(null);
    try {
      const res = await fetch('/api/teams/settings', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          // Empty textarea → null (use default header).
          summaryPrompt: summaryPrompt.trim().length > 0 ? summaryPrompt : null,
          // Default palette → null so the team inherits DEFAULT_REACTION_EMOJIS.
          reactionEmojis: emojisAreDefault ? null : emojis,
          sections: sections.map((s, i) => ({
            sectionKey: s.sectionKey,
            label: s.label,
            emoji: s.emoji,
            tone: s.tone,
            position: i,
          })),
        }),
      });
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error(body.error ?? '儲存失敗');
      }
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : '儲存失敗');
    } finally {
      setSaving(false);
    }
  }

  if (typeof document === 'undefined') return null;

  return createPortal(
    <div onClick={onClose} className="modal-backdrop">
      <div onClick={(e) => e.stopPropagation()} style={{ width: 'min(600px, 100%)', position: 'relative', zIndex: 81 }}>
        <div
          style={{
            padding: 24,
            background: 'var(--bg-1)',
            border: '1px solid var(--glass-border)',
            borderRadius: 'var(--radius-lg)',
            boxShadow: '0 24px 60px oklch(0 0 0 / 0.45), 0 1px 0 oklch(1 0 0 / 0.04) inset',
            maxHeight: '88vh',
            overflowY: 'auto',
          }}
        >
          <div
            className="text-mono fg-3"
            style={{ fontSize: 11, letterSpacing: '0.12em', textTransform: 'uppercase', marginBottom: 4 }}
          >
            團隊設定 · Team settings
          </div>
          <h2 className="text-display" style={{ margin: '0 0 16px', fontSize: 22, fontWeight: 600 }}>
            自訂團隊預設
          </h2>

          {loading ? (
            <div className="fg-2" style={{ padding: '32px 0', textAlign: 'center', fontSize: 13 }}>
              載入中…
            </div>
          ) : (
            <>
              {/* (a) Team default sections */}
              <Section title="版面預設" subtitle="新建立的回顧會套用這套區塊（不影響現有回顧）。">
                <SectionEditor
                  rows={rows}
                  onChange={handleSectionChange}
                  onMove={handleSectionMove}
                  onDelete={handleSectionDelete}
                  onAdd={handleSectionAdd}
                />
              </Section>

              {/* (b) Summary prompt */}
              <Section
                title="Summary Prompt"
                subtitle="匯出 AI 摘要時使用的提示。留空則使用預設。"
                action={
                  <button
                    type="button"
                    className="btn btn-ghost"
                    onClick={resetSummaryPrompt}
                    style={{ padding: '3px 10px', fontSize: 11 }}
                  >
                    回復預設
                  </button>
                }
              >
                <textarea
                  value={summaryPrompt}
                  onChange={(e) => setSummaryPrompt(e.target.value)}
                  placeholder={DEFAULT_SUMMARY_PROMPT}
                  className="field"
                  rows={8}
                  style={{ width: '100%', resize: 'vertical', fontSize: 12.5, lineHeight: 1.5, fontFamily: 'var(--font-mono)' }}
                  aria-label="Summary prompt"
                />
              </Section>

              {/* (c) Reaction palette */}
              <Section
                title="常用 Emoji"
                subtitle={emojisAreDefault ? '目前使用預設表情。新增即可自訂。' : '卡片表情選單會顯示這些 emoji。'}
                action={
                  <button
                    type="button"
                    className="btn btn-ghost"
                    onClick={resetEmojis}
                    style={{ padding: '3px 10px', fontSize: 11 }}
                  >
                    回復預設
                  </button>
                }
              >
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginBottom: 10 }}>
                  {emojis.map((e, i) => (
                    <span
                      key={`${e}-${i}`}
                      style={{
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: 4,
                        padding: '4px 6px 4px 8px',
                        borderRadius: 999,
                        background: 'var(--glass-highlight)',
                        border: '1px solid var(--glass-border)',
                        fontSize: 16,
                      }}
                    >
                      {e}
                      <button
                        type="button"
                        onClick={() => removeEmoji(i)}
                        aria-label={`移除 ${e}`}
                        title="移除"
                        style={{
                          width: 16,
                          height: 16,
                          borderRadius: 999,
                          border: 'none',
                          background: 'transparent',
                          color: 'var(--fg-3)',
                          cursor: 'pointer',
                          fontSize: 11,
                          lineHeight: 1,
                          padding: 0,
                        }}
                      >
                        ✕
                      </button>
                    </span>
                  ))}
                </div>
                <div style={{ display: 'flex', gap: 6 }}>
                  <input
                    type="text"
                    value={newEmoji}
                    onChange={(e) => setNewEmoji(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') {
                        e.preventDefault();
                        addEmoji();
                      }
                    }}
                    placeholder="貼上一個 emoji"
                    maxLength={16}
                    className="field"
                    style={{ width: 160 }}
                    aria-label="New reaction emoji"
                  />
                  <button type="button" className="btn" onClick={addEmoji} style={{ padding: '6px 12px', fontSize: 12 }}>
                    新增
                  </button>
                </div>
              </Section>

              {error && (
                <div
                  style={{
                    fontSize: 12,
                    color: 'oklch(0.85 0.14 25)',
                    background: 'oklch(0.65 0.18 25 / 0.12)',
                    border: '1px solid oklch(0.65 0.18 25 / 0.25)',
                    padding: '6px 10px',
                    borderRadius: 8,
                    marginBottom: 12,
                  }}
                >
                  {error}
                </div>
              )}

              <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end', marginTop: 4 }}>
                <button type="button" className="btn btn-ghost" onClick={onClose} disabled={saving}>
                  取消
                </button>
                <button type="button" className="btn btn-primary" onClick={handleSave} disabled={saving}>
                  {saving ? '儲存中…' : '儲存'}
                </button>
              </div>
            </>
          )}
        </div>
      </div>
    </div>,
    document.body,
  );
}

function Section({
  title,
  subtitle,
  action,
  children,
}: {
  title: string;
  subtitle?: string;
  action?: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <div style={{ marginBottom: 22 }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8, marginBottom: 4 }}>
        <h3 className="text-display" style={{ margin: 0, fontSize: 14, fontWeight: 600 }}>
          {title}
        </h3>
        {action}
      </div>
      {subtitle && (
        <p className="fg-2" style={{ fontSize: 11.5, lineHeight: 1.5, margin: '0 0 10px' }}>
          {subtitle}
        </p>
      )}
      {children}
    </div>
  );
}
