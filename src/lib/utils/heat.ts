/**
 * Card heat — how much conversation a card has actually generated.
 *
 * Two signals, both of them talk: comments, and the emoji reactions stuck to
 * the card. Votes are deliberately excluded — a vote says "this matters",
 * which the consensus ring already shows, not "we discussed this". Cheers are
 * excluded too: they cost one click each and fire in bursts, so any threshold
 * built on them is spam bait.
 *
 * The result drives a breathing glow on the board and in discussion mode, so
 * the cards the room actually talked about are visible before anyone has read
 * a word: warm (≥6) breathes violet-pink, hot (≥12) burns amber.
 *
 * This is the single derivation — Card, the discussion queue and the focused
 * card all call it rather than re-deriving the rule three times.
 */

export type HeatLevel = 'warm' | 'hot' | null;

/** Score at which a card starts breathing violet-pink. */
export const HEAT_WARM_SCORE = 6;
/** Score at which it turns amber and glows harder. */
export const HEAT_HOT_SCORE = 12;

const num = (n: number | undefined | null): number => (Number.isFinite(n) ? (n as number) : 0);

export function heatScore(commentCount: number, reactionTotal: number): number {
  return num(commentCount) + num(reactionTotal);
}

export function heatLevel(score: number): HeatLevel {
  if (score >= HEAT_HOT_SCORE) return 'hot';
  if (score >= HEAT_WARM_SCORE) return 'warm';
  return null;
}

/**
 * The CSS class for a card's heat, or undefined when it is still cold.
 * Kept as a class (not inline style) so the glow can be a keyframe animation
 * with a reduced-motion fallback — see `.heat-warm` / `.heat-hot` in globals.css.
 *
 * Everything it needs already lives on the card, so call sites pass the card
 * and nothing else.
 */
export function cardHeatClass(card: {
  comments?: unknown[];
  reactions?: { count: number }[];
}): string | undefined {
  const reactionTotal = (card.reactions ?? []).reduce((sum, r) => sum + num(r?.count), 0);
  const level = heatLevel(heatScore(card.comments?.length ?? 0, reactionTotal));
  return level ? `heat-${level}` : undefined;
}
