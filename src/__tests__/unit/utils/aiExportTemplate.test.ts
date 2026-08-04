import { buildAiSummaryMarkdown, DEFAULT_SUMMARY_PROMPT } from '@/lib/utils/aiExportTemplate';
import type { Room, CardDB, Tag, ActionItem, MetricAggregate } from '@/lib/types';

function makeRoom(overrides: Partial<Room> = {}): Room {
  return {
    id: 'room-1',
    name: 'Sprint 10 Retro',
    status: 'active',
    createdAt: '2025-01-01T00:00:00',
    updatedAt: '2025-01-01T00:00:00',
    closedAt: null,
    webhookUrl: null,
    templateId: 'classic',
    teamId: null,
    participantCount: null,
    isAnonymous: false,
    ...overrides,
  };
}

type CardWithMeta = CardDB & {
  tags: Tag[];
  authorNickname: string | null;
  comments?: { authorNickname: string | null; content: string; imageData: string | null }[];
  voteCount?: number;
  reactions?: { emoji: string; count: number }[];
};

function makeCard(overrides: Partial<CardWithMeta> = {}): CardWithMeta {
  return {
    id: 'card-1',
    roomId: 'room-1',
    section: 'went-well',
    content: 'Team collaboration was great',
    authorId: 'participant-1',
    isRevealed: false,
    revealedNickname: null,
    tags: [],
    authorNickname: null,
    createdAt: '2025-01-01T00:00:00',
    updatedAt: '2025-01-01T00:00:00',
    ...overrides,
  };
}

describe('buildAiSummaryMarkdown — summary prompt header', () => {
  const cards = [makeCard()];
  const tags: Tag[] = [];
  const actionItems: ActionItem[] = [];

  it('uses DEFAULT_SUMMARY_PROMPT when no custom prompt is supplied', () => {
    const md = buildAiSummaryMarkdown(makeRoom(), cards, tags, actionItems, 4);
    // The default header begins with the agile-coach framing.
    expect(md.startsWith(DEFAULT_SUMMARY_PROMPT)).toBe(true);
    expect(md).toContain('你是一位資深敏捷教練');
  });

  it('uses DEFAULT_SUMMARY_PROMPT when summaryPrompt is null (teamless room)', () => {
    const md = buildAiSummaryMarkdown(makeRoom(), cards, tags, actionItems, 4, undefined, null);
    expect(md.startsWith(DEFAULT_SUMMARY_PROMPT)).toBe(true);
  });

  it('uses the custom summary prompt verbatim as the header when provided', () => {
    const custom = '請用一句話總結這場 retro，並列出三個重點。';
    const md = buildAiSummaryMarkdown(makeRoom(), cards, tags, actionItems, 4, undefined, custom);
    expect(md.startsWith(custom)).toBe(true);
    // The default header must not appear when a custom one is set.
    expect(md).not.toContain('你是一位資深敏捷教練');
    // Retro body still renders after the custom header.
    expect(md).toContain('# 回顧會議：Sprint 10 Retro');
  });
});

describe('buildAiSummaryMarkdown — metadata block', () => {
  const tags: Tag[] = [];
  const actionItems: ActionItem[] = [];

  it('labels the vote-denominator line correctly (not "參與人數")', () => {
    const cards = [makeCard()];
    const md = buildAiSummaryMarkdown(makeRoom(), cards, tags, actionItems, 4);
    expect(md).toContain('投票基數（用於比例計算）：4');
    expect(md).not.toContain('參與人數（匿名，僅人數）');
  });

  it('renders a genuine participant count line when supplied via options', () => {
    const cards = [makeCard()];
    const md = buildAiSummaryMarkdown(makeRoom(), cards, tags, actionItems, 4, undefined, undefined, {
      participantCount: 7,
    });
    expect(md).toContain('參與人數：7');
  });

  it('renders the anonymous mode line for anonymous rooms', () => {
    const cards = [makeCard()];
    const md = buildAiSummaryMarkdown(makeRoom({ isAnonymous: true }), cards, tags, actionItems, 4);
    expect(md).toContain('模式：匿名（卡片不具名）');
  });

  it('renders the named mode line for non-anonymous rooms', () => {
    const cards = [makeCard()];
    const md = buildAiSummaryMarkdown(makeRoom({ isAnonymous: false }), cards, tags, actionItems, 4);
    expect(md).toContain('模式：具名');
  });
});

