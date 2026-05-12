/**
 * Static facilitation prompts shown in the Guide drawer.
 *
 * Phases mirror PHASE_LABELS in lib/types — Gather → Vote → Discuss →
 * Action → Wrap. Phase changes are advisory only; the SM can hop
 * around at will.
 *
 * 文案以繁體中文撰寫，搭配 UI 上的中文按鈕標籤。Tips 仍然指向實際存在
 * 的互動：階段列計時器、區塊全螢幕按鈕、投票共識標籤、卡片轉 action
 * item、Summary Prompt 複製鈕。內容盡量像 checklist，不像說明書。
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
    title: '收集（Gather）',
    emoji: '🪴',
    duration: '5–8 分鐘',
    goal: '在開始分析之前，先把所有訊號蒐集到看板上。',
    tips: [
      '在上方階段列點「Gather」，挑一個短計時器（3 / 5 / 10 分鐘），讓全房間都看得到倒數。',
      '提醒大家卡片預設匿名，留一點沉默讓人思考。',
      '一張卡片只放一個想法，後續投票與聚類才會準。',
      '可以先選好標籤再打字；或在開房間時設好預設標籤，自動套用。',
    ],
    prompts: [
      '這個 sprint 哪些事情讓你充滿能量？',
      '哪裡我們浪費了不該浪費的時間？',
      '誰的工作讓你的事變得更輕鬆？',
      '我們一直在迴避的問題是什麼？',
    ],
  },
  {
    key: 'vote',
    title: '投票（Vote）',
    emoji: '🎯',
    duration: '3–5 分鐘',
    goal: '收斂出真正值得花時間討論的卡片。',
    tips: [
      '把階段列切到「Vote」，啟動 3 分鐘計時器。',
      '請大家同時投票，先不要開口評論。',
      '綠色 ≥70% 標籤代表強共識；琥珀 40–70% 代表分歧，通常需要更多脈絡。',
      '某些區塊完全沒人投票也是訊號，不要硬討論。',
    ],
    prompts: [
      '投給你今天最想聊的卡片。',
      '如果只剩 15 分鐘，哪些卡片最值得聊？',
    ],
  },
  {
    key: 'discuss',
    title: '討論（Discuss）',
    emoji: '💬',
    duration: '15–25 分鐘',
    goal: '針對得票最高的議題找到根因與共識。',
    tips: [
      '從共識最強的卡片開始。點區塊右上角 ⛶ 全螢幕按鈕，把卡片放大投影，讓全房間一次只看一張。',
      '若作者已具名，請他補脈絡，再開放討論。',
      '討論停滯時，點卡片上的綠色 ✓ 把它轉成 action item，會自動丟到 Action items 分頁。',
      '注意階段計時器；留一張卡沒聊到，好過全部走馬看花。',
    ],
    prompts: [
      '第一次發生時我們漏掉了什麼？',
      '這是偶發事件，還是一直在重複的模式？',
      '要怎麼樣，這件事才會不再發生？',
    ],
  },
  {
    key: 'action',
    title: '行動（Action）',
    emoji: '✅',
    duration: '5–8 分鐘',
    goal: '在團隊能量還在的時候，敲定具體行動、負責人與時間。',
    tips: [
      '切到 Action items 分頁。每一條都要有負責人 —「團隊」不算負責人。',
      '即使粗估也要有期限 —「下次 retro 之前」勝過「快點」。',
      '把清單控制在 3–5 件團隊真的做得完的事。',
      '每一條都念一次出來，沉默通常代表混亂。',
    ],
    prompts: [
      '誰可以先踏出第一步？',
      '在下次 retro 之前，最小可交付的版本是什麼？',
      '有什麼會阻礙你負責這件事？',
    ],
  },
  {
    key: 'wrap',
    title: '收尾與匯出（Wrap）',
    emoji: '📦',
    duration: '2 分鐘',
    goal: '把成果保存下來，閉合這次 retro。',
    tips: [
      '想要主題摘要？按 header 的 ✦ Summary Prompt — 它把整理好的提示複製到剪貼簿，貼到 ChatGPT / Claude / Gemini 就能用。',
      '也可以直接匯出 Markdown / HTML，按鈕就在 Summary Prompt 旁邊。',
      '想接 Slack / Discord？在房間設定（齒輪）填一個 webhook URL，房間關閉時會 POST 一份 action item 摘要。',
      '快速 pulse：關房間前，請每個人用一個詞描述今天的感受。',
    ],
    prompts: [
      '今天的會議用一個詞來形容？',
      '下次 retro 的進行方式有什麼可以改？',
    ],
  },
];
