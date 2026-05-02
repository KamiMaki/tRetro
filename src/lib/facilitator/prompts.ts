/**
 * Static facilitation prompts shown in the Guide drawer.
 *
 * Phases mirror PHASE_LABELS in lib/types — Gather → Vote → Discuss →
 * Action → Wrap. Phase changes are advisory only; the SM can hop
 * around at will.
 *
 * Tip text references in-app affordances that exist today: phase bar
 * timer, section fullscreen button, voting consensus pill, "convert
 * to action item" on cards, Summary Prompt copy button. We keep this
 * list lean so it reads like a checklist, not a manual.
 */

export interface FacilitatorStage {
  key: 'gather' | 'vote' | 'discuss' | 'action' | 'wrap';
  title: string;
  emoji: string;
  duration: string;
  goal: string;
  tips: string[];
  prompts: string[];
}

export const FACILITATOR_STAGES: FacilitatorStage[] = [
  {
    key: 'gather',
    title: 'Gather',
    emoji: '🪴',
    duration: '5–8 min',
    goal: 'Land every signal on the board before anyone starts analysing.',
    tips: [
      'Click "Gather" in the phase bar above; pick a quick timer (3 / 5 / 10 min) so the room sees the countdown.',
      'Reassure the room that cards are anonymous by default — let the silence breathe.',
      'One idea per card so voting and clustering work later.',
      'Tags can be picked before typing or auto-applied if a default is set in the new-retro modal.',
    ],
    prompts: [
      'What energised you this sprint?',
      "Where did we lose time we wish we hadn't?",
      'Whose work made yours easier?',
      "What's the question we keep avoiding?",
    ],
  },
  {
    key: 'vote',
    title: 'Vote',
    emoji: '🎯',
    duration: '3–5 min',
    goal: 'Converge on the cards worth a real conversation.',
    tips: [
      'Switch the phase bar to "Vote" and start a 3 min timer.',
      'Ask everyone to vote in parallel — no commentary yet.',
      'Cards with a green ≥70% pill are strong consensus; amber 40–70% is mixed and probably needs context.',
      "It's OK if some sections get no votes — that's also a signal.",
    ],
    prompts: [
      "Vote for the cards you'd most want to talk about today.",
      'If we only had 15 minutes left, which cards would matter most?',
    ],
  },
  {
    key: 'discuss',
    title: 'Discuss',
    emoji: '💬',
    duration: '15–25 min',
    goal: 'Find root causes and shared understanding on the top-voted items.',
    tips: [
      'Open the highest-consensus card first. Click the section\'s ⛶ button to project it fullscreen so the room focuses on one card at a time.',
      'If the author has revealed themselves, invite context, then open the floor.',
      'When a discussion stalls, hit the green ✓ icon on the card to convert it into an action item — drops a draft into the Action items tab.',
      'Watch the phase timer; better to leave one card untouched than to drift.',
    ],
    prompts: [
      'What did we miss the first time around?',
      'Is this a one-off, or a pattern we keep hitting?',
      'What would have to be true for this to stop happening?',
    ],
  },
  {
    key: 'action',
    title: 'Action',
    emoji: '✅',
    duration: '5–8 min',
    goal: 'Lock in commitments, owners, and dates while energy is high.',
    tips: [
      'Switch to the Action items tab. Each item needs an owner — "the team" is not an owner.',
      'Set a due date even if rough — "by next retro" beats "soon".',
      'Cap the list at 3–5 things the team can actually finish.',
      'Re-read each one out loud. Silence often hides confusion.',
    ],
    prompts: [
      'Who can take the first step on this?',
      "What's the smallest version we can ship before next retro?",
      "Anything in the way of you owning this?",
    ],
  },
  {
    key: 'wrap',
    title: 'Wrap & export',
    emoji: '📦',
    duration: '2 min',
    goal: 'Make the artefact. Close the loop.',
    tips: [
      'Want themes? Press the ✦ Summary Prompt button in the header — it copies a paste-ready prompt for ChatGPT / Claude / Gemini.',
      'Or export Markdown / HTML / CSV directly — buttons live next to Summary Prompt.',
      'Optional: set a webhook URL in Room settings (gear icon) so closing the room POSTs an action-item digest to Slack / Discord.',
      'Pulse: ask each person their one-word feeling about the meeting before you close.',
    ],
    prompts: [
      "One word for today's session?",
      'Anything to change about how the next retro is run?',
    ],
  },
];
