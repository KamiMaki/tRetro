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
  await page.getByPlaceholder('e.g. Alice').fill(nickname);
  await page.getByRole('button', { name: 'Join' }).click();
  // Wait for board AND socket connection
  await expect(page.getByText('Went Well')).toBeVisible({ timeout: 15000 });
  await expect(page.getByText('Connected')).toBeVisible({ timeout: 15000 });
  return body.roomId as string;
}

test.describe('tRetro E2E', () => {
  test.describe('Dashboard', () => {
    test('should show dashboard with create button', async ({ page }) => {
      await page.goto('/');
      await expect(page.locator('h1')).toContainText('tRetro');
      await expect(page.getByText('New Retro')).toBeVisible();
    });

    test('should create a new retro room from dashboard', async ({ page }) => {
      await page.goto('/');
      await page.getByText('New Retro').click();
      const nameInput = page.getByPlaceholder('e.g. Sprint 42 Retro');
      await expect(nameInput).toBeVisible({ timeout: 5000 });
      await nameInput.fill('Sprint 99 Retro');
      await page.getByRole('button', { name: 'Create' }).click();
      await expect(page).toHaveURL(/\/room\/\w+\/join/, { timeout: 15000 });
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
      await page.getByPlaceholder('e.g. Alice').fill('TestUser');
      await page.getByRole('button', { name: 'Join' }).click();
      await expect(page).toHaveURL(/\/room\/\w+$/, { timeout: 10000 });
      await expect(page.getByText('Went Well')).toBeVisible({ timeout: 15000 });
      await expect(page.getByText('To Improve')).toBeVisible();
      await expect(page.getByText('Thanks')).toBeVisible();
      await expect(page.getByText('Deep Dive')).toBeVisible();
    });
  });

  test.describe('Board Functionality', () => {
    test('should create a card', async ({ page, request }) => {
      await createAndJoinRoom(page, request, 'Card Create Retro', 'CardUser');
      const textarea = page.getByPlaceholder('Add a card... (Ctrl+Enter to submit)').first();
      await textarea.fill('Great teamwork this sprint!');
      // Click the Add button in the same section form
      const addBtn = textarea.locator('..').locator('..').getByRole('button', { name: 'Add' });
      await addBtn.click();
      await expect(page.getByText('Great teamwork this sprint!')).toBeVisible({ timeout: 15000 });
    });

    test('should show own card with You label', async ({ page, request }) => {
      await createAndJoinRoom(page, request, 'Reveal Test Retro', 'RevealUser');
      const textarea = page.getByPlaceholder('Add a card... (Ctrl+Enter to submit)').first();
      await textarea.fill('My anonymous card');
      const addBtn = textarea.locator('..').locator('..').getByRole('button', { name: 'Add' });
      await addBtn.click();
      await expect(page.getByText('My anonymous card')).toBeVisible({ timeout: 15000 });
      // Own card shows "You" label
      await expect(page.getByText('You')).toBeVisible({ timeout: 5000 });
    });

    test('should reveal card author identity', async ({ page, request }) => {
      await createAndJoinRoom(page, request, 'Author Reveal Retro', 'Alice');
      const textarea = page.getByPlaceholder('Add a card... (Ctrl+Enter to submit)').first();
      await textarea.fill('Reveal me please');
      const addBtn = textarea.locator('..').locator('..').getByRole('button', { name: 'Add' });
      await addBtn.click();
      await expect(page.getByText('Reveal me please')).toBeVisible({ timeout: 15000 });
      // Hover over card to show the Reveal button (it uses opacity-0 group-hover:opacity-100)
      const cardEl = page.locator('div').filter({ hasText: 'Reveal me please' }).first();
      await cardEl.hover();
      // Force-click the Reveal button since it may have opacity transition
      const revealBtn = page.getByRole('button', { name: 'Reveal' });
      await revealBtn.click({ force: true });
      await expect(page.getByText('Alice')).toBeVisible({ timeout: 15000 });
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
