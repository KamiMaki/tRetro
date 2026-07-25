# Team Login — Usage Guide

This explains how to sign in to RetroXpert now that the daily-password gate
is gone, what the password-field eye icon does, and what "anonymous mode"
means when you create a retro.

---

## How do I log in?

There's just one login step now: **team login**.

1. Visiting any page without a team session sends you to `/login`, which
   shows the **Pick your team** screen.
2. What you see next depends on whether any teams exist yet:
   - **If teams already exist:** choose your team from the dropdown and
     type its password, or click **+ Create new team** if your team
     doesn't exist yet, then click **Enter team →**.
   - **On a fresh instance with no teams yet:** there's no dropdown or
     Enter button — instead you'll see a **+ Create a team** button.
     Click it to create the first team, which also signs you in.

That's it — there's no separate daily password to remember anymore. Your
team session lasts **30 days**, so you stay signed in across browser
restarts until you explicitly switch teams.

If you follow a shared retro link while logged out, you're sent to `/login`
first and land back on that exact retro after you sign in.

---

## The eye icon on password fields

Every password field (team login, create-team, confirm-password) now has a
small eye icon on the right edge:

- Click it to reveal the password as plain text — useful for checking you
  typed it correctly before submitting.
- Click it again (now showing a crossed-out eye) to mask it again.

This is purely a display toggle; it doesn't change what gets submitted.

---

## What does "anonymous mode" mean, and why is my new room anonymous?

When you click **New retro**, the modal has an **Anonymous mode** switch —
and it's **on by default**. This means:

| Anonymous mode | What happens |
|---|---|
| **On** (default) | Nicknames are hidden in the participant sidebar and on cards. Exports show "Anonymous" as the author. |
| **Off** | Participants pick a nickname on first join, and that name shows on every card and comment they post. |

It defaults to *on* because most retros benefit from candid, unattributed
feedback — you can always flip the switch off before creating the room if
your team prefers named cards.

---

## When should I fill in participant count?

The **Participant count** field in the new-retro modal is **optional** for
every room, including anonymous ones.

- **Leave it blank** and vote ratios fall back to however many people are
  currently connected to the room. This is convenient, but it can
  over-count: every browser tab (including a phone next to a laptop, or a
  refreshed tab) mints its own guest participant, so the "people currently
  connected" number can run higher than the number of actual humans in the
  meeting.
- **Fill it in** with the real headcount if you want exact consensus
  ratios — for example, if 8 people are in the retro and 6 vote "high" on a
  card, you want that to read as 6/8, not 6/however-many-tabs-are-open.

Rule of thumb: leave it blank for quick, informal retros; fill it in when
you actually care about the vote percentages being accurate.

---

## Frequently asked

**Do I still need to remember a daily password?** No — that gate has been
removed. Team login is the only step.

**Does the "Copy link" button still bake a password into the URL?** No.
Copied room links are plain `https://.../room/<id>` URLs; anyone who opens
one needs a valid team session (from `/login`) to see anything.

**Can I switch a room from anonymous to named after it's created?** No —
anonymous mode is decided at room creation and can't be toggled mid-retro.
