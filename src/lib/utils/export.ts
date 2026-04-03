import type { Room, CardDB, Tag, ActionItem } from '../types';
import { SECTION_LABELS, SECTIONS } from '../types';
import type { SectionType } from '../types';

interface CardWithMeta extends CardDB {
  tags: Tag[];
  authorNickname: string | null;
}

export function exportToMarkdown(
  room: Room,
  cards: CardWithMeta[],
  tags: Tag[],
  actionItems: ActionItem[],
  participantCount: number
): string {
  const lines: string[] = [];
  lines.push(`# ${room.name} - Retrospective Summary`);
  lines.push('');
  lines.push(`> Export time: ${new Date().toISOString()}`);
  lines.push(`> Participants: ${participantCount}`);
  lines.push(`> Status: ${room.status}`);
  lines.push('');

  for (const section of SECTIONS) {
    const sectionCards = cards.filter(c => c.section === section);
    lines.push(`## ${SECTION_LABELS[section]} (${sectionCards.length} cards)`);
    lines.push('');
    if (sectionCards.length === 0) {
      lines.push('_No cards_');
    } else {
      for (const card of sectionCards) {
        const tagStr = card.tags.length > 0 ? `[${card.tags.map(t => t.name).join(', ')}] ` : '';
        const author = card.isRevealed && card.authorNickname ? ` _(by ${card.authorNickname})_` : '';
        lines.push(`- ${tagStr}${card.content}${author}`);
      }
    }
    lines.push('');
  }

  // Tag statistics
  lines.push('## Tag Statistics');
  lines.push('');
  if (tags.length === 0) {
    lines.push('_No tags used_');
  } else {
    lines.push('| Tag | Count | Sections |');
    lines.push('|-----|-------|----------|');
    for (const tag of tags) {
      const tagCards = cards.filter(c => c.tags.some(t => t.id === tag.id));
      const sections = [...new Set(tagCards.map(c => SECTION_LABELS[c.section as SectionType]))];
      lines.push(`| ${tag.name} | ${tagCards.length} | ${sections.join(', ')} |`);
    }
  }
  lines.push('');

  // Action items
  lines.push('## Action Items');
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
    .replace(/^- \[x\] (.+)$/gm, '<li class="done">&#9745; $1</li>')
    .replace(/^- \[ \] (.+)$/gm, '<li>&#9744; $1</li>')
    .replace(/^- (.+)$/gm, '<li>$1</li>')
    .replace(/\|(.+)\|/g, (match) => {
      if (match.includes('---')) return '';
      const cells = match.split('|').filter(Boolean).map(c => c.trim());
      return '<tr>' + cells.map(c => `<td>${c}</td>`).join('') + '</tr>';
    })
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
    table { width: 100%; border-collapse: collapse; margin: 1rem 0; }
    td { border: 1px solid #e5e7eb; padding: 0.5rem; }
    tr:first-child td { font-weight: bold; background: #f3f4f6; }
  </style>
</head>
<body>
${bodyHtml}
</body>
</html>`;
}
