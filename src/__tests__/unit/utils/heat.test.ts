import {
  HEAT_WARM_SCORE,
  HEAT_HOT_SCORE,
  heatScore,
  heatLevel,
  cardHeatClass,
} from '@/lib/utils/heat';

describe('heat', () => {
  it('counts discussion only: comments + emoji reactions, each worth one', () => {
    expect(heatScore(0, 0)).toBe(0);
    expect(heatScore(3, 0)).toBe(3);
    expect(heatScore(0, 3)).toBe(3);
    expect(heatScore(2, 3)).toBe(5);
  });

  it('treats missing / non-finite inputs as zero rather than NaN', () => {
    expect(heatScore(undefined as unknown as number, 2)).toBe(2);
    expect(heatScore(1, NaN)).toBe(1);
  });

  it('has exclusive-below / inclusive-at thresholds', () => {
    expect(heatLevel(HEAT_WARM_SCORE - 1)).toBeNull();
    expect(heatLevel(HEAT_WARM_SCORE)).toBe('warm');
    expect(heatLevel(HEAT_HOT_SCORE - 1)).toBe('warm');
    expect(heatLevel(HEAT_HOT_SCORE)).toBe('hot');
    expect(heatLevel(999)).toBe('hot');
  });

  it('exposes the documented thresholds', () => {
    expect(HEAT_WARM_SCORE).toBe(6);
    expect(HEAT_HOT_SCORE).toBe(12);
  });

  it('sums every reaction emoji on the card, not the number of emoji used', () => {
    const card = (comments: number, reactionCounts: number[]) => ({
      comments: new Array(comments).fill(null),
      reactions: reactionCounts.map((count) => ({ count })),
    });

    // 1 comment + 1 reaction = 2 → cold
    expect(cardHeatClass(card(1, [1]))).toBeUndefined();
    // 2 comments + (2+2) = 6 → warm
    expect(cardHeatClass(card(2, [2, 2]))).toBe('heat-warm');
    // 2 comments + (6+4) = 12 → hot
    expect(cardHeatClass(card(2, [6, 4]))).toBe('heat-hot');
    // reactions alone are enough
    expect(cardHeatClass(card(0, [6]))).toBe('heat-warm');
    // as are comments alone
    expect(cardHeatClass(card(12, []))).toBe('heat-hot');
  });

  it('ignores votes — a much-voted, undiscussed card stays cold', () => {
    // Assigned first: passing this inline would not even compile, because
    // voteCount is no longer part of the helper's input at all.
    const hotlyVoted = { voteCount: 99, comments: [], reactions: [] };
    expect(cardHeatClass(hotlyVoted)).toBeUndefined();
  });

  it('ignores cheers — they are one click each and would spam any threshold', () => {
    // Nothing about a cheer reaches this helper: the only inputs are the
    // card's own comments and reactions.
    expect(cardHeatClass({ comments: [], reactions: [] })).toBeUndefined();
    expect(cardHeatClass.length).toBe(1);
  });

  it('tolerates a card with no reactions array', () => {
    expect(cardHeatClass({ comments: new Array(6).fill(null) })).toBe('heat-warm');
  });
});
