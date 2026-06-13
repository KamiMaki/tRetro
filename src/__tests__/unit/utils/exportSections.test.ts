import { exportToMarkdown } from '@/lib/utils/export';
import { buildAiSummaryMarkdown } from '@/lib/utils/aiExportTemplate';
import type { Room, BoardSectionView } from '@/lib/types';

function makeRoom(): Room {
  return {
    id: 'r1',
    name: 'Custom Retro',
    status: 'active',
    createdAt: '2026-06-13 00:00:00',
    updatedAt: '2026-06-13 00:00:00',
    closedAt: null,
    webhookUrl: null,
    templateId: 'classic',
    teamId: 't1',
    participantCount: null,
    isAnonymous: false,
  };
}

// Minimal CardWithMeta-compatible card.
function card(id: string, section: string, content: string) {
  return {
    id,
    roomId: 'r1',
    section,
    content,
    authorId: 'p1',
    isRevealed: false,
    revealedNickname: null,
    createdAt: '2026-06-13 00:00:00',
    updatedAt: '2026-06-13 00:00:00',
    tags: [],
    authorNickname: null,
    comments: [],
  };
}

const customSections: BoardSectionView[] = [
  { sectionKey: 'energy', label: '能量來源', emoji: '⚡', tone: 'mint' },
  { sectionKey: 'blockers', label: '阻礙', emoji: '🚧', tone: 'amber' },
];

describe('exportToMarkdown — custom sections', () => {
  it('renders the room custom section labels/emojis in order', () => {
    const cards = [card('c1', 'energy', 'pairing'), card('c2', 'blockers', 'flaky CI')];
    const md = exportToMarkdown(makeRoom(), cards, [], [], 3, customSections);

    expect(md).toContain('## ⚡ 能量來源 (1 cards)');
    expect(md).toContain('## 🚧 阻礙 (1 cards)');
    expect(md.indexOf('能量來源')).toBeLessThan(md.indexOf('阻礙')); // order preserved
    expect(md).toContain('pairing');
    expect(md).toContain('flaky CI');
  });

  it('falls back to the four built-ins when no sections are passed', () => {
    const md = exportToMarkdown(makeRoom(), [card('c1', 'went-well', 'shipped')], [], [], 1);
    expect(md).toContain('Went Well');
  });

  it('surfaces cards whose section was removed under an Uncategorized bucket', () => {
    const cards = [card('c1', 'energy', 'pairing'), card('c2', 'ghost-section', 'orphaned card')];
    const md = exportToMarkdown(makeRoom(), cards, [], [], 1, customSections);

    expect(md).toContain('Uncategorized');
    expect(md).toContain('orphaned card');
  });
});

describe('buildAiSummaryMarkdown — custom sections', () => {
  it('iterates the room custom sections', () => {
    const cards = [card('c1', 'energy', 'pairing'), card('c2', 'blockers', 'flaky CI')];
    const ai = buildAiSummaryMarkdown(makeRoom(), cards, [], [], 3, customSections);

    expect(ai).toContain('## ⚡ 能量來源（1）');
    expect(ai).toContain('## 🚧 阻礙（1）');
  });

  it('keeps orphaned cards under 未分類', () => {
    const cards = [card('c1', 'ghost', 'lost card')];
    const ai = buildAiSummaryMarkdown(makeRoom(), cards, [], [], 1, customSections);
    expect(ai).toContain('未分類');
    expect(ai).toContain('lost card');
  });
});
