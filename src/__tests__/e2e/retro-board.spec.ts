import { test, expect } from '@playwright/test';

// 1x1 transparent PNG — used to exercise the image-attach upload paths.
const PNG_1x1 = Buffer.from(
  'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNkYPhfDwAChwGA60e6kgAAAABJRU5ErkJggg==',
  'base64',
);
const PNG_FILE = { name: 'pixel.png', mimeType: 'image/png', buffer: PNG_1x1 };

async function createAndJoinRoom(
  page: import('@playwright/test').Page,
  request: import('@playwright/test').APIRequestContext,
  roomName = 'Test Retro',
  _nickname = 'Tester', // kept for callsite compatibility; the board auto-joins as a guest
  opts: { isAnonymous?: boolean } = {}
) {
  const res = await request.post('/api/rooms', {
    data: opts.isAnonymous === true
      ? { name: roomName, isAnonymous: true, participantCount: 3 }
      : { name: roomName },
  });
  const body = await res.json();
  await page.goto(`/room/${body.roomId}`);
  // Named rooms (the default) show the nickname prompt on first entry.
  // Anonymous rooms skip it. Dismiss the prompt by opting for a guest
  // name. .click() auto-waits for the button — wrap in try/catch in case
  // the prompt is absent (anonymous room or already-stored nickname).
  await page
    .getByRole('button', { name: 'Use a guest name instead' })
    .click({ timeout: 8000 })
    .catch(() => {/* no prompt — already on board */});
  // "Went Well" appears in both the board panel and the review panel.
  // .first() picks one to satisfy strict-mode locator resolution.
  await expect(page.locator('#main-panel-board').getByText('Went Well').first()).toBeVisible({ timeout: 15000 });
  return body.roomId as string;
}

