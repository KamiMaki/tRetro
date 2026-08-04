import type { Room, CardDB, Tag, ActionItem, BoardSectionView, MetricAggregate } from '../types';
import { METRIC_DEFS } from '../types';
import { resolveExportSections } from './export';
import { taipeiTimestamp } from './datetime';

interface ExportComment {
  authorNickname: string | null;
  content: string;
  imageData: string | null;
}

interface CardReactionSummary {
  emoji: string;
  count: number;
}

interface CardWithMeta extends CardDB {
  tags: Tag[];
  authorNickname: string | null;
  comments?: ExportComment[];
  /** Per-card vote count. Omitted/undefined when not loaded by the caller. */
  voteCount?: number;
  /** Per-card emoji reaction summary. Omitted/undefined when not loaded. */
  reactions?: CardReactionSummary[];
}

/** Extra, optional signals for the AI-summary export. Kept separate from the
 * required positional params so callers that don't have this data (or don't
 * need it) aren't forced to pass anything. */
export interface AiSummaryOptions {
  /** Genuine live participant headcount — distinct from the vote
   *  denominator, which may be a facilitator-configured override. */
  participantCount?: number;
  /** Sprint-metrics team aggregate for the room, if any submissions exist. */
  metrics?: MetricAggregate[];
}

/**
 * Default AI-summary prompt header. Exported so a team can seed/preview it in
 * team settings and so the export route can fall back to it when a team has
 * no custom summary_prompt. Used as the header that precedes the retro
 * content in the ?format=ai export.
 */