describe('buildAiSummaryMarkdown — card line: votes & reactions', () => {
  const tags: Tag[] = [];
  const actionItems: ActionItem[] = [];

  it('appends vote count and reaction summary to a card line', () => {
    const cards = [
      makeCard({
        voteCount: 3,
        reactions: [
          { emoji: '👍', count: 2 },
          { emoji: '🎉', count: 1 },
        ],
      }),
    ];
    const md = buildAiSummaryMarkdown(makeRoom(), cards, tags, actionItems, 4);
    expect(md).toContain('Team collaboration was great（3 票） 👍×2 🎉×1');
  });

  it('renders no "（0 票）" suffix when the card has zero votes', () => {
    const cards = [makeCard({ voteCount: 0 })];
    const md = buildAiSummaryMarkdown(makeRoom(), cards, tags, actionItems, 4);
    expect(md).not.toContain('（0 票）');
  });

  it('renders no vote suffix when voteCount is undefined', () => {
    const cards = [makeCard()];
    const md = buildAiSummaryMarkdown(makeRoom(), cards, tags, actionItems, 4);
    expect(md).not.toContain('票）');
  });

  it('still nests comments under the card line, after votes/reactions', () => {
    const cards = [
      makeCard({
        voteCount: 2,
        comments: [{ authorNickname: 'Alice', content: 'Agreed!', imageData: null }],
      }),
    ];
    const md = buildAiSummaryMarkdown(makeRoom(), cards, tags, actionItems, 4);
    expect(md).toContain('（2 票）');
    expect(md).toContain('  - 💬 Alice：Agreed!');
    // The comment line must come after the card's own content line.
    const cardIdx = md.indexOf('Team collaboration was great（2 票）');
    const commentIdx = md.indexOf('  - 💬 Alice：Agreed!');
    expect(cardIdx).toBeGreaterThan(-1);
    expect(commentIdx).toBeGreaterThan(cardIdx);
  });
});

describe('buildAiSummaryMarkdown — anonymous-mode prompt guidance', () => {
  it('DEFAULT_SUMMARY_PROMPT tells the AI that anonymous mode is intentional, not missing data', () => {
    expect(DEFAULT_SUMMARY_PROMPT).toContain('模式');
    expect(DEFAULT_SUMMARY_PROMPT).toContain('刻意隱藏');
    // The sentence must explicitly tell the AI not to flag missing authors
    // as a data-quality issue.
    expect(DEFAULT_SUMMARY_PROMPT).toMatch(/勿.*視為.*問題/);
  });

  it('keeps the existing 票數 instruction', () => {
    expect(DEFAULT_SUMMARY_PROMPT).toContain('必要時引用票數');
  });
});

describe('buildAiSummaryMarkdown — deepened analysis sections', () => {
  it('requests all seven analysis sections by name', () => {
    expect(DEFAULT_SUMMARY_PROMPT).toContain('主題分群');
    expect(DEFAULT_SUMMARY_PROMPT).toContain('強訊號');
    expect(DEFAULT_SUMMARY_PROMPT).toContain('情緒與士氣分析');
    expect(DEFAULT_SUMMARY_PROMPT).toContain('被忽略的聲音');
    expect(DEFAULT_SUMMARY_PROMPT).toContain('風險與阻礙');
    expect(DEFAULT_SUMMARY_PROMPT).toContain('建議的 action items');
    expect(DEFAULT_SUMMARY_PROMPT).toContain('給主持人的下次建議');
  });

  it('includes each new section heading in the fenced output schema', () => {
    expect(DEFAULT_SUMMARY_PROMPT).toContain('## 情緒與士氣分析');
    expect(DEFAULT_SUMMARY_PROMPT).toContain('## 被忽略的聲音');
    expect(DEFAULT_SUMMARY_PROMPT).toContain('## 風險與阻礙');
    expect(DEFAULT_SUMMARY_PROMPT).toContain('## 給主持人的下次建議');
  });

  it('connects Sprint metric averages to qualitative signals in the mood section', () => {
    expect(DEFAULT_SUMMARY_PROMPT).toContain('Sprint 指標平均分');
  });

  it('asks for a quality check of existing action items', () => {
    expect(DEFAULT_SUMMARY_PROMPT).toContain('既有 action items 是否具體、可指派、可');
  });

  it('keeps the whole default template dense (≲ 90 lines)', () => {
    const lineCount = DEFAULT_SUMMARY_PROMPT.split('\n').length;
    expect(lineCount).toBeLessThanOrEqual(90);
  });
});

describe('buildAiSummaryMarkdown — sprint metrics section', () => {
  const tags: Tag[] = [];
  const actionItems: ActionItem[] = [];

  const metrics: MetricAggregate[] = [
    { metricKey: 'speed', average: 7.5, submissions: 3, distribution: new Array(10).fill(0) },
    { metricKey: 'comms', average: null, submissions: 0, distribution: new Array(10).fill(0) },
  ];

  it('renders a metrics section when at least one metric has submissions', () => {
    const cards = [makeCard()];
    const md = buildAiSummaryMarkdown(makeRoom(), cards, tags, actionItems, 4, undefined, undefined, {
      metrics,
    });
    expect(md).toContain('開發速度');
    expect(md).toContain('7.5');
    expect(md).toContain('3');
  });

  it('omits the metrics section entirely when no submissions exist', () => {
    const cards = [makeCard()];
    const noSubmissions: MetricAggregate[] = [
      { metricKey: 'speed', average: null, submissions: 0, distribution: new Array(10).fill(0) },
    ];
    const md = buildAiSummaryMarkdown(makeRoom(), cards, tags, actionItems, 4, undefined, undefined, {
      metrics: noSubmissions,
    });
    expect(md).not.toContain('開發速度');
  });

  it('omits the metrics section when no metrics option is supplied', () => {
    const cards = [makeCard()];
    const md = buildAiSummaryMarkdown(makeRoom(), cards, tags, actionItems, 4);
    expect(md).not.toContain('開發速度');
  });
});
