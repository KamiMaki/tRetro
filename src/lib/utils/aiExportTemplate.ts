import type { Room, CardDB, Tag, ActionItem } from '../types';
import { SECTION_LABELS, SECTIONS } from '../types';
import type { SectionType } from '../types';

interface CardWithMeta extends CardDB {
  tags: Tag[];
  authorNickname: string | null;
}

const PROMPT_HEADER = `你是一位資深敏捷教練，正在檢視一場團隊回顧會議的紀錄。
以下資料來自一場匿名團隊回顧。每張卡片都是團隊成員的貢獻，作者身分刻意隱藏。

請完成下列三項任務：

1. **主題分群** — 將每個區塊的卡片聚成 3–6 個有意義的主題。每個主題請給出：
   一句話標題、一句摘要、最具代表性的支撐卡片、以及情緒標註（正向 / 中立 / 負向）。
2. **強訊號** — 找出最值得注意的訊號：高票數、高留言量、或強共識的卡片或主題。
   必要時引用票數。
3. **建議的 action items** — 根據主題提出 3–7 個具體、容易指派的 action items，
   供團隊在下一個 sprint 採用。請標註哪些建議已被現有 action items 涵蓋。

輸出格式（Markdown）：

\`\`\`markdown
## 主題

### {區塊名稱}
- **{主題標題}**（{情緒}）：{摘要}
  - 支撐卡片：…
  - 建議跟進：…

（每個區塊重複）

## 強訊號
- ...

## 建議的 action items
- [ ] {action 內容} — {為什麼重要} {（是否已被現有 action 涵蓋：是/否）}

## 開放問題
- ...（你觀察到但團隊沒處理到的疑問）
\`\`\`

請具體針對下方的卡片內容回答。若某區塊訊號不足，請誠實說明，不要硬補內容。

— 以下為回顧資料 —

---
`;

/**
 * Build a Markdown payload designed to be pasted into an external AI
 * (ChatGPT / Claude / Gemini) for theme synthesis. The top half is the
 * prompt + output schema; the bottom is the retro content.
 *
 * Privacy: Author identities are only included for cards that have been
 * explicitly revealed. Anonymous cards stay anonymous.
 */
export function buildAiSummaryMarkdown(
  room: Room,
  cards: CardWithMeta[],
  tags: Tag[],
  actionItems: ActionItem[],
  participantCount: number,
): string {
  const lines: string[] = [];
  lines.push(PROMPT_HEADER);

  lines.push(`# 回顧會議：${room.name}`);
  lines.push('');
  lines.push(`- 狀態：${room.status === 'active' ? '進行中' : '已關閉'}`);
  lines.push(`- 參與人數（匿名，僅人數）：${participantCount}`);
  lines.push(`- 卡片總數：${cards.length}`);
  lines.push(`- 標籤數：${tags.length}`);
  lines.push(`- 既有 action items 數：${actionItems.length}`);
  lines.push(`- 匯出時間：${new Date().toISOString()}`);
  lines.push('');

  for (const section of SECTIONS) {
    const sectionCards = cards.filter((c) => c.section === section);
    lines.push(`## ${SECTION_LABELS[section]}（${sectionCards.length}）`);
    lines.push('');
    if (sectionCards.length === 0) {
      lines.push('_（本區塊無卡片）_');
    } else {
      for (const card of sectionCards) {
        const tagStr = card.tags.length > 0 ? ` [${card.tags.map((t) => `#${t.name}`).join(' ')}]` : '';
        const author = card.isRevealed && card.authorNickname ? ` _（已顯名：${card.authorNickname}）_` : '';
        lines.push(`- ${card.content}${tagStr}${author}`);
      }
    }
    lines.push('');
  }

  // Tag distribution
  if (tags.length > 0) {
    lines.push('## 標籤分布');
    lines.push('');
    lines.push('| 標籤 | 卡片數 | 出現區塊 |');
    lines.push('|------|-------|---------|');
    for (const tag of tags) {
      const tagCards = cards.filter((c) => c.tags.some((t) => t.id === tag.id));
      const sections = [...new Set(tagCards.map((c) => SECTION_LABELS[c.section as SectionType]))];
      lines.push(`| ${tag.name} | ${tagCards.length} | ${sections.join('、') || '—'} |`);
    }
    lines.push('');
  }

  // Existing action items so the AI can avoid duplicates
  lines.push('## 既有 action items（避免重複建議）');
  lines.push('');
  if (actionItems.length === 0) {
    lines.push('_（尚無，AI 可自由提出新的建議）_');
  } else {
    for (const item of actionItems) {
      const check = item.isCompleted ? 'x' : ' ';
      const assignee = item.assignee ? ` — 負責人：${item.assignee}` : '';
      const due = item.dueDate ? ` — 期限：${item.dueDate}` : '';
      lines.push(`- [${check}] ${item.description}${assignee}${due}`);
    }
  }
  lines.push('');

  lines.push('— 回顧資料結束 —');
  lines.push('');
  lines.push(
    '現在請依上述格式產出「主題 / 強訊號 / 建議的 action items / 開放問題」四個段落。',
  );

  return lines.join('\n');
}
