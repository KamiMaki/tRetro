# Discussion mode (Scrum Master)

> Use this when you're facilitating the live retro and want to walk the team
> through every card without bias.

## Where it lives

A new **Discussion** tab appears in the room header next to *Board*, *Action items*,
and *Sprint metrics*. **Only Scrum Masters see it.** Press `D` to jump there if
you have a keyboard. The badge on the tab shows the current parking-lot size.

## What changes vs. the regular Board

- **Author info is hidden, always.** Even if a card was revealed (the author
  put their name on it), the Discussion view shows it as anonymous. This is
  deliberate — it removes the bias of "oh, that's Mira's card again."
- Cards group by **tag** automatically. Click a tag chip in the rail to walk
  one tag at a time. The first chip is **all** so you can also do a flat pass.
- You pick the order: most-voted (default), most-reactions, or oldest-first.

## The three buttons on each card

| Button | What it does | Persisted? |
|--------|--------------|------------|
| **➜ Action** | Opens the Action Items composer with the card's text pre-filled, switches you to that tab. Type the **Owner** (free text) and a due date if you have one, hit Add. | Action item is saved per the usual rules. The card itself is also marked "discussed" locally so you don't revisit it. |
| **⏸ Park** | Sends the card to the right-hand **Parking lot**. Useful for things that need a deeper conversation than a 60-second timebox can hold. | Persisted on the server (everyone sees a "parked" badge on the card in the main Board, slightly faded). |
| **✓ Discussed** | Local marker — fades the card so you visually track progress. | Session-only; resets if you reload. |

The Action button also marks the card as "discussed" automatically (so you
don't talk about the same item twice).

## Parking lot

The right column lists every card you've parked, in the order they came in.
For each one you can:

- **➜ Action** — same as above; converts to action item.
- **↩ Unpark** — sends it back into the active queue (also drops the "parked"
  badge in the Board view).

Once your scheduled time runs out, the parked cards become your "next sprint
to-do list" topic — bring them up at the start of the next retro or schedule a
follow-up.

## Action item Owner field

The Action items composer no longer has a participant dropdown. The **Owner**
field is now a free-text input — type whoever should own the work, including
people not in this room ("Mira", "Platform team", "Vendor X"). Same `assignee`
column on disk; only the input UX changed.

## Suggested flow (15-minute walk)

1. Open Discussion. Glance at the tag rail to see where the cards cluster.
2. Click the heaviest tag — that's usually where the team's signal is loudest.
3. Read the top card. 30 seconds. Decide: **Action**, **Park**, or **Discussed**.
4. Repeat for each card in the group. Move to the next tag.
5. End with the parking lot — anything left there becomes a follow-up.

## What it doesn't do (yet)

- No timer per tag (use the Phase bar timer if you want one).
- No "discussed" marker that persists across reloads — that's intentional;
  every retro should start with a fresh slate.
- No "convert all parked → action items" bulk button — easy to add if asked.
