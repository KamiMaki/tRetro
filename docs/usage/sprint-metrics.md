# Sprint metrics — usage guide

Track team-level health across each retro on seven dimensions, in
total privacy. Your individual scores never leave the server — only
the **team average** is shown to anyone, including the Scrum Master.

## What gets measured

| Emoji | 中文       | English   |
|-------|------------|-----------|
| ⚡    | 開發速度   | Speed     |
| 💬    | 溝通       | Comms     |
| ☀️    | 心情       | Mood      |
| 🎈    | 有趣度     | Fun       |
| ◆     | 開發品質   | Quality   |
| ⟳     | Refactor   | Refactor  |
| ⏱     | 解報案時間 | Incident  |

Each metric is scored 1–100. Higher is better.

## Submitting your scores

1. Join a retro room.
2. Scroll to the **Sprint metrics** panel below the four columns.
3. Click **Submit my scores** to expand the slider form.
4. Drag each slider to your private score (1 → terrible, 100 → great).
5. Click **Save anonymous scores**.

After saving:

- The team-aggregate bars update in real-time for **everyone** in the room.
- A toast confirms _"Your scores were saved anonymously."_
- The button becomes **Update my scores** — you can re-submit any time, the new value overwrites the old.

The header says _"N submissions · you submitted"_ so you can see how many teammates have already weighed in. **Nothing reveals which teammates** — not even to the Scrum Master.

## Reading the team aggregate

Every metric row shows:

```
⚡ 開發速度  ████████░░░░░░  72.0   4 subs
```

- **Bar fill** = team average / 100
- **Number on the right** = team average to one decimal
- **N subs** = how many people submitted (count only, no names)

If no one has submitted yet for a metric, the row shows `—` and `0 subs`.

## Sprint history view

Open `/room/:id/history` for any retro. Below the board you'll find a
new section: **Sprint metrics — anonymous team aggregate**.

It contains one row per metric showing:
- The team's average for **this** retro plus submission count
- A bar sparkline trending across the **last 8 retros** (oldest left → newest right)
- Hover any bar to see the room name and exact average

Use this to spot trends — e.g. mood dipping over three sprints, or
quality climbing as refactor time goes up.

## Privacy guarantees

| What we store | Where | Who can see it |
|---|---|---|
| Your individual scores | Server DB only | Nobody (server uses for dedup) |
| Team averages | Server + clients | Everyone in the room |
| "N submissions" count | Server + clients | Everyone (count only, never names) |
| **Who submitted what** | **Nowhere** | **Never exposed** |

Even the Scrum Master cannot see who submitted what. The participant
ID column in the database is used only to ensure each person counts
once per metric — it's never serialised in any HTTP response or
WebSocket message.

If you don't want a metric to be averaged into the team total, simply
don't submit. The server only counts submissions it has received.

## FAQ

**Can I delete my scores?**
Re-submit with a value that better represents your view. Submitting
overwrites your previous values; the database always holds at most
one score per metric per participant per room.

**What if I leave the room before others?**
Your scores stay in the aggregate. Closing the browser doesn't delete
them. Closing the room (Scrum Master action) doesn't delete them
either — the aggregate remains visible on the history page.

**Why is my score not showing on the bars?**
The bars show the team **average**, not individual values. Your slider
shows your private score in the slider thumb position; what others
see is the average mixed in with everyone else's.
