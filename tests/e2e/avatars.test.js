import { test, expect } from '@playwright/test';

// Avatars are half config, half asset: a photo is a path typed by hand in
// main.js pointing at a file dropped into public/assets. A typo or a missing
// file degrades to a broken image, which looks like nothing at a glance.

test.describe('Conversation avatars', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
    await expect(page.locator('.conversation-item').first()).toBeVisible();
  });

  test('every row has either a photo or a generated avatar', async ({ page }) => {
    const rows = await page.locator('.conversation-item').evaluateAll(items =>
      items.map(item => ({
        id: item.dataset.id,
        hasImg: !!item.querySelector('.conversation-item-avatar img'),
        hasSvg: !!item.querySelector('.conversation-item-avatar svg'),
      }))
    );

    expect(rows.length).toBeGreaterThan(0);
    const missing = rows.filter(r => !r.hasImg && !r.hasSvg).map(r => r.id);
    expect(missing).toEqual([]);
  });

  test('every photo actually loads', async ({ page }) => {
    // naturalWidth stays 0 for a 404 or an unreadable file, even though the
    // <img> element is happily in the DOM.
    const broken = await page.locator('.conversation-item').evaluateAll(items =>
      items
        .map(item => ({ id: item.dataset.id, img: item.querySelector('.conversation-item-avatar img') }))
        .filter(({ img }) => img && (!img.complete || img.naturalWidth === 0))
        .map(({ id, img }) => `${id} → ${img.getAttribute('src')}`)
    );

    expect(broken).toEqual([]);
  });

  test('photos are square, as the circular crop assumes', async ({ page }) => {
    const skewed = await page.locator('.conversation-item').evaluateAll(items =>
      items
        .map(item => ({ id: item.dataset.id, img: item.querySelector('.conversation-item-avatar img') }))
        .filter(({ img }) => img && img.naturalWidth > 0
          && Math.abs(img.naturalWidth - img.naturalHeight) > 2)
        .map(({ id, img }) => `${id} → ${img.naturalWidth}x${img.naturalHeight}`)
    );

    expect(skewed).toEqual([]);
  });

  test('generated avatars carry a palette colour, never a blank circle', async ({ page }) => {
    const colourless = await page.locator('.conversation-item').evaluateAll(items =>
      items
        .map(item => ({ id: item.dataset.id, circle: item.querySelector('.conversation-item-avatar svg circle') }))
        .filter(({ circle }) => circle && !/^#[0-9A-Fa-f]{6}$/.test(circle.getAttribute('fill') || ''))
        .map(({ id }) => id)
    );

    expect(colourless).toEqual([]);
  });

  test('the open chat header shows the same avatar as its row', async ({ page }) => {
    const row = page.locator('.conversation-item[data-id="alexandre-de-moraes"]');
    const rowSrc = await row.locator('img').getAttribute('src');
    await row.click();

    const headerImg = page.locator('.chat-header-avatar img');
    await expect(headerImg).toHaveAttribute('src', rowSrc);
    expect(await headerImg.evaluate(img => img.naturalWidth)).toBeGreaterThan(0);
  });
});
