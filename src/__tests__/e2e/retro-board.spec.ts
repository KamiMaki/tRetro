import { test, expect } from '@playwright/test';

async function createAndJoinRoom(
  page: import('@playwright/test').Page,
  request: import('@playwright/test').APIRequestContext,
  roomName = 'Test Retro',
  nickname = 'Tester'
) {
  const res = await request.post('/api/rooms', {
    data: { name: roomName },
  });
  const body = await res.json();
  await page.goto(body.joinUrl);
  await page.getByPlaceholder('e.g. Aria').fill(nickname);
  await page.getByRole('button', { name: /Enter retro/i }).click();
  // Wait for the board to mount
  await expect(page.getByText('Went Well')).toBeVisible({ timeout: 15000 });
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
      await expect(page).toHaveURL(/\/room\/[\w-]+\/join/, { timeout: 15000 });
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
    test('should join room with nickname', async ({ page, request }) => {
      const res = await request.post('/api/rooms', {
        data: { name: 'Join Flow Retro' },
      });
      const body = await res.json();
      await page.goto(body.joinUrl);
      await expect(page.getByText('Join Flow Retro')).toBeVisible({ timeout: 10000 });
      await page.getByPlaceholder('e.g. Aria').fill('TestUser');
      await page.getByRole('button', { name: /Enter retro/i }).click();
      await expect(page).toHaveURL(/\/room\/[\w-]+$/, { timeout: 10000 });
      await expect(page.getByText('Went Well')).toBeVisible({ timeout: 15000 });
      await expect(page.getByText('To Improve')).toBeVisible();
      await expect(page.getByText('Thanks')).toBeVisible();
      await expect(page.getByText('Deep Dive')).toBeVisible();
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
      // Click the reveal button (lowercase chip-style label)
      const revealBtn = page.getByRole('button', { name: 'reveal' });
      await revealBtn.click({ force: true });
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
      expect(data.room.name).toBe('History API Retro');
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
