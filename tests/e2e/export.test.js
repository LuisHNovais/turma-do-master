import { test, expect } from '@playwright/test';

// The export is a file the build already wrote; what the app has to get right
// is offering it where the reader is, and handing over the right file.

const openChatMenu = async (page) => {
  await page.goto('/#/chat/ciro-soares');
  await expect(page.locator('.chat-msg-bubble').first()).toBeVisible();
  await page.locator('.chat-header button[aria-label="Menu"]').click();
};

test.describe('Exporting one conversation', () => {
  test('the menu offers both formats', async ({ page }) => {
    await openChatMenu(page);
    await expect(page.locator('.chat-dropdown-item', { hasText: 'Exportar (.md)' })).toBeVisible();
    await expect(page.locator('.chat-dropdown-item', { hasText: 'Exportar (.json)' })).toBeVisible();
  });

  // Two more items must not push the menu off a phone screen.
  test('the menu still fits on screen', async ({ page }) => {
    await openChatMenu(page);
    const menu = await page.locator('.chat-dropdown-menu').boundingBox();
    const { width, height } = page.viewportSize();
    expect(menu.y).toBeGreaterThanOrEqual(0);
    expect(menu.y + menu.height).toBeLessThanOrEqual(height);
    expect(menu.x + menu.width).toBeLessThanOrEqual(width);
  });

  for (const format of ['md', 'json']) {
    test(`downloads the conversation as .${format}, under its own name`, async ({ page }) => {
      await openChatMenu(page);
      const [download] = await Promise.all([
        page.waitForEvent('download'),
        page.locator('.chat-dropdown-item', { hasText: `Exportar (.${format})` }).click(),
      ]);
      expect(download.suggestedFilename()).toBe(`turma-master-ciro-soares.${format}`);
      const path = await download.path();
      expect(path).toBeTruthy();
    });
  }

  test('the menu closes once the download starts', async ({ page }) => {
    await openChatMenu(page);
    await Promise.all([
      page.waitForEvent('download'),
      page.locator('.chat-dropdown-item', { hasText: 'Exportar (.md)' }).click(),
    ]);
    await expect(page.locator('.chat-dropdown-menu')).toBeHidden();
  });
});

test.describe('Exporting everything', () => {
  test('the home menu offers the zip and downloads it', async ({ page }) => {
    await page.goto('/');
    await expect(page.locator('.conversation-item').first()).toBeVisible();
    await page.locator('.sidebar-menu-btn').click();

    const item = page.locator('.sidebar-dropdown-item', { hasText: 'Exportar tudo (.zip)' });
    await expect(item).toBeVisible();

    const [download] = await Promise.all([page.waitForEvent('download'), item.click()]);
    expect(download.suggestedFilename()).toBe('turma-master-export.zip');
  });
});
