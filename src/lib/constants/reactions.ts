/**
 * Default reaction-bar palette. A team may override this set via team
 * settings (teams.reaction_emojis); null/empty there falls back to this
 * list. Kept in one place so ReactionBar (the picker) and the team-settings
 * editor agree on what "the defaults" are.
 */
export const DEFAULT_REACTION_EMOJIS: string[] = [
  '🔥', '👏', '🙌', '💪', '🚀',
  '❤️', '🎉', '😮', '😆', '🤔',
  '😢', '😠', '😎', '🫡', '🛐',
  '💯', '❓', '❗', '✅', '❌',
];
