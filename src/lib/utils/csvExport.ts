import type { Room, CardDB, Tag, ActionItem } from '../types';
import { SECTION_LABELS } from '../types';
import type { SectionType } from '../types';

interface CardWithMeta extends CardDB {
  tags: Tag[];
  authorNickname: string | null;
}

const CSV_COLUMNS = [
  'type',
  'section',
  'content',
  'tags',
  'vote_count',
  'author',
  'is_revealed',
  'assignee',
  'due_date',
  'is_completed',
  'created_at',
] as const;

/**
 * Escape one CSV cell value.
 *  - Wrap in double quotes if it contains a comma, quote, CR, or LF.
 *  - Internal double quotes are doubled per RFC 4180.
 */
function escapeCell(input: string | number | null | undefined): string {
  if (input == null) return '';
  const s = String(input);
  if (/[",\r\n]/.test(s)) {
    return `"${s.replace(/"/g, '""')}"`;
  }
  return s;
}

function row(values: Array<string | number | null | undefined>): string {
  return values.map(escapeCell).join(',');
}

/**
 * Build a CSV that includes both retro cards and action items, distinguished
 * by the `type` column. Designed to be opened in Excel / Sheets / pandas
 * without further parsing.
 *
 * Privacy: the `author` column is populated only when the card was
 * explicitly revealed. Anonymous cards write an empty string.
 */
export function buildRetroCsv(
  room: Room,
  cards: CardWithMeta[],
  actionItems: ActionItem[],
): string {
  const lines: string[] = [];

  // Optional metadata header — Excel ignores leading comment-style rows that
  // don't match column count; we keep it lightweight.
  lines.push(`# Retro: ${room.name.replace(/[\r\n]/g, ' ')}`);
  lines.push(`# Status: ${room.status}`);
  lines.push(`# Exported: ${new Date().toISOString()}`);
  lines.push('');
  lines.push(CSV_COLUMNS.join(','));

  for (const card of cards) {
    lines.push(
      row([
        'card',
        SECTION_LABELS[card.section as SectionType],
        card.content,
        card.tags.map((t) => t.name).join('; '),
        '', // vote_count — not in CardDB; fill blank (CardDTOv2 has it but the
            // export route uses CardDB; out of scope for v1 of CSV)
        card.isRevealed ? card.authorNickname ?? '' : '',
        card.isRevealed ? 'true' : 'false',
        '',
        '',
        '',
        card.createdAt,
      ]),
    );
  }

  for (const item of actionItems) {
    lines.push(
      row([
        'action_item',
        '',
        item.description,
        '',
        '',
        '',
        '',
        item.assignee ?? '',
        item.dueDate ?? '',
        item.isCompleted ? 'true' : 'false',
        item.createdAt,
      ]),
    );
  }

  // Add a trailing newline for friendly end-of-file behaviour.
  return lines.join('\r\n') + '\r\n';
}
