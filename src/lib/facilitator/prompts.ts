/**
 * 主持人提示靜態內容（中文）。
 * 涵蓋多數 retro 採用的四階段流程：
 *
 *   1. gather   — 收集卡片
 *   2. vote     — 收斂出最重要的議題
 *   3. discuss  — 深入討論
 *   4. action   — 把訊號變成承諾
 *
 * 即使房間沒有正式的 phase，主持人也可在每個階段前快速掃過這份清單作為檢查表。
 * 對匿名性友善：所有提示都不要求主持人指名點人。
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
    goal: '在沒有人開始分析之前，先把所有訊號丟到棋盤上。',
    tips: [
      '提醒房間「卡片預設匿名」，給大家沉默的時間思考。',
      '鼓勵一個想法寫成一張卡，後續的投票與分群才會有效。',
      '這個階段不要評論卡片，只負責收集。',
      '卡片變多時可以切到「Compact」密度（右上角切換）讓大家更好掃讀。',
    ],
    prompts: [
      '這個 sprint 哪些事情讓你最有動力？',
      '我們在哪裡浪費了不該浪費的時間？',
      '誰的工作讓你的工作變得更輕鬆？',
      '有沒有什麼問題我們一直在迴避？',
    ],
  },
  {
    key: 'vote',
    title: 'Vote',
    emoji: '🎯',
    duration: '3–5 min',
    goal: '收斂出今天最值得討論的卡片。',
    tips: [
      '請大家平行投票，不要一邊投一邊討論。',
      '邊框是 mint 綠（共識 ≥70%）的卡片代表強共識；amber 琥珀（40–70%）代表分歧或混合訊號，可能需要更多脈絡。',
      '某些區塊完全沒人投票也是訊號之一，不需要硬挑。',
      '團隊較大時可限制每人投票數（例如 3 票），否則大家會偏向最安全的選項。',
    ],
    prompts: [
      '請投給你今天最想討論的卡片。',
      '如果只剩 15 分鐘，哪幾張卡片最重要？',
    ],
  },
  {
    key: 'discuss',
    title: 'Discuss',
    emoji: '💬',
    duration: '15–25 min',
    goal: '針對高票卡片，找出根本原因與共同理解。',
    tips: [
      '從共識最高的卡片開始討論。可使用區塊「全螢幕」按鈕讓大家聚焦在同一張卡片上。',
      '若卡片作者已顯名，可邀請他補充脈絡，再開放討論。',
      '討論卡住時，點卡片上的「轉成 action item」按鈕直接帶走，繼續往下走。',
      '注意計時。寧可有一張卡來不及討論，也不要讓會議發散。',
    ],
    prompts: [
      '當初我們漏掉了什麼？',
      '這是一次性的事件，還是反覆出現的模式？',
      '要怎麼樣才能讓這個問題不再發生？',
    ],
  },
  {
    key: 'action',
    title: 'Action',
    emoji: '✅',
    duration: '5–8 min',
    goal: '在能量還在的時候，把承諾、負責人、期限都鎖定下來。',
    tips: [
      '每一個 action item 都要有負責人 — 「整個團隊」不算負責人。',
      '即使日期是粗估也要設下來 — 「下次 retro 前」勝過「之後再說」。',
      '控制在 3–5 個團隊真正能做完的項目，過多的 action 通常會死在路上。',
      '逐一把 action item 念出來。沉默通常代表困惑。',
    ],
    prompts: [
      '誰可以先動手做這件事？',
      '在下次 retro 之前，這件事最小可行的版本是什麼？',
      '有什麼會擋住你接下這個 action？',
    ],
  },
  {
    key: 'wrap',
    title: 'Wrap & export',
    emoji: '📦',
    duration: '2 min',
    goal: '產出成果並結束會議。',
    tips: [
      '需要主題摘要的話，按 header 上的「複製 AI prompt」貼到 ChatGPT / Claude / Gemini 即可。',
      '或者直接匯出 Markdown / HTML 丟到團隊頻道。',
      '結束後再關房 — 不過記得有需要時可以重新開啟。',
      '快速 pulse：請每個人用一個詞描述對這場會議的感覺。',
    ],
    prompts: [
      '用一個詞來形容今天這場會議。',
      '下次 retro 有沒有什麼地方想調整？',
    ],
  },
];
