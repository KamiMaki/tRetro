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
