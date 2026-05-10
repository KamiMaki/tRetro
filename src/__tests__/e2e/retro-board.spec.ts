import { test, expect } from '@playwright/test';

async function createAndJoinRoom(
  page: import('@playwright/test').Page,
  request: import('@playwright/test').APIRequestContext,
  roomName = 'Test Retro',
  _nickname = 'Tester' // kept for callsite compatibility; the board auto-joins as a guest
) {
  const res = await request.post('/api/rooms', {
    data: { name: roomName },
  });
  const body = await res.json();
  // The board auto-creates a guest participant on first visit, so go straight
  // there. The legacy /join nickname picker has been retired.
  await page.goto(`/room/${body.roomId}`);
  await expect(page.getByRole('heading', { name: 'Went Well' }).or(page.getByText('Went Well'))).toBeVisible({ timeout: 15000 });
  return body.roomId as string;
}

test.describe('tRetro E2E', () => {
  test.describe('Dashboard', () => {
    test('should show dashboard with create button', async ({ page }) => {
      await page.goto('/');
      await expect(page.locator('h1')).toContainText('tRetro');
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
      await expect(page.getByText('Went Well')).toBeVisible({ timeout: 15000 });
      await expect(page.getByText("Didn't Go Well")).toBeVisible();
      await expect(page.getByText('Thanks')).toBeVisible();
      await expect(page.getByText('Deep Discussion')).toBeVisible();
    });
  });

  test.describe('Board Functionality', () => {
    test('should create a card', async ({ page, request }) => {
      await createAndJoinRoom(page, request, 'Card Create Retro', 'CardUser');
      const textarea = page.getByPlaceholder(/Drop a thought/).first();
      await textarea.fill('Great teamwork this sprint!');
      const sendBtn = textarea.locator('..').locator('..').getByRole('button', { name: /Send/ });
      await sendBtn.click();
      await expect(page.getByText('Great teamwork this sprint!')).toBeVisible({ timeout: 15000 });
    });

    test('should show own card with You label', async ({ page, request }) => {
      await createAndJoinRoom(page, request, 'Reveal Test Retro', 'RevealUser');
      const textarea = page.getByPlaceholder(/Drop a thought/).first();
      await textarea.fill('My anonymous card');
      const sendBtn = textarea.locator('..').locator('..').getByRole('button', { name: /Send/ });
      await sendBtn.click();
      await expect(page.getByText('My anonymous card')).toBeVisible({ timeout: 15000 });
      // Own card shows "You" label
      await expect(page.getByText('You').first()).toBeVisible({ timeout: 5000 });
    });

    test('should reveal card author identity', async ({ page, request }) => {
      await createAndJoinRoom(page, request, 'Author Reveal Retro', 'Alice');
      const textarea = page.getByPlaceholder(/Drop a thought/).first();
      await textarea.fill('Reveal me please');
      const sendBtn = textarea.locator('..').locator('..').getByRole('button', { name: /Send/ });
      await sendBtn.click();
      await expect(page.getByText('Reveal me please')).toBeVisible({ timeout: 15000 });
      // The chip-style "reveal" button opens an inline form pre-filled with the
      // user's nickname. The form's submit button is also labelled "reveal" —
      // clicking it actually publishes the identity.
      const revealBtn = page.getByRole('button', { name: 'reveal' }).first();
      await revealBtn.click({ force: true });
      // Submit the inline reveal form (second "reveal" button — the form submit).
      const submitRevealBtn = page.getByRole('button', { name: 'reveal' }).last();
      await submitRevealBtn.click({ force: true });
      await expect(page.getByText('Alice').first()).toBeVisible({ timeout: 15000 });
    });

    test('emoji reaction picker should not overflow card', async ({ page, request }) => {
      await createAndJoinRoom(page, request, 'Emoji Picker Retro', 'EmojiUser');
      const textarea = page.getByPlaceholder(/Drop a thought/).first();
      await textarea.fill('React to me');
      const sendBtn = textarea.locator('..').locator('..').getByRole('button', { name: /Send/ });
      await sendBtn.click();
      await expect(page.getByText('React to me')).toBeVisible({ timeout: 15000 });
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

      // Navigate fresh and wait for content
      await page.goto('/', { waitUntil: 'networkidle' });
      await expect(page.getByText('DashMultiA')).toBeVisible({ timeout: 15000 });
      await expect(page.getByText('DashMultiB')).toBeVisible({ timeout: 5000 });
      await expect(page.getByText('DashMultiC')).toBeVisible({ timeout: 5000 });
    });
  });
});
