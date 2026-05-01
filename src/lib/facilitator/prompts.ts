/**
 * Static facilitation prompts shown in the Scrum Master's helper panel.
 * Designed for the four-stage flow most retros follow:
 *
 *   1. gather   — collect cards
 *   2. vote     — converge on what matters
 *   3. discuss  — go deep on top items
 *   4. action   — turn signals into commitments
 *
 * Even when the room has no formal phase, the SM can scan these as a
 * checklist before each segment. Anonymous-friendly: nothing here asks
 * the SM to single anyone out.
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
    goal: 'Get every signal on the board before anyone analyzes anything.',
    tips: [
      'Reassure the room that cards are anonymous by default. Let the silence breathe.',
      'Encourage one idea per card so voting and clustering work later.',
      'Avoid commenting on cards yet — just collect.',
      'Use the "Compact" density (top-right toggle) once cards pile up so people can scan.',
    ],
    prompts: [
      "What energized you this sprint?",
      "Where did we lose time we wish we hadn't?",
      "Whose work made yours easier?",
      "What's the question we keep avoiding?",
    ],
  },
  {
    key: 'vote',
    title: 'Vote',
    emoji: '🎯',
    duration: '3–5 min',
    goal: 'Converge on the cards worth discussing as a team.',
    tips: [
      'Ask everyone to vote in parallel — no commentary yet.',
      'A card with a >70% mint glow is high-consensus; <40% is polarising and may need extra context.',
      'It\'s OK if some sections get no votes — that\'s also a signal.',
      'Cap votes (e.g. 3 per person) if you have a large team; people gravitate to the safest choices otherwise.',
    ],
    prompts: [
      "Vote for the cards you'd most want to talk about today.",
      "If we only had 15 minutes left, which cards would matter most?",
    ],
  },
  {
    key: 'discuss',
    title: 'Discuss',
    emoji: '💬',
    duration: '15–25 min',
    goal: 'Surface root causes and shared understanding on the top-voted items.',
    tips: [
      'Open the highest-consensus card first. Use the section "fullscreen" button to focus the room on one card at a time.',
      'Ask the author (if revealed) to add context, then open the floor.',
      'When discussion stalls, click "Convert to action item" on the card and move on.',
      'Watch the timer — better to leave one card untouched than to drift.',
    ],
    prompts: [
      "What did we miss the first time around on this one?",
      "Is this a one-off or a pattern we keep hitting?",
      "What would have to be true for this to stop happening?",
    ],
  },
  {
    key: 'action',
    title: 'Action',
    emoji: '✅',
    duration: '5–8 min',
    goal: 'Lock in commitments, owners, and dates while energy is still high.',
    tips: [
      'Every action item needs an owner — "the team" is not an owner.',
      'Set a due date even if it\'s rough — "by next retro" beats "soon".',
      'Cap to 3–5 items the team can actually do; surplus actions die on the vine.',
      'Re-read each one out loud. Silence often hides confusion.',
    ],
    prompts: [
      "Who can take the first step on this?",
      "What's the smallest version of this we can ship before next retro?",
      "Is anything in the way of you owning this?",
    ],
  },
  {
    key: 'wrap',
    title: 'Wrap & export',
    emoji: '📦',
    duration: '2 min',
    goal: 'Make the artifact. Close the loop.',
    tips: [
      'Click "Copy AI prompt" to grab a paste-ready summary prompt for ChatGPT / Claude / Gemini if you want themes.',
      'Or just export Markdown / HTML and drop it in the team channel.',
      'Close the room when you\'re done — but remember you can reopen it if something comes up.',
      'Quick pulse: ask each person their one-word feeling about the meeting.',
    ],
    prompts: [
      "What's one word you'd use to describe today's session?",
      "Anything we should change about how the next retro is run?",
    ],
  },
];