test.describe('tRetro E2E', () => {
  test.describe('Dashboard', () => {
    test('should show dashboard with create button', async ({ page }) => {
      await page.goto('/');
      // The product rebranded from "tRetro" to "RetroXpert". Accept either
      // so this test survives any future re-rebrand or copy tweak.
      await expect(page.locator('h1')).toContainText(/RetroXpert|tRetro/);
      await expect(page.getByRole('button', { name: 'New retro' })).toBeVisible();
    });

    test('should create a new retro room from dashboard', async ({ page }) => {
      await page.goto('/');
      await page.getByRole('button', { name: 'New retro' }).click();
      const nameInput = page.locator('input#roomName');
      await expect(nameInput).toBeVisible({ timeout: 5000 });
      await nameInput.fill('Sprint 99 Retro');
      await page.getByRole('button', { name: 'Create board' }).click();
      // Dashboard sends the creator straight to /room/{id} and the board
      // auto-joins them as a guest.
      await expect(page).toHaveURL(/\/room\/[\w-]+$/, { timeout: 15000 });
    });

    test('should toggle theme between dark and light', async ({ page }) => {
      await page.goto('/');
      const html = page.locator('html');
      await expect(html).toHaveAttribute('data-theme', 'dark');
      await page.getByRole('button', { name: /Switch to (light|dark) mode/i }).click();
      await expect(html).toHaveAttribute('data-theme', 'light');
      // Persist across reload
      await page.reload();
      await expect(html).toHaveAttribute('data-theme', 'light');
      // Switch back
      await page.getByRole('button', { name: /Switch to (light|dark) mode/i }).click();
      await expect(html).toHaveAttribute('data-theme', 'dark');
    });
  });

  test.describe('Room Join Flow', () => {
    test('legacy /join URL redirects to the board and auto-joins', async ({ page, request }) => {
      const res = await request.post('/api/rooms', {
        data: { name: 'Join Flow Retro' },
      });
      const body = await res.json();
      // /join is a server redirect now; old share links should still land
      // the visitor on the board with a guest participant created on the fly.
      await page.goto(`/room/${body.roomId}/join`);
      await expect(page).toHaveURL(new RegExp(`/room/${body.roomId}$`), { timeout: 10000 });
      // Named rooms now show a nickname prompt — opt for guest to continue.
      await page
        .getByRole('button', { name: 'Use a guest name instead' })
        .click({ timeout: 8000 })
        .catch(() => {/* no prompt — already on board */});
      // Column headings appear in both board and review panels. Scope to
      // the board panel to avoid strict-mode multi-match errors.
      const board = page.locator('#main-panel-board');
      await expect(board.getByText('Went Well').first()).toBeVisible({ timeout: 15000 });
      await expect(board.getByText("Didn't Go Well").first()).toBeVisible();
      await expect(board.getByText('Thanks').first()).toBeVisible();
      await expect(board.getByText('Deep Discussion').first()).toBeVisible();
    });
  });

  test.describe('Board Functionality', () => {
    test('should create a card', async ({ page, request }) => {
      await createAndJoinRoom(page, request, 'Card Create Retro', 'CardUser');
      const board = page.locator('#main-panel-board');
      const textarea = page.getByPlaceholder(/Drop a thought/).first();
      await textarea.fill('Great teamwork this sprint!');
      const sendBtn = textarea.locator('..').locator('..').getByRole('button', { name: /Send/ });
      await sendBtn.click();
      // Card body renders in both board and review panels; scope + .first()
      // satisfies Playwright strict-mode locator resolution.
      await expect(board.getByText('Great teamwork this sprint!').first()).toBeVisible({ timeout: 15000 });
    });

    test('should show own card with You label', async ({ page, request }) => {
      // "You" label + hidden author only apply in ANONYMOUS rooms. Named
      // rooms now always show the author name directly.
      await createAndJoinRoom(page, request, 'Reveal Test Retro', 'RevealUser', { isAnonymous: true });
      const board = page.locator('#main-panel-board');
      const textarea = page.getByPlaceholder(/Drop a thought/).first();
      await textarea.fill('My anonymous card');
      const sendBtn = textarea.locator('..').locator('..').getByRole('button', { name: /Send/ });
      await sendBtn.click();
      await expect(board.getByText('My anonymous card').first()).toBeVisible({ timeout: 15000 });
      // Own card shows "You" label
      await expect(page.getByText('You').first()).toBeVisible({ timeout: 5000 });
    });

    test('should reveal card author identity', async ({ page, request }) => {
      await createAndJoinRoom(page, request, 'Author Reveal Retro', 'Alice', { isAnonymous: true });
      const board = page.locator('#main-panel-board');
      const textarea = page.getByPlaceholder(/Drop a thought/).first();
      await textarea.fill('Reveal me please');
      const sendBtn = textarea.locator('..').locator('..').getByRole('button', { name: /Send/ });
      await sendBtn.click();
      await expect(board.getByText('Reveal me please').first()).toBeVisible({ timeout: 15000 });
      await page.getByRole('button', { name: 'reveal' }).first().click({ force: true });
      const revealInput = page.getByPlaceholder('your name');
      await expect(revealInput).toBeVisible({ timeout: 5000 });
      await revealInput.fill('PlaywrightAlice');
      await page.locator('form button[type=submit]').first().click();
      await expect(page.getByText('PlaywrightAlice').first()).toBeVisible({ timeout: 15000 });
    });

    test('emoji reaction picker should not overflow card', async ({ page, request }) => {
      await createAndJoinRoom(page, request, 'Emoji Picker Retro', 'EmojiUser');
      const board = page.locator('#main-panel-board');
      const textarea = page.getByPlaceholder(/Drop a thought/).first();
      await textarea.fill('React to me');
      const sendBtn = textarea.locator('..').locator('..').getByRole('button', { name: /Send/ });
      await sendBtn.click();
      await expect(board.getByText('React to me').first()).toBeVisible({ timeout: 15000 });
      // Open emoji picker
      const addReactionBtn = page.getByRole('button', { name: 'Add reaction' }).first();
      await addReactionBtn.click();
      // Picker should be visible with role=dialog
      const picker = page.getByRole('dialog', { name: /Pick a reaction/i });
      await expect(picker).toBeVisible({ timeout: 3000 });
      // Pick a reaction
      await page.getByRole('button', { name: /React with 🔥/ }).click();
      await expect(page.getByRole('button', { name: /Remove 🔥 reaction/ })).toBeVisible({ timeout: 5000 });
    });
  });

  test.describe('API Tests', () => {
    test('should export room as markdown', async ({ request }) => {
      const roomRes = await request.post('/api/rooms', {
        data: { name: 'Export MD Retro' },
      });
      const { roomId } = await roomRes.json();
      const exportRes = await request.get(`/api/rooms/${roomId}/export?format=md`);
      expect(exportRes.status()).toBe(200);
      const text = await exportRes.text();
      expect(text).toContain('Export MD Retro');
      expect(text).toContain('Retrospective Summary');
    });

    test('should export room as HTML', async ({ request }) => {
      const roomRes = await request.post('/api/rooms', {
        data: { name: 'Export HTML Retro' },
      });
      const { roomId } = await roomRes.json();
      const exportRes = await request.get(`/api/rooms/${roomId}/export?format=html`);
      expect(exportRes.status()).toBe(200);
      const text = await exportRes.text();
      expect(text).toContain('<!DOCTYPE html>');
      expect(text).toContain('Export HTML Retro');
    });

    test('should list rooms via API', async ({ request }) => {
      await request.post('/api/rooms', { data: { name: 'API List Room' } });
      const res = await request.get('/api/rooms');
      expect(res.status()).toBe(200);
      const rooms = await res.json();
      expect(Array.isArray(rooms)).toBe(true);
      expect(rooms.length).toBeGreaterThan(0);
      expect(rooms[0]).toHaveProperty('participantCount');
      expect(rooms[0]).toHaveProperty('cardCount');
    });

    test('should fetch room history via API', async ({ request }) => {
      const roomRes = await request.post('/api/rooms', {
        data: { name: 'History API Retro' },
      });
      const { roomId } = await roomRes.json();
      const historyRes = await request.get(`/api/rooms/${roomId}/history`);
      expect(historyRes.status()).toBe(200);
      const data = await historyRes.json();
      expect(data).toHaveProperty('room');
      expect(data).toHaveProperty('cards');
      expect(data).toHaveProperty('actionItems');
      expect(data).toHaveProperty('metricsAggregate');
      expect(Array.isArray(data.metricsAggregate)).toBe(true);
      expect(data.room.name).toBe('History API Retro');
    });

    test('metrics aggregate API never leaks identity fields', async ({ request }) => {
      const roomRes = await request.post('/api/rooms', { data: { name: 'Privacy Retro' } });
      const { roomId } = await roomRes.json();
      const historyRes = await request.get(`/api/rooms/${roomId}/history`);
      const body = await historyRes.json();
      const json = JSON.stringify(body.metricsAggregate);
      // Each entry must have exactly: metricKey, average, submissions, distribution.
      // distribution is a 10-bucket histogram (counts only — no identity).
      for (const m of body.metricsAggregate) {
        expect(Object.keys(m).sort()).toEqual([
          'average',
          'distribution',
          'metricKey',
          'submissions',
        ]);
        expect(Array.isArray(m.distribution)).toBe(true);
        expect(m.distribution).toHaveLength(10);
      }
      expect(json.toLowerCase()).not.toContain('participant');
      expect(json.toLowerCase()).not.toContain('nickname');
      expect(json.toLowerCase()).not.toContain('author');
    });

    test('team metrics history endpoint is anonymous-only', async ({ request }) => {
      await request.post('/api/rooms', { data: { name: 'TeamHistoryA' } });
      const res = await request.get('/api/metrics/history?limit=5');
      expect(res.status()).toBe(200);
      const body = await res.json();
      expect(Array.isArray(body.history)).toBe(true);
      const json = JSON.stringify(body);
      expect(json.toLowerCase()).not.toContain('participant');
      expect(json.toLowerCase()).not.toContain('nickname');
      expect(json.toLowerCase()).not.toContain('author');
      for (const entry of body.history) {
        expect(entry).toHaveProperty('roomId');
        expect(entry).toHaveProperty('roomName');
        expect(entry).toHaveProperty('metrics');
      }
    });
  });

  test.describe('Sprint Metrics', () => {
    test('renders panel with empty aggregate then shows submitter own scores', async ({ page, request }) => {
      await createAndJoinRoom(page, request, 'Metrics UI Retro', 'MetricsAlice');
      // Switch to the metrics tab so the panel is in view (board is the default).
      await page.getByRole('tab', { name: 'Sprint metrics' }).click();
      const metricsPanel = page.locator('#main-panel-metrics');
      // Panel header (heading-style) is always visible once the tab is active.
      await expect(metricsPanel.getByText('Sprint metrics')).toBeVisible({ timeout: 10000 });
      await expect(metricsPanel.getByText('Anonymous', { exact: false })).toBeVisible();
      // No submissions yet
      await expect(metricsPanel.getByText('no submissions yet')).toBeVisible();

      // Open the private slider form
      await page.getByRole('button', { name: /Submit my scores/i }).click();
      const sliders = page.locator('input[type="range"]');
      await expect(sliders).toHaveCount(7);

      // Move the first slider, save scores
      const first = sliders.first();
      await first.evaluate((el: HTMLInputElement) => {
        const setter = Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype, 'value')!.set!;
        setter.call(el, '88');
        el.dispatchEvent(new Event('input', { bubbles: true }));
      });
      await page.getByRole('button', { name: /Save anonymous scores|Update anonymous scores/ }).click();

      // After submit, the toggle button label should switch to "Update my scores"
      await expect(page.getByRole('button', { name: /Update my scores|Hide my scores/ })).toBeVisible({ timeout: 5000 });
      // The header line shows "you submitted"
      await expect(page.getByText(/you submitted/i)).toBeVisible({ timeout: 5000 });
      // Header tally reflects exactly 1 submission. (The aggregate-row sub-meta
      // switches to "you · X" once you've submitted, so we read the header
      // sentence directly instead of the row.)
      await expect(page.getByText(/1 submission\b/i)).toBeVisible({ timeout: 5000 });
    });
  });

  test.describe('Multi-Room Dashboard', () => {
    test('should show multiple rooms on dashboard', async ({ page, request }) => {
      // Create rooms first
      await request.post('/api/rooms', { data: { name: 'DashMultiA' } });
      await request.post('/api/rooms', { data: { name: 'DashMultiB' } });
      await request.post('/api/rooms', { data: { name: 'DashMultiC' } });

      // Navigate fresh and wait for content. Room names aren't unique and the
      // shared test DB accumulates rooms across runs, so the same name can
      // appear multiple times — assert at least one of each is visible.
      await page.goto('/', { waitUntil: 'networkidle' });
      await expect(page.getByText('DashMultiA').first()).toBeVisible({ timeout: 15000 });
      await expect(page.getByText('DashMultiB').first()).toBeVisible({ timeout: 5000 });
      await expect(page.getByText('DashMultiC').first()).toBeVisible({ timeout: 5000 });
    });
  });

  test.describe('New UX features (2026-05-30 batch)', () => {
    async function addCard(page: import('@playwright/test').Page, text: string, column = 0) {
      const areas = page.getByPlaceholder(/Drop a thought/);
      const textarea = areas.nth(column);
      await textarea.fill(text);
      await textarea.locator('..').locator('..').getByRole('button', { name: /Send/ }).click();
      await expect(
        page.locator('#main-panel-board').getByText(text).first(),
      ).toBeVisible({ timeout: 15000 });
    }

    test('card delete requires a confirm step (no accidental deletes)', async ({ page, request }) => {
      await createAndJoinRoom(page, request, 'Delete Confirm Retro', 'Del');
      const board = page.locator('#main-panel-board');
      await addCard(page, 'Card to maybe delete');

      // First click only arms the confirm — the card is still there.
      await board.getByRole('button', { name: 'Delete card' }).first().click();
      await expect(board.getByRole('button', { name: 'Confirm delete card' })).toBeVisible();
      await expect(board.getByText('Card to maybe delete').first()).toBeVisible();

      // Cancel keeps the card.
      await board.getByRole('button', { name: 'Cancel delete' }).click();
      await expect(board.getByText('Card to maybe delete').first()).toBeVisible();

      // Arm again + confirm actually removes it.
      await board.getByRole('button', { name: 'Delete card' }).first().click();
      await board.getByRole('button', { name: 'Confirm delete card' }).click();
      await expect(board.getByText('Card to maybe delete')).toHaveCount(0, { timeout: 10000 });
    });

    test('comments can be posted (with a Taipei timestamp) and deleted', async ({ page, request }) => {
      await createAndJoinRoom(page, request, 'Comment CRUD Retro', 'Cmt');
      const board = page.locator('#main-panel-board');
      await addCard(page, 'Card with comments');

      await board.getByRole('button', { name: /\d+ comments?/ }).first().click();
      const reply = board.getByPlaceholder(/Reply/).first();
      await reply.fill('My first comment');
      await board.getByRole('button', { name: 'Post' }).first().click();
      await expect(board.getByText('My first comment')).toBeVisible({ timeout: 10000 });
      // Timestamp renders as Taipei HH:mm (shown as "· HH:mm").
      await expect(board.getByText(/\d{2}:\d{2}/).first()).toBeVisible();

      // Own comment can be deleted (with a confirm step).
      await board.getByRole('button', { name: 'Delete comment' }).first().click();
      await board.getByRole('button', { name: 'Confirm delete comment' }).click();
      await expect(board.getByText('My first comment')).toHaveCount(0, { timeout: 10000 });
    });

    test('an image can be attached to a comment', async ({ page, request }) => {
      await createAndJoinRoom(page, request, 'Image Comment Retro', 'ImgC');
      const board = page.locator('#main-panel-board');
      await addCard(page, 'Card for an image comment');

      await board.getByRole('button', { name: /\d+ comments?/ }).first().click();
      // Target the file input that lives in the comment composer form.
      const commentFileInput = page.locator(
        'form:has(textarea[placeholder*="Reply"]) input[type="file"]',
      ).first();
      await commentFileInput.setInputFiles(PNG_FILE);
      await board.getByRole('button', { name: 'Post' }).first().click();
      await expect(board.getByAltText('Comment attachment').first()).toBeVisible({ timeout: 10000 });
    });

    test('an image can be attached to a card', async ({ page, request }) => {
      await createAndJoinRoom(page, request, 'Image Card Retro', 'ImgK');
      const board = page.locator('#main-panel-board');
      await addCard(page, 'Card for an attached image');

      // Comments closed -> the only board file input is the card attach control.
      await board.locator('input[type="file"]').first().setInputFiles(PNG_FILE);
      await expect(board.getByAltText('Drawing').first()).toBeVisible({ timeout: 10000 });
    });

    test('discussion focus walkthrough lists cards in board (section) order', async ({ page, request }) => {
      await createAndJoinRoom(page, request, 'Discussion Order Retro', 'Disc');
      const board = page.locator('#main-panel-board');
      // Add the "to-improve" (2nd column) card FIRST, then the "went-well" (1st) card.
      await addCard(page, 'ZZ improve card', 1);
      await addCard(page, 'AA wellcard', 0);

      await page.getByRole('tab', { name: 'Discussion' }).click();
      const disc = page.locator('#main-panel-discussion');
      await expect(disc.getByText('AA wellcard').first()).toBeVisible({ timeout: 10000 });

      // Board order puts went-well before to-improve regardless of creation order.
      const text = await disc.innerText();
      expect(text.indexOf('AA wellcard')).toBeLessThan(text.indexOf('ZZ improve card'));
    });

    test('a posted comment shows up in the HTML and AI exports', async ({ page, request }) => {
      const roomId = await createAndJoinRoom(page, request, 'Export Comment Retro', 'Exp');
      const board = page.locator('#main-panel-board');
      await addCard(page, 'Card for export');

      await board.getByRole('button', { name: /\d+ comments?/ }).first().click();
      await board.getByPlaceholder(/Reply/).first().fill('Exported comment text');
      await board.getByRole('button', { name: 'Post' }).first().click();
      await expect(board.getByText('Exported comment text')).toBeVisible({ timeout: 10000 });

      const html = await (await request.get(`/api/rooms/${roomId}/export?format=html`)).text();
      expect(html).toContain('Exported comment text');
      const ai = await (await request.get(`/api/rooms/${roomId}/export?format=ai`)).text();
      expect(ai).toContain('Exported comment text');
    });
  });
});
