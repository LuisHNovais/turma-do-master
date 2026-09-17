import { test, expect } from '@playwright/test';

// Runs against the built site. A crawler gets the conversation as HTML; a
// browser gets the app, open on that conversation, with the HTML gone.
//
// The trailing slash is for vite's preview server, which only resolves a
// directory index that way. Vercel serves the same page at /chat/<id> and
// redirects the slash away (vercel.json: trailingSlash false).

test('a crawler reads the conversation without running anything', async ({ request }) => {
  const res = await request.get('/chat/ciro-soares/');
  expect(res.status()).toBe(200);
  const html = await res.text();
  expect(html).toContain('<article id="prerender">');
  expect(html).toContain('<h1>Daniel Vorcaro ↔ Ciro Soares</h1>');
  expect(html).toContain('<h2>Quem é Ciro Soares</h2>');
});

test('a browser lands in the app, on that conversation', async ({ page }) => {
  await page.goto('/chat/ciro-soares/');
  await expect(page.locator('.chat-header')).toContainText('Ciro Soares', { timeout: 20000 });
  await expect(page.locator('.chat-msg-bubble').first()).toBeVisible();
  expect(await page.evaluate(() => location.hash)).toBe('#/chat/ciro-soares');
  await expect(page.locator('#prerender')).toHaveCount(0);
});

// A shared link carries its own hash; the page must not override it.
test('a hash already in the URL wins over the page', async ({ page }) => {
  await page.goto('/chat/ciro-soares/#/chat/alexandre-de-moraes');
  await expect(page.locator('.chat-header')).toContainText('Alexandre de Moraes', { timeout: 20000 });
});

test('a month page reads without JS and opens the app at its first message', async ({ page, request }) => {
  const res = await request.get('/chat/martha-graeff/2024-12/');
  expect(res.status()).toBe(200);
  expect(await res.text()).toContain('<p id="msg-35686">');

  await page.goto('/chat/martha-graeff/2024-12/');
  await expect(page.locator('.chat-header')).toContainText('Martha Graeff', { timeout: 20000 });
  expect(await page.evaluate(() => location.hash)).toMatch(/^#\/chat\/martha-graeff\/msg\/\d+$/);
  await expect(page.locator('#prerender')).toHaveCount(0);
});

test('a person page stands on its own', async ({ page }) => {
  await page.goto('/quem/paulo-gonet/');
  await expect(page.locator('h1')).toHaveText('Paulo Gonet');
  await expect(page.locator('.msg').first()).toBeVisible();
  await expect(page.locator('#app')).toHaveCount(0);
  await expect(page.locator('a[href="/chat/ciro-soares#msg-34"]').first()).toBeVisible();
});

// A static anchor link, followed by a browser, must land in the app at that
// message — not at the top of the chat, and not on the list. (Trailing slash
// for vite's preview server, as above.)
test('a #msg-N link opens the app at that message', async ({ page }) => {
  await page.goto('/chat/ciro-soares/#msg-34');
  await expect(page.locator('.chat-header')).toContainText('Ciro Soares', { timeout: 20000 });
  await expect.poll(() => page.evaluate(() => location.hash)).toBe('#/chat/ciro-soares/msg/34');
  await expect(page.locator('#prerender')).toHaveCount(0);
});
