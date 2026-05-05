import type { SectionType } from '../types';

/**
 * Retro 模板：每個模板用同一套 4 個 section key，但提供不同的 emoji 與標題，
 * 讓團隊可以選擇符合自己風格的回顧框架。Server 只儲存 template_id，渲染時
 * 由 client 把模板帶入 Section / Board 元件。
 */
export interface RetroTemplate {
  id: string;
  name: string;
  description: string;
  /** 主題色票（用於 dashboard / 模板選擇器） */
  accent: 'mint' | 'cyan' | 'violet' | 'pink' | 'amber';
  /** 4 個 section 的客製化標題 */
  labels: Record<SectionType, string>;
  /** 4 個 section 的客製化 emoji */
  emojis: Record<SectionType, string>;
}

export const RETRO_TEMPLATES: RetroTemplate[] = [
  {
    id: 'classic',
    name: 'Aurora 經典版',
    description: '預設模板：分為「做得好 / 待改進 / 感謝 / 深入討論」四個區塊。',
    accent: 'violet',
    labels: {
      'went-well': 'Went Well',
      'to-improve': "Didn't Go Well",
      'thanks': 'Thanks',
      'deep-dive': 'Deep Discussion',
    },
    emojis: {
      'went-well': '😆',
      'to-improve': '🥲',
      'thanks': '😍',
      'deep-dive': '🧐',
    },
  },
  {
    id: 'mad-sad-glad',
    name: 'Mad / Sad / Glad',
    description: '聚焦在情緒：哪些事讓人生氣、難過、開心，最後是值得深入的話題。',
    accent: 'pink',
    labels: {
      'went-well': 'Glad',
      'to-improve': 'Mad',
      'thanks': 'Sad',
      'deep-dive': 'Discuss',
    },
    emojis: {
      'went-well': '😄',
      'to-improve': '😡',
      'thanks': '😢',
      'deep-dive': '🤔',
    },
  },
  {
    id: 'start-stop-continue',
    name: 'Start / Stop / Continue',
    description: '行動導向：要開始做什麼、停止什麼、繼續什麼，加上開放討論。',
    accent: 'mint',
    labels: {
      'went-well': 'Continue',
      'to-improve': 'Stop',
      'thanks': 'Start',
      'deep-dive': 'Discuss',
    },
    emojis: {
      'went-well': '➡️',
      'to-improve': '⏹️',
      'thanks': '▶️',
      'deep-dive': '💭',
    },
  },
  {
    id: '4ls',
    name: '4 Ls (Liked / Learned / Lacked / Longed for)',
    description: '反思導向：喜歡什麼、學到什麼、缺少什麼、希望有什麼。',
    accent: 'cyan',
    labels: {
      'went-well': 'Liked',
      'to-improve': 'Lacked',
      'thanks': 'Learned',
      'deep-dive': 'Longed for',
    },
    emojis: {
      'went-well': '❤️',
      'to-improve': '😞',
      'thanks': '📚',
      'deep-dive': '🌱',
    },
  },
];

export function findTemplate(id: string | null | undefined): RetroTemplate {
  return RETRO_TEMPLATES.find((t) => t.id === id) ?? RETRO_TEMPLATES[0];
}
