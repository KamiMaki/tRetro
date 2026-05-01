'use client';

import { useEffect, useRef } from 'react';

export interface ShortcutBinding {
  /** A single key like "n", "/" or a chord like "g h" (space-separated). */
  keys: string;
  /** Description shown in the keyboard help overlay. */
  description: string;
  /** Section grouping label for the overlay. */
  group?: string;
  /** Handler. Receive the original event so the binding can preventDefault. */
  handler: (e: KeyboardEvent) => void;
}

const CHORD_RESET_MS = 1500;

function isTypingTarget(target: EventTarget | null): boolean {
  if (!(target instanceof HTMLElement)) return false;
  const tag = target.tagName.toLowerCase();
  if (tag === 'input' || tag === 'textarea' || tag === 'select') return true;
  if (target.isContentEditable) return true;
  return false;
}

function eventToKey(e: KeyboardEvent): string {
  // Normalize: shift+/ on US keyboards yields "?". We want "?" as the key.
  // Browser's e.key already gives "?" for shift+/.
  // Keep modifier-free for our shortcut map.
  if (e.ctrlKey || e.metaKey || e.altKey) return '';
  return e.key;
}

/**
 * Register a list of keyboard shortcuts on document.
 * Skips when user is focused on an input / textarea / contenteditable.
 */
export function useShortcuts(bindings: ShortcutBinding[], enabled = true) {
  const bindingsRef = useRef(bindings);
  bindingsRef.current = bindings;

  // Track current chord buffer
  const chordRef = useRef<string[]>([]);
  const chordTimerRef = useRef<number | null>(null);

  useEffect(() => {
    if (!enabled) return;

    function resetChord() {
      chordRef.current = [];
      if (chordTimerRef.current != null) {
        window.clearTimeout(chordTimerRef.current);
        chordTimerRef.current = null;
      }
    }

    function onKeyDown(e: KeyboardEvent) {
      if (isTypingTarget(e.target)) {
        // Allow Escape to bubble to help overlay even from inputs
        if (e.key !== 'Escape') return;
      }

      const key = eventToKey(e);
      if (!key) return;

      const buffered = [...chordRef.current, key.toLowerCase()];
      const full = buffered.join(' ');

      // First, look for an exact full-chord match (longest first)
      const matches = bindingsRef.current
        .filter((b) => b.keys.toLowerCase() === full)
        .sort((a, b) => b.keys.length - a.keys.length);
      if (matches.length > 0) {
        e.preventDefault();
        matches[0].handler(e);
        resetChord();
        return;
      }

      // Then, see if any binding STARTS with the buffered chord (partial match)
      const partial = bindingsRef.current.some((b) => {
        const parts = b.keys.toLowerCase().split(/\s+/);
        return parts.length > buffered.length && parts.slice(0, buffered.length).join(' ') === full;
      });
      if (partial) {
        chordRef.current = buffered;
        if (chordTimerRef.current != null) window.clearTimeout(chordTimerRef.current);
        chordTimerRef.current = window.setTimeout(resetChord, CHORD_RESET_MS);
        e.preventDefault();
        return;
      }

      // No match — reset chord buffer
      resetChord();
    }

    document.addEventListener('keydown', onKeyDown);
    return () => {
      document.removeEventListener('keydown', onKeyDown);
      if (chordTimerRef.current != null) window.clearTimeout(chordTimerRef.current);
    };
  }, [enabled]);
}
