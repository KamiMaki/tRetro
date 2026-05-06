# Share mode (Scrum Master)

> Use this when you're driving a live retro and need to share your screen
> without exposing private info.

## Where it lives

A **Share mode** pill sits in the top-right of the room shell, visible only
to Scrum Masters. Press `S` to toggle it from the keyboard. The pill turns
mint with a live dot when share mode is on.

## What it changes

When share mode is **ON**:

- Every card's author label becomes "Anonymous" — even cards the SM revealed
  earlier. The avatar switches to the anonymous icon.
- Reveal / un-reveal / delete buttons disappear so the SM can't accidentally
  out a teammate while presenting.
- A new **⏸ park** / **↩ unpark** button appears on each card. Park sets a
  card aside (it shows a `parked` badge and fades) so the team can return to
  it later in the parking-lot deep-dive. Unpark sends it back to the active
  queue.
- On the **Sprint metrics** tab: your private scores disappear — the
  "you submitted" label, the dot on your own histogram bucket, and the
  submit/edit form. Only the team aggregate (average + histogram + min/max)
  stays visible.

When share mode is **OFF** (default), you're a normal participant: you can
fill cards, reveal yourself, score the sprint, etc.

## Suggested flow

1. **Brainstorm** — share mode OFF. Everyone (including you) fills in cards
   normally; you see "You" markers on yours.
2. **Discuss** — flip share mode ON. Start your screen share. Walk the team
   through cards using filter/sort in the Tools drawer; park anything that
   needs a deeper conversation.
3. **Wrap up** — flip share mode OFF when you're done sharing the screen and
   want to score the sprint privately.

## Editing tags after a card is sent

Any card you authored (or any card, if you're SM) now has an **edit tags**
button on its footer. Click it, toggle the tag chips, click `done`. The
update broadcasts live to everyone in the room.

This works in both share mode and regular mode.

## Tools drawer

The timer, tag filter, and sort controls live in a single **Tools** drawer.
Click the Tools pill (or press `T`) to open it. The drawer:

- Stays closed by default so the board uses the full screen.
- Shows a small dot on the pill when a timer is running or a tag filter is
  active so you don't forget.
- Persists open/closed state per session.

## Keyboard shortcuts

| Key | Action |
|-----|--------|
| `S` | Toggle share mode (SM only) |
| `T` | Toggle Tools drawer (timer + filter + sort) |
| `B` | Switch to Board tab |
| `A` | Switch to Action items tab |
| `M` | Switch to Sprint metrics tab |
| `?` | Show full shortcut list |
