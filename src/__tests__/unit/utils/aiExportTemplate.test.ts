import { buildAiSummaryMarkdown, DEFAULT_SUMMARY_PROMPT } from '@/lib/utils/aiExportTemplate';
import type { Room, CardDB, Tag, ActionItem } from '@/lib/types';

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

type CardWithMeta = CardDB & { tags: Tag[]; authorNickname: string | null };

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
