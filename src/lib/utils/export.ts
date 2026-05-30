import type { Room, CardDB, Tag, ActionItem } from '../types';
import { SECTION_EMOJIS, SECTION_LABELS, SECTIONS } from '../types';
import { taipeiTimestamp } from './datetime';

/** A card comment as it appears in an export (no base64 payload — the image
 *  is reduced to a placeholder marker so the file stays readable/small). */
export interface ExportComment {
  authorNickname: string | null;
  content: string;
  imageData: string | null;
}

interface CardWithMeta extends CardDB {
  tags: Tag[];
  /** Display name to show next to a revealed card. The export route
   *  resolves `card.revealedNickname ?? participant.nickname` upstream
   *  so this field already holds the right value. */
  authorNickname: string | null;
  /** Card comments, already identity-resolved by the export route
   *  (null author in anonymous rooms). Optional for backward-compat with
   *  callers/tests that pass bare cards. */
  comments?: ExportComment[];
}

export function exportToMarkdown(
  room: Room,
  cards: CardWithMeta[],
  _tags: Tag[],
  actionItems: ActionItem[],
  participantCount: number
): string {
  const lines: string[] = [];
  lines.push(`# ${room.name} - Retrospective Summary`);
  lines.push('');
  lines.push(`> Export time: ${taipeiTimestamp()}`);
  lines.push(`> Participants: ${participantCount}`);
  lines.push(`> Status: ${room.status}`);
  lines.push('');

  for (const section of SECTIONS) {
    const sectionCards = cards.filter(c => c.section === section);
    // Emoji prefix per section, e.g. `## 😆 Went Well (3 cards)`.
    lines.push(`## ${SECTION_EMOJIS[section]} ${SECTION_LABELS[section]} (${sectionCards.length} cards)`);
    lines.push('');
    if (sectionCards.length === 0) {
      lines.push('_No cards_');
    } else {
      for (const card of sectionCards) {
        const tagStr = card.tags.length > 0 ? `[${card.tags.map(t => t.name).join(', ')}] ` : '';
        const author = card.isRevealed && card.authorNickname ? ` _(by ${card.authorNickname})_` : '';
        lines.push(`- ${tagStr}${card.content}${author}`);
        for (const cm of card.comments ?? []) {
          const who = cm.authorNickname ? `${cm.authorNickname}: ` : '';
          const img = cm.imageData ? (cm.content ? ' [image]' : '[image]') : '';
          lines.push(`  - 💬 ${who}${cm.content}${img}`.trimEnd());
        }
      }
    }
    lines.push('');
  }

  // Action items
  lines.push('## ✅ Action Items');
  lines.push('');
  if (actionItems.length === 0) {
    lines.push('_No action items_');
  } else {
    for (const item of actionItems) {
      const check = item.isCompleted ? 'x' : ' ';
      const assignee = item.assignee ? ` (Assignee: @${item.assignee})` : '';
      const due = item.dueDate ? ` (Due: ${item.dueDate})` : '';
      lines.push(`- [${check}] ${item.description}${assignee}${due}`);
    }
  }
  lines.push('');

  return lines.join('\n');
}

export function exportToHtml(
  room: Room,
  cards: CardWithMeta[],
  tags: Tag[],
  actionItems: ActionItem[],
  participantCount: number
): string {
  const md = exportToMarkdown(room, cards, tags, actionItems, participantCount);
  // Simple markdown-to-HTML conversion
  const bodyHtml = md
    .replace(/^# (.+)$/gm, '<h1>$1</h1>')
    .replace(/^## (.+)$/gm, '<h2>$1</h2>')
    .replace(/^> (.+)$/gm, '<blockquote>$1</blockquote>')
    // Indented comment bullets first (more specific than the generic list rule).
    .replace(/^ {2}- 💬 (.+)$/gm, '<li class="comment">💬 $1</li>')
    .replace(/^- \[x\] (.+)$/gm, '<li class="done">&#9745; $1</li>')
    .replace(/^- \[ \] (.+)$/gm, '<li>&#9744; $1</li>')
    .replace(/^- (.+)$/gm, '<li>$1</li>')
    .replace(/_([^_]+)_/g, '<em>$1</em>')
    .replace(/\n\n/g, '\n');

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${room.name} - Retro Summary</title>
  <style>
    body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; max-width: 800px; margin: 0 auto; padding: 2rem; color: #1a1a1a; }
    h1 { color: #1e40af; border-bottom: 2px solid #3b82f6; padding-bottom: 0.5rem; }
    h2 { color: #374151; margin-top: 2rem; }
    blockquote { background: #f3f4f6; padding: 0.75rem 1rem; border-left: 4px solid #3b82f6; margin: 1rem 0; }
    li { margin: 0.5rem 0; list-style: none; padding: 0.5rem; background: #fafafa; border-radius: 4px; }
    li.done { text-decoration: line-through; opacity: 0.7; }
    li.comment { margin-left: 1.75rem; padding: 0.35rem 0.6rem; background: #f1f5f9; font-size: 0.92em; color: #475569; }
  </style>
</head>
<body>
${bodyHtml}
</body>
</html>`;
}
