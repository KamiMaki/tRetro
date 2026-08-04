// Server-side ceiling for free-text fields (card content, comment content).
// Without it an abusive client could persist multi-MB text rows in SQLite and
// fan them out to every connected socket. 10k chars is far beyond any genuine
// retro note while keeping a single payload small. Shared so cards and comments
// enforce the same bound.
export const MAX_CONTENT_CHARS = 10_000;

// Reject oversized image attachments before they hit the DB / fan out over the
// socket. ~3M base64 chars ≈ 2.2MB binary — plenty for a screenshot, while
// keeping a single payload from blowing up every connected client. Shared so
// cards and comments enforce the same image bound.
export const MAX_IMAGE_CHARS = 3_000_000;

/** True only for a base64 data-URL image (data:image/png;base64,...). */
export function isValidImageData(data: unknown): data is string {
  return typeof data === 'string' && /^data:image\/[a-z0-9.+-]+;base64,/i.test(data);
}

// Section editor bounds. A section label is a short column heading, an emoji
// is a single glyph (kept generous to allow multi-codepoint emoji). Shared by
// the section socket handler and the team-settings API so both surfaces apply
// the same rules.
export const MAX_SECTION_LABEL_CHARS = 40;
export const MAX_SECTION_EMOJI_CHARS = 16;

/** The five accent tones a section may use (mirrors SectionTone). */
export const SECTION_TONE_VALUES = ['mint', 'cyan', 'violet', 'pink', 'amber'] as const;

/** True when `tone` is one of the five allowed SectionTone values. */
export function isValidSectionTone(tone: unknown): tone is (typeof SECTION_TONE_VALUES)[number] {
  return typeof tone === 'string' && (SECTION_TONE_VALUES as readonly string[]).includes(tone);
}

// Cheer effects. A cheer is a toy: nothing is stored, so the only guard that
// matters is that the effect name is one we know how to animate (mirrors
// CheerEffect) and that no one can turn the room into a strobe light.
// The set spans 喜怒哀樂 on purpose: a retro needs an outlet for a bad sprint
// as much as for a good one, so anger and sorrow sit next to celebration.
export const CHEER_EFFECT_VALUES = [
  'confetti',
  'clap',
  'laugh',
  'love',
  'fire',
  'mindblown',
  'angry',
  'cry',
] as const;

/** True when `effect` is one of the eight allowed CheerEffect values. */
export function isValidCheerEffect(effect: unknown): effect is (typeof CHEER_EFFECT_VALUES)[number] {
  return typeof effect === 'string' && (CHEER_EFFECT_VALUES as readonly string[]).includes(effect);
}

// Sliding-window cheer budget per participant: 8 bursts per 4 seconds. Enough
// for enthusiastic mashing, low enough that a script can't flood every client
// with animation work. Excess is dropped silently — no error event, because a
// cheer is not a workflow step and a red toast would be worse than the drop.
export const CHEER_RATE_MAX = 8;
export const CHEER_RATE_WINDOW_MS = 4_000;

// Cheer combos. A combo is the room cheering *together*: three of the same
// effect inside 5 seconds, from at least two different people. The
// two-participant floor is the whole point — one person mashing a button is
// enthusiasm, two or more is a moment, and only the second kind deserves a
// full-panel takeover. The cooldown then keeps a hot room from chaining
// combos back to back; the room can still cheer freely, it just gets one
// mega celebration per effect per 8 seconds.
export const COMBO_WINDOW_MS = 5_000;
export const COMBO_MIN_CHEERS = 3;
export const COMBO_MIN_PARTICIPANTS = 2;
export const COMBO_COOLDOWN_MS = 8_000;
