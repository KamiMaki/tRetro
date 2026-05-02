export const CREATE_TABLES_SQL = `
CREATE TABLE IF NOT EXISTS rooms (
  id            TEXT PRIMARY KEY,
  name          TEXT NOT NULL,
  status        TEXT NOT NULL DEFAULT 'active' CHECK(status IN ('active','closed')),
  created_at    TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at    TEXT NOT NULL DEFAULT (datetime('now')),
  closed_at     TEXT,
  webhook_url   TEXT,
  template_id   TEXT NOT NULL DEFAULT 'classic'
);

CREATE TABLE IF NOT EXISTS participants (
  id              TEXT PRIMARY KEY,
  room_id         TEXT NOT NULL REFERENCES rooms(id) ON DELETE CASCADE,
  nickname        TEXT NOT NULL,
  is_scrum_master INTEGER NOT NULL DEFAULT 0,
  session_token   TEXT NOT NULL UNIQUE,
  joined_at       TEXT NOT NULL DEFAULT (datetime('now')),
  is_online       INTEGER NOT NULL DEFAULT 1
);

CREATE TABLE IF NOT EXISTS cards (
  id                TEXT PRIMARY KEY,
  room_id           TEXT NOT NULL REFERENCES rooms(id) ON DELETE CASCADE,
  section           TEXT NOT NULL CHECK(section IN ('went-well','to-improve','thanks','deep-dive')),
  content           TEXT NOT NULL,
  author_id         TEXT NOT NULL REFERENCES participants(id),
  is_revealed       INTEGER NOT NULL DEFAULT 0,
  revealed_nickname TEXT,
  created_at        TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at        TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS tags (
  id            TEXT PRIMARY KEY,
  room_id       TEXT NOT NULL REFERENCES rooms(id) ON DELETE CASCADE,
  name          TEXT NOT NULL,
  color         TEXT NOT NULL DEFAULT '#6B7280',
  is_default    INTEGER NOT NULL DEFAULT 0,
  UNIQUE(room_id, name)
);

CREATE TABLE IF NOT EXISTS card_tags (
  card_id       TEXT NOT NULL REFERENCES cards(id) ON DELETE CASCADE,
  tag_id        TEXT NOT NULL REFERENCES tags(id) ON DELETE CASCADE,
  PRIMARY KEY (card_id, tag_id)
);

CREATE TABLE IF NOT EXISTS action_items (
  id            TEXT PRIMARY KEY,
  room_id       TEXT NOT NULL REFERENCES rooms(id) ON DELETE CASCADE,
  description   TEXT NOT NULL,
  assignee      TEXT,
  due_date      TEXT,
  is_completed  INTEGER NOT NULL DEFAULT 0,
  created_at    TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at    TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE INDEX IF NOT EXISTS idx_participants_room ON participants(room_id);
CREATE INDEX IF NOT EXISTS idx_participants_token ON participants(session_token);
CREATE INDEX IF NOT EXISTS idx_cards_room ON cards(room_id);
CREATE INDEX IF NOT EXISTS idx_cards_section ON cards(room_id, section);
CREATE INDEX IF NOT EXISTS idx_tags_room ON tags(room_id);
CREATE INDEX IF NOT EXISTS idx_action_items_room ON action_items(room_id);

CREATE TABLE IF NOT EXISTS comments (
  id            TEXT PRIMARY KEY,
  card_id       TEXT NOT NULL REFERENCES cards(id) ON DELETE CASCADE,
  room_id       TEXT NOT NULL REFERENCES rooms(id) ON DELETE CASCADE,
  author_id     TEXT NOT NULL REFERENCES participants(id),
  content       TEXT NOT NULL,
  created_at    TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS reactions (
  id            TEXT PRIMARY KEY,
  card_id       TEXT NOT NULL REFERENCES cards(id) ON DELETE CASCADE,
  room_id       TEXT NOT NULL REFERENCES rooms(id) ON DELETE CASCADE,
  participant_id TEXT NOT NULL REFERENCES participants(id),
  emoji         TEXT NOT NULL,
  created_at    TEXT NOT NULL DEFAULT (datetime('now')),
  UNIQUE(card_id, participant_id, emoji)
);

CREATE TABLE IF NOT EXISTS votes (
  id            TEXT PRIMARY KEY,
  card_id       TEXT NOT NULL REFERENCES cards(id) ON DELETE CASCADE,
  room_id       TEXT NOT NULL REFERENCES rooms(id) ON DELETE CASCADE,
  participant_id TEXT NOT NULL REFERENCES participants(id),
  created_at    TEXT NOT NULL DEFAULT (datetime('now')),
  UNIQUE(card_id, participant_id)
);

CREATE TABLE IF NOT EXISTS drawings (
  id            TEXT PRIMARY KEY,
  card_id       TEXT NOT NULL REFERENCES cards(id) ON DELETE CASCADE,
  room_id       TEXT NOT NULL REFERENCES rooms(id) ON DELETE CASCADE,
  author_id     TEXT NOT NULL REFERENCES participants(id),
  data          TEXT NOT NULL,
  created_at    TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE INDEX IF NOT EXISTS idx_comments_card ON comments(card_id);
CREATE INDEX IF NOT EXISTS idx_reactions_card ON reactions(card_id);
CREATE INDEX IF NOT EXISTS idx_votes_card ON votes(card_id);
CREATE INDEX IF NOT EXISTS idx_drawings_card ON drawings(card_id);

-- Sprint metrics: anonymous per-participant scores aggregated to team-level
-- The participant_id is stored ONLY for dedup (one submission per metric per
-- participant per room). It is never returned in any API payload.
CREATE TABLE IF NOT EXISTS metric_submissions (
  id             TEXT PRIMARY KEY,
  room_id        TEXT NOT NULL REFERENCES rooms(id) ON DELETE CASCADE,
  participant_id TEXT NOT NULL REFERENCES participants(id) ON DELETE CASCADE,
  metric_key     TEXT NOT NULL,
  score          INTEGER NOT NULL CHECK(score BETWEEN 1 AND 10),
  created_at     TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at     TEXT NOT NULL DEFAULT (datetime('now')),
  UNIQUE(room_id, participant_id, metric_key)
);

CREATE INDEX IF NOT EXISTS idx_metric_submissions_room ON metric_submissions(room_id);
CREATE INDEX IF NOT EXISTS idx_metric_submissions_room_metric ON metric_submissions(room_id, metric_key);
`;