export const DEFAULT_SUMMARY_PROMPT = `你是一位資深敏捷教練，正在檢視一場團隊回顧會議的紀錄。
以下資料每張卡片都是團隊成員的貢獻。資料中的「模式」欄位會標示本場回顧是否為匿名：若為匿名，代表作者身分是刻意隱藏，並非資料缺漏，請勿將「卡片沒有作者」視為資料品質問題。

請完成下列七項分析：

1. **主題分群** — 將每個區塊的卡片聚成 3–6 個有意義的主題。每個主題請給出：
   一句話標題、一句摘要、最具代表性的支撐卡片、以及情緒標註（正向 / 中立 / 負向）。
2. **強訊號** — 找出最值得注意的訊號：高票數、高留言量、或強共識的卡片或主題。
   必要時引用票數。
3. **情緒與士氣分析** — 綜合各區塊估計整體氣氛的正負向比例，並指出可觀察到的
   情緒走向（例如挫折感集中在單一主題）；若資料附有 Sprint 指標平均分，請將
   指標分數與質性訊號連結（例如某項指標分數偏低且多張卡片提及阻礙，屬同一現象）。
4. **被忽略的聲音** — 找出零票且零留言、但可能值得關注的卡片，最多列出 3 張，
   每張以一句話說明為何可能重要。
5. **風險與阻礙** — 找出反覆出現的阻礙，區分是系統性／結構性問題（流程、依賴、
   工具）或單一事件；若某張卡片與既有 action items 中尚未完成的項目相關，請指出。
6. **建議的 action items** — 根據主題提出 3–7 個具體、容易指派的 action items，
   供團隊在下一個 sprint 採用；同時檢視既有 action items 是否具體、可指派、可
   衡量，標註出寫得模糊的項目，並標註哪些建議已被現有 action items 涵蓋。
7. **給主持人的下次建議** — 最多 2–3 句話，根據資料具體建議下次回顧可調整之處
   （時間分配、參與均衡度、後續追蹤紀律），例如某區塊卡片數明顯失衡，或卡片
   多但票數少、代表投票階段可能太趕。

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

## 情緒與士氣分析
- ...

## 被忽略的聲音
- {卡片內容}：{為何可能重要}
（最多 3 項）

## 風險與阻礙
- ...

## 建議的 action items
- [ ] {action 內容} — {為什麼重要} {（是否已被現有 action 涵蓋：是/否）}
- 既有 action items 品質檢查：...

## 給主持人的下次建議
- ...
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
  voteDenominator: number,
  sections?: BoardSectionView[],
  summaryPrompt?: string | null,
  options?: AiSummaryOptions,
): string {
  const lines: string[] = [];
  // The team may customise the prompt header; fall back to the default when
  // unset (null / teamless room).
  lines.push(summaryPrompt ?? DEFAULT_SUMMARY_PROMPT);

  const exportSections = resolveExportSections(sections);
  const labelByKey = new Map(exportSections.map((s) => [s.sectionKey, s.label]));

  lines.push(`# 回顧會議：${room.name}`);
  lines.push('');
  lines.push(`- 狀態：${room.status === 'active' ? '進行中' : '已關閉'}`);
  lines.push(`- 模式：${room.isAnonymous ? '匿名（卡片不具名）' : '具名'}`);
  if (options?.participantCount != null) {
    lines.push(`- 參與人數：${options.participantCount}`);
  }
  // This is the vote denominator (facilitator-configured headcount, or a
  // live-session fallback) used for ratio calculations — NOT a headcount.
  lines.push(`- 投票基數（用於比例計算）：${voteDenominator}`);
  lines.push(`- 卡片總數：${cards.length}`);
  lines.push(`- 標籤數：${tags.length}`);
  lines.push(`- 既有 action items 數：${actionItems.length}`);
  lines.push(`- 匯出時間：${taipeiTimestamp()}`);
  lines.push('');

  const renderSection = (label: string, emoji: string, sectionCards: CardWithMeta[]) => {
    lines.push(`## ${emoji} ${label}（${sectionCards.length}）`);
    lines.push('');
    if (sectionCards.length === 0) {
      lines.push('_（本區塊無卡片）_');
    } else {
      for (const card of sectionCards) {
        const tagStr = card.tags.length > 0 ? ` [${card.tags.map((t) => `#${t.name}`).join(' ')}]` : '';
        const voteStr = card.voteCount && card.voteCount > 0 ? `（${card.voteCount} 票）` : '';
        const reactionStr =
          card.reactions && card.reactions.length > 0
            ? ` ${card.reactions.map((r) => `${r.emoji}×${r.count}`).join(' ')}`
            : '';
        const author = card.isRevealed && card.authorNickname ? ` _（已顯名：${card.authorNickname}）_` : '';
        lines.push(`- ${card.content}${tagStr}${voteStr}${reactionStr}${author}`);
        for (const cm of card.comments ?? []) {
          const who = cm.authorNickname ? `${cm.authorNickname}：` : '';
          const img = cm.imageData ? (cm.content ? ' [圖片]' : '[圖片]') : '';
          lines.push(`  - 💬 ${who}${cm.content}${img}`.trimEnd());
        }
      }
    }
    lines.push('');
  };

  const knownKeys = new Set(exportSections.map((s) => s.sectionKey));
  for (const section of exportSections) {
    renderSection(section.label, section.emoji, cards.filter((c) => c.section === section.sectionKey));
  }
  // Cards whose section was removed still surface, never silently dropped.
  const orphans = cards.filter((c) => !knownKeys.has(c.section));
  if (orphans.length > 0) {
    renderSection('未分類', '🗂️', orphans);
  }

  // Tag distribution
  if (tags.length > 0) {
    lines.push('## 標籤分布');
    lines.push('');
    lines.push('| 標籤 | 卡片數 | 出現區塊 |');
    lines.push('|------|-------|---------|');
    for (const tag of tags) {
      const tagCards = cards.filter((c) => c.tags.some((t) => t.id === tag.id));
      const sectionLabels = [...new Set(tagCards.map((c) => labelByKey.get(c.section) ?? c.section))];
      lines.push(`| ${tag.name} | ${tagCards.length} | ${sectionLabels.join('、') || '—'} |`);
    }
    lines.push('');
  }

  // Sprint metrics (anonymous team averages). Rendered only when at least
  // one metric has real submissions — an all-empty aggregate is noise, not
  // signal.
  const metrics = options?.metrics ?? [];
  const hasMetricSubmissions = metrics.some((m) => m.submissions > 0);
  if (hasMetricSubmissions) {
    lines.push('## Sprint 指標（匿名平均，1–10 分）');
    lines.push('');
    lines.push('| 指標 | 平均分 | 提交數 |');
    lines.push('|------|-------|-------|');
    for (const m of metrics) {
      const label = METRIC_DEFS.find((d) => d.key === m.metricKey)?.label ?? m.metricKey;
      const avg = m.average != null ? m.average.toFixed(1) : '—';
      lines.push(`| ${label} | ${avg} | ${m.submissions} |`);
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
    '現在請依上述格式產出「主題 / 強訊號 / 情緒與士氣分析 / 被忽略的聲音 / 風險與阻礙 / 建議的 action items / 給主持人的下次建議」七個段落。',
  );

  return lines.join('\n');
}
