# Team Spaces — Usage Guide

This guide explains how to use RetroXpert with multiple teams. If you
just want one team, you only need the “Create your first team”
section — everything else is for power users.

---

## What is a team space?

A team space groups your retros together so different teams using the
same RetroXpert instance never see each other’s data. Each team has:

- A **name** (e.g. `Platform`, `Mobile Squad`)
- A **password** that anyone joining the team needs to know
- Its own **rooms** (only visible to that team)
- Its own **trends** dashboard

Two teams on the same RetroXpert server cannot see each other’s rooms,
cards, votes, or metric trends. The only public information across
teams is the **list of team names** (so people can find their team to
join).

---

## Create your first team

1. After entering today’s password, you’ll land on the **Pick your
   team** screen.
2. Click **+ Create new team** (or, if you’re the first user, the big
   **+ Create a team** button).
3. Enter:
   - **Team name** — anything up to 40 characters.
   - **Password** — minimum 4 characters. **There is no password
     recovery**, so write it down somewhere safe.
   - **Confirm password** — must match.
4. Click **Create team**. You’ll be auto-logged in and dropped into the
   dashboard with the team name shown in the header.

> ⚠️ **No password recovery.** If everyone in your team forgets the
> password, the team and its rooms become permanently inaccessible
> until an administrator manually intervenes via the database. Treat
> the team password like a 1Password vault password.

---

## Join an existing team

1. On the **Pick your team** screen, choose your team from the
   dropdown.
2. Type the team password.
3. Click **Enter team**.

Your team session lasts **30 days** — you stay signed in across browser
restarts. The daily password (Ring 1) still rotates nightly, so you’ll
re-enter the daily code each morning even though the team cookie
persists.

If you mistype the password 5 times within a minute, that IP is
rate-limited for 5 minutes.

---

## Switch teams

In the header next to the team name, click **switch**. This clears
your team cookie and sends you back to the team picker. Your daily
password cookie is unaffected — you don’t need to re-enter today’s
code.

---

## Create a retro with team settings

In the **New retro** modal you now have two extra fields:

- **Participant count** *(optional, unless anonymous)* — the headcount
  you expect at the meeting. Vote ratios divide by this number, so
  consensus reads accurately even if some people opened multiple tabs.
  Leave blank to fall back to “however many session rows we see”.
- **Anonymous mode** — hides participant nicknames in the sidebar,
  hides revealed author names on cards, and writes “Anonymous” in
  every export format.
  - When you turn anonymous mode on, **participant count is required**
    (because every browser tab mints a new Guest, so the session count
    becomes unreliable).

---

## Claim a legacy retro

If RetroXpert had rooms before team spaces existed, you’ll see them
in an **Unclaimed legacy rooms** section at the bottom of the
dashboard. They’re visible to every team — first claim wins.

To take ownership:

1. Find the legacy retro in the **Unclaimed** section.
2. Click **Claim to [Your Team Name]**.
3. The room hops up into your team’s grid. Other teams stop seeing it
   immediately.

If two people click claim at the same moment, only one wins; the loser
sees “Could not claim — already claimed by another team.”

---

## Anonymous mode behavior

| Surface | Anonymous on |
|---|---|
| Participant sidebar | Nicknames replaced with `Guest-1`, `Guest-2`, … |
| Card author names | Hidden, even if the author tried to reveal |
| Markdown / HTML / AI exports | Author shown as `Anonymous` |
| CSV export | Author shown as `Anonymous` |
| Vote ratios | Divided by the configured **participant count** (required) |

The anonymous setting is decided at room creation and **cannot be
toggled mid-retro**.

---

## Trends per team

The Trends page (`/trends`) shows only your own team’s metric history.
Other teams’ trends never appear, even if they’ve been running retros
for months. The page title reflects this: **Trends for [Team Name]**.

---

## What if I lose my team password?

There is no recovery flow. Your options:

1. Ask another team member if they wrote it down.
2. Ask whoever administers your RetroXpert deployment to reset the
   password directly in the database (`teams.password_hash` /
   `password_salt`).
3. Create a brand new team and claim any rooms you can (but only ones
   that aren’t already in your old team — those are stuck behind the
   forgotten password).

---

## Frequently asked

**Can two teams have the same name?** No — team names are unique
across the whole RetroXpert instance.

**Can the daily password be different per team?** No — Ring 1 is a
single instance-wide gate. Teams only differ in Ring 2.

**Does my team need a password if we’re the only team?** Yes. The
team password is what stops a future second team from accidentally
clicking into your data.

**Can I delete a team?** Not from the UI yet. An administrator can
delete via the database. Deletion cascades — every room, card, vote,
and metric for that team is removed.

**Can the same email join two teams?** RetroXpert doesn’t track
emails — each team is its own password-protected bucket. You can
switch between them via the **switch** button in the header.
