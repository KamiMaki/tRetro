import { exportToMarkdown } from '@/lib/utils/export';
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
    isParked: false,
    tags: [],
    authorNickname: null,
    createdAt: '2025-01-01T00:00:00',
    updatedAt: '2025-01-01T00:00:00',
    ...overrides,
  };
}

function makeActionItem(overrides: Partial<ActionItem> = {}): ActionItem {
  return {
    id: 'ai-1',
    roomId: 'room-1',
    description: 'Set up monitoring',
    assignee: null,
    dueDate: null,
    isCompleted: false,
    createdAt: '2025-01-01T00:00:00',
    updatedAt: '2025-01-01T00:00:00',
    ...overrides,
  };
}

describe('exportToMarkdown', () => {
  it('includes the room name in the heading', () => {
    const md = exportToMarkdown(makeRoom(), [], [], [], 3);
    expect(md).toContain('Sprint 10 Retro');
  });

  it('includes participant count and status', () => {
    const md = exportToMarkdown(makeRoom(), [], [], [], 5);
    expect(md).toContain('Participants: 5');
    expect(md).toContain('Status: active');
  });

  it('renders all four section headings', () => {
    const md = exportToMarkdown(makeRoom(), [], [], [], 0);
    // Match the labels in SECTION_LABELS — Went Well / Didn't Go Well /
    // Thanks / Deep Discussion.
    expect(md).toContain('## Went Well');
    expect(md).toContain("## Didn't Go Well");
    expect(md).toContain('## Thanks');
    expect(md).toContain('## Deep Discussion');
  });

  it('shows _No cards_ for empty sections', () => {
    const md = exportToMarkdown(makeRoom(), [], [], [], 0);
    // All sections are empty, so _No cards_ should appear 4 times
    const matches = md.match(/_No cards_/g);
    expect(matches).toHaveLength(4);
  });

  it('renders card content in the correct section', () => {
    const card = makeCard({ section: 'went-well', content: 'Shipped on time' });
    const md = exportToMarkdown(makeRoom(), [card], [], [], 1);
    expect(md).toContain('Shipped on time');
  });

  it('does NOT show author nickname for unrevealed card', () => {
    const card = makeCard({
      section: 'went-well',
      content: 'Anonymous feedback',
      isRevealed: false,
      authorNickname: 'Alice',
    });
    const md = exportToMarkdown(makeRoom(), [card], [], [], 1);
    expect(md).not.toContain('by Alice');
  });

  it('shows author nickname for revealed card', () => {
    const card = makeCard({
      section: 'to-improve',
      content: 'Slower CI',
      isRevealed: true,
      authorNickname: 'Bob',
    });
    const md = exportToMarkdown(makeRoom(), [card], [], [], 1);
    expect(md).toContain('by Bob');
  });

  it('renders card tags inline', () => {
    const tag: Tag = { id: 't1', roomId: 'room-1', name: 'Process', color: '#3b82f6' };
    const card = makeCard({ tags: [tag], content: 'Slow deploys' });
    const md = exportToMarkdown(makeRoom(), [card], [tag], [], 1);
    expect(md).toContain('[Process]');
  });

  it('includes tag statistics section', () => {
    const tag: Tag = { id: 't1', roomId: 'room-1', name: 'Bug', color: '#ef4444' };
    const card = makeCard({ section: 'went-well', tags: [tag] });
    const md = exportToMarkdown(makeRoom(), [card], [tag], [], 1);
    expect(md).toContain('## Tag Statistics');
    expect(md).toContain('Bug');
  });

  it('shows _No tags used_ when no tags exist', () => {
    const md = exportToMarkdown(makeRoom(), [], [], [], 0);
    expect(md).toContain('_No tags used_');
  });

  it('renders incomplete action items with empty checkbox', () => {
    const item = makeActionItem({ description: 'Write tests', isCompleted: false });
    const md = exportToMarkdown(makeRoom(), [], [], [item], 1);
    expect(md).toContain('- [ ] Write tests');
  });

  it('renders completed action items with checked checkbox', () => {
    const item = makeActionItem({ description: 'Deploy hotfix', isCompleted: true });
    const md = exportToMarkdown(makeRoom(), [], [], [item], 1);
    expect(md).toContain('- [x] Deploy hotfix');
  });

  it('shows assignee and due date on action items', () => {
    const item = makeActionItem({
      description: 'Review PR',
      assignee: 'Carol',
      dueDate: '2025-02-01',
    });
    const md = exportToMarkdown(makeRoom(), [], [], [item], 1);
    expect(md).toContain('@Carol');
    expect(md).toContain('2025-02-01');
  });

  it('shows _No action items_ when list is empty', () => {
    const md = exportToMarkdown(makeRoom(), [], [], [], 0);
    expect(md).toContain('_No action items_');
  });
});
