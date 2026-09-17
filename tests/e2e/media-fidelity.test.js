import { test, expect } from '@playwright/test';

// The police report's conversations carry contact cards, locations, links,
// voice notes and captioned screenshots as transcribed text. Each must render
// as the thing it was, not as a bracket in a bubble. Every case is checked on
// the message that motivated it, reached by its direct link.

const open = async (page, chat, id) => {
  await page.goto(`/#/chat/${chat}/msg/${id}`);
  const row = page.locator(`.chat-msg-row[data-id="${id}"]`);
  await expect(row).toBeVisible({ timeout: 20000 });
  return row;
};

test.describe('Links', () => {
  test('a Google Maps share is a card with a map, the place and the address, and opens in a new tab', async ({ page }) => {
    const row = await open(page, 'fabio-faria', 54);
    const card = row.locator('a.chat-link-card');
    await expect(card).toHaveAttribute('href', /^https:\/\/maps\.app\.goo\.gl\//);
    await expect(card).toHaveAttribute('target', '_blank');
    await expect(card.locator('img.chat-link-thumb')).toBeVisible();
    await expect(card.locator('.chat-link-title')).toContainText('Residencial Boa Vista');
    await expect(card.locator('.chat-link-desc')).toContainText('Brasília');
    // The words after the link are still there, as text.
    await expect(row.locator('.chat-link-extra')).toHaveText('Aqui');
    // No bracket leaks into the bubble.
    await expect(row.locator('.chat-msg-content')).not.toContainText('[Residencial');
  });

  test('an article link is a card with title, description and domain', async ({ page }) => {
    const row = await open(page, 'fabio-faria', 135);
    await expect(row.locator('.chat-link-title')).toContainText('Moraes fala sobre regular as Big Techs');
    await expect(row.locator('.chat-link-host')).toHaveText('braziljournal.com');
    await expect(row.locator('a.chat-link-url')).toHaveAttribute('target', '_blank');
  });
});

test('a location is a map with a pin, the place and the address, opening on Google Maps', async ({ page }) => {
  const row = await open(page, 'fabio-faria', 28);
  const card = row.locator('a.chat-location-card');
  await expect(card).toHaveAttribute('href', /google\.com\/maps\?q=-22\.78/);
  await expect(card).toHaveAttribute('target', '_blank');
  await expect(card.locator('img.chat-location-map')).toHaveAttribute('src', '/assets/map-pin.jpg');
  await expect(card.locator('.chat-location-place')).toHaveText('Six Senses Botanique');
  await expect(card.locator('.chat-location-address')).toContainText('Campos Do Jordao');
  await expect(row.locator('.chat-msg-content')).not.toContainText('Latitude');
});

test.describe('Contact cards', () => {
  test('one person with a chat: photo, name, and "Enviar mensagem" opens that chat', async ({ page }) => {
    const row = await open(page, 'marcos-prime', 2);
    await expect(row.locator('.chat-contact-name')).toHaveText('Vivi Moraes');
    await expect(row.locator('.chat-contact-avatar img')).toHaveAttribute('src', /avatar-vivi-moraes/);
    await row.locator('.chat-contact-action', { hasText: 'Enviar mensagem' }).click();
    await expect(page.locator('.chat-header')).toContainText('Vivi Moraes');
    expect(await page.evaluate(() => location.hash)).toBe('#/chat/vivi-moraes');
  });

  test('several entries: the first one, "e mais N", and "Ver todos" opens the list', async ({ page }) => {
    const row = await open(page, 'fabio-faria', 19);
    await expect(row.locator('.chat-contact-name')).toHaveText('Alexandre de Moraes BRASILIA');
    await expect(row.locator('.chat-contact-sub')).toHaveText('e mais 3 contatos');
    await row.locator('.chat-contact-action', { hasText: 'Ver todos' }).click();

    const sheet = page.locator('.contacts-sheet');
    await expect(sheet).toBeVisible();
    await expect(sheet.locator('.contacts-sheet-item')).toHaveCount(4);
    // Call and video do nothing; only the message button is live.
    await expect(sheet.locator('.contacts-sheet-action[aria-label="Ligar"]').first()).toBeDisabled();
    await expect(sheet.locator('.contacts-sheet-action[aria-label="Chamada de vídeo"]').first()).toBeDisabled();
    await sheet.locator('.contacts-sheet-action[aria-label="Enviar mensagem"]').first().click();
    await expect(page.locator('.chat-header')).toContainText('Alexandre de Moraes', { timeout: 20000 });
    await expect(page.locator('.contacts-sheet')).toHaveCount(0);
  });

  // WhatsApp Web shows shared contacts in a dialog over the chat; the phone
  // takes the whole screen.
  test('on a wide screen the list is a dialog over the chat, closed by clicking outside', async ({ page }) => {
    test.skip(page.viewportSize().width <= 600, 'phone: full screen by design');
    const row = await open(page, 'fabio-faria', 19);
    await row.locator('.chat-contact-action', { hasText: 'Ver todos' }).click();
    const sheet = page.locator('.contacts-sheet');
    const list = await sheet.locator('.contacts-sheet-list').boundingBox();
    const view = page.viewportSize();
    expect(list.width).toBeLessThan(view.width * 0.6);
    expect(list.x).toBeGreaterThan(view.width * 0.2);
    await expect(page.locator('.chat-header')).toBeVisible();
    await page.mouse.click(10, view.height - 10);
    await expect(sheet).toHaveCount(0);
  });

  test('the sheet closes on its back button', async ({ page }) => {
    const row = await open(page, 'fabio-faria', 19);
    await row.locator('.chat-contact-action', { hasText: 'Ver todos' }).click();
    await page.locator('.contacts-sheet-back').click();
    await expect(page.locator('.contacts-sheet')).toHaveCount(0);
    expect(await page.evaluate(() => location.hash)).toMatch(/^#\/chat\/fabio-faria/);
  });
});

test('a voice note has a disabled play, a waveform, the sender\'s photo and the transcript', async ({ page }) => {
  const row = await open(page, 'fabio-faria', 7);
  await expect(row.locator('.chat-audio-play')).toBeDisabled();
  expect(await row.locator('.chat-audio-bar').count()).toBeGreaterThan(20);
  await expect(row.locator('.chat-audio-avatar img')).toHaveAttribute('src', /avatar-fabio-faria/);
  await expect(row.locator('.chat-audio-transcript')).toContainText('Fala, irmão, tudo bem?');
  await expect(row.locator('.chat-msg-content')).not.toContainText('[transcrição');
});

test('a captioned screenshot keeps its text inside the grey box, left-aligned', async ({ page }) => {
  const row = await open(page, 'fabio-faria', 67);
  const box = await row.locator('.chat-media-placeholder').boundingBox();
  const caption = row.locator('.chat-media-caption');
  const cap = await caption.boundingBox();
  expect(cap.y + cap.height).toBeLessThanOrEqual(box.y + box.height + 1);
  // The text keeps its distance from the grey edge on both sides.
  const pad = await caption.evaluate(el => [parseFloat(getComputedStyle(el).paddingLeft), parseFloat(getComputedStyle(el).paddingRight)]);
  expect(Math.min(...pad)).toBeGreaterThanOrEqual(12);
  expect(cap.x + cap.width).toBeLessThanOrEqual(box.x + box.width + 1);
  expect(await caption.evaluate(el => getComputedStyle(el).textAlign)).toBe('left');
  await expect(row.locator('.chat-media-note')).toContainText('captura da conversa');
  await expect(row.locator('.chat-media-label')).toHaveText('Foto');
});

test('a note sent to vanish says what it was', async ({ page }) => {
  const row = await open(page, 'alexandre-de-moraes', 39);
  await expect(row.locator('.chat-view-once-tag')).toContainText('Visualização única');
  await expect(row.locator('.chat-msg-content')).toContainText('Acha que segunda ja tenho que estar fora?');
});

// Searching for words inside a voice note used to put the whole transcript on
// one unbreakable line; the chat grew a horizontal scroll wider than the
// screen. The note now wraps like any text.
test('finding a word inside a voice note does not widen the chat', async ({ page }) => {
  await page.goto('/#/chat/fabio-faria');
  await expect(page.locator('.chat-msg-bubble').first()).toBeVisible();
  await page.locator('.chat-header button[aria-label="Pesquisar"], .chat-header button[aria-label="Buscar"]').first().click();
  // Desktop opens a drawer, mobile a bar; the input is the same idea.
  const input = page.locator('.chat-search-input, .mobile-search-input').first();
  await input.fill('almoço com o Alexandre no CADE');
  // Desktop lists the results and waits for a click; mobile jumps to the
  // first match as you type.
  if (page.viewportSize().width > 600) {
    const result = page.locator('.chat-search-result-item').first();
    await expect(result).toBeVisible({ timeout: 10000 });
    await result.click();
  }

  await expect(page.locator('.chat-msg-row[data-id="7"]')).toBeVisible({ timeout: 20000 });
  const overflow = await page.evaluate(() => {
    const list = document.querySelector('.chat-messages');
    return {
      page: document.documentElement.scrollWidth - document.documentElement.clientWidth,
      list: list ? list.scrollWidth - list.clientWidth : 0,
    };
  });
  expect(overflow.page).toBeLessThanOrEqual(0);
  expect(overflow.list).toBeLessThanOrEqual(0);
});

// Whatever ends up inside a bubble — a bad transcription, a 5000px element,
// an unbreakable string — the reader must not be able to drag the screen
// sideways. (A script can still scroll a clipped box; a finger or a wheel
// cannot, and that is what this checks.)
test('the chat never scrolls sideways, even with something far wider than the screen inside it', async ({ page }) => {
  await page.goto('/#/chat/fabio-faria');
  await expect(page.locator('.chat-msg-bubble').first()).toBeVisible();
  await page.evaluate(() => {
    const bubble = document.querySelector('.chat-msg-content');
    const wide = document.createElement('div');
    wide.style.width = '5000px';
    wide.style.height = '2px';
    bubble.appendChild(wide);
    const long = document.createElement('div');
    long.textContent = 'x'.repeat(800);
    long.style.whiteSpace = 'nowrap';
    bubble.appendChild(long);
  });
  const list = page.locator('.chat-messages');
  const box = await list.boundingBox();
  await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2);
  await page.mouse.wheel(3000, 0);
  await page.waitForTimeout(300);
  const state = await page.evaluate(() => ({
    pageX: window.scrollX,
    listX: document.querySelector('.chat-messages')?.scrollLeft ?? 0,
    mainX: document.querySelector('.main-area')?.scrollLeft ?? 0,
    bodyX: document.body.scrollLeft,
  }));
  expect(state).toEqual({ pageX: 0, listX: 0, mainX: 0, bodyX: 0 });
});
