'use client';

import { useEffect, useState } from 'react';
import type { CreateActionItemPayload } from '@/lib/types';

interface ActionItemFormProps {
  onSubmit: (payload: Omit<CreateActionItemPayload, 'roomId'>) => void;
  /** When set (non-empty), auto-open the form with this description prefilled. */
  prefilledContent?: string;
  /** Notify parent that the prefill has been consumed (so it can clear). */
  onConsumePrefill?: () => void;
}

export function ActionItemForm({
  onSubmit,
  prefilledContent,
  onConsumePrefill,
}: ActionItemFormProps) {
  const [description, setDescription] = useState('');
  const [assignee, setAssignee] = useState('');
  const [dueDate, setDueDate] = useState('');
  const [isOpen, setIsOpen] = useState(false);

  // Pull prefilled card content into the form and auto-open
  useEffect(() => {
    if (prefilledContent && prefilledContent.trim()) {
      setDescription(prefilledContent);
      setIsOpen(true);
      onConsumePrefill?.();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [prefilledContent]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!description.trim()) return;
    const owner = assignee.trim();
    onSubmit({
      description: description.trim(),
      assignee: owner || undefined,
      dueDate: dueDate || undefined,
    });
    setDescription('');
    setAssignee('');
    setDueDate('');
    setIsOpen(false);
  };

  if (!isOpen) {
    return (
      <button
        type="button"
        onClick={() => setIsOpen(true)}
        style={{
          display: 'inline-flex',
          alignItems: 'center',
          gap: 8,
          padding: '8px 14px',
          borderRadius: 999,
          background: 'var(--glass-highlight)',
          border: '1px dashed var(--glass-border)',
          color: 'var(--fg-1)',
          fontSize: 12,
          fontFamily: 'var(--font-mono)',
          cursor: 'pointer',
          transition: 'all .15s',
        }}
        onMouseEnter={(e) => {
          e.currentTarget.style.borderColor = 'var(--aurora-violet)';
          e.currentTarget.style.color = 'var(--fg-0)';
        }}
        onMouseLeave={(e) => {
          e.currentTarget.style.borderColor = 'var(--glass-border)';
          e.currentTarget.style.color = 'var(--fg-1)';
        }}
      >
        <svg width="11" height="11" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden="true">
          <path d="M8 3v10M3 8h10" />
        </svg>
        Add action item
      </button>
    );
  }

  return (
    <form
      onSubmit={handleSubmit}
      style={{
        padding: 14,
        borderRadius: 12,
        background: 'oklch(0.68 0.20 285 / 0.08)',
        border: '1px solid oklch(0.68 0.20 285 / 0.25)',
        display: 'flex',
        flexDirection: 'column',
        gap: 12,
      }}
    >
      <div>
        <label
          className="text-mono fg-2"
          style={{ display: 'block', marginBottom: 4, fontSize: 11 }}
          htmlFor="ai-description"
        >
          Description *
        </label>
        <input
          id="ai-description"
          type="text"
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          placeholder="What needs to be done?"
          required
          autoFocus
          className="field"
        />
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
        <div>
          <label
            className="text-mono fg-2"
            style={{ display: 'block', marginBottom: 4, fontSize: 11 }}
            htmlFor="ai-owner"
          >
            Owner
          </label>
          <input
            id="ai-owner"
            type="text"
            value={assignee}
            onChange={(e) => setAssignee(e.target.value)}
            placeholder="Owner's name"
            maxLength={60}
            className="field"
            style={{ padding: '9px 10px' }}
          />
        </div>
        <div>
          <label
            className="text-mono fg-2"
            style={{ display: 'block', marginBottom: 4, fontSize: 11 }}
            htmlFor="ai-due"
          >
            Due date
          </label>
          <input
            id="ai-due"
            type="date"
            value={dueDate}
            onChange={(e) => setDueDate(e.target.value)}
            className="field"
            style={{ padding: '9px 10px' }}
          />
        </div>
      </div>

      <div style={{ display: 'flex', gap: 6, justifyContent: 'flex-end' }}>
        <button type="button" className="btn btn-ghost" onClick={() => setIsOpen(false)}>
          Cancel
        </button>
        <button
          type="submit"
          className="btn btn-primary"
          disabled={!description.trim()}
        >
          Add
        </button>
      </div>
    </form>
  );
}
