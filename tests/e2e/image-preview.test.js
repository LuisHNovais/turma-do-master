import { test, expect } from '@playwright/test';

// The preview is reached only after sharing and copying have both failed, so it
// must offer exactly what the browser can still do. Two profiles matter:
//
//   Firefox — navigator.share exists but refuses files, and the clipboard
//             refuses images. Nothing to offer, so the download just happens.
//   Chrome  — shares files. The button is worth showing, and this path is only
//             reached when the first attempt failed for some other reason.

const FIREFOX_PROFILE = () => {
  navigator.share = () => Promise.reject(
    Object.assign(new Error('refused'), { name: 'NotAllowedError' })
  );
  navigator.canShare = () => false;
  Object.defineProperty(navigator, 'clipboard', {
    configurable: true,
    value: {
      write: () => Promise.reject(
        Object.assign(new Error('refused'), { name: 'NotAllowedError' })
      ),
    },
  });
  window.__downloads = [];
  HTMLAnchorElement.prototype.click = function () {
    if (this.download) window.__downloads.push(this.download);
  };
};

const SHARES_FILES = (shouldSucceed) => {
  window.__shared = null;
  window.__downloads = [];
  navigator.canShare = () => true;
  navigator.share = (data) => {
    if (!shouldSucceed) {
      return Promise.reject(Object.assign(new Error('no'), { name: 'NotAllowedError' }));
    }
    window.__shared = (data.files || []).map(f => ({ name: f.name, type: f.type }));
    return Promise.resolve();
  };
  Object.defineProperty(navigator, 'clipboard', {
    configurable: true,
    value: { write: () => Promise.reject(new Error('nope')) },
  });
  HTMLAnchorElement.prototype.click = function () {
    if (this.download) window.__downloads.push(this.download);
  };
};

/** Open a chat, install a capability profile, and ask for the print. */
async function openPrint(page, profile, arg) {
  await page.goto('/#/chat/ciro-soares');
  await expect(page.locator('.chat-msg-bubble').first()).toBeVisible();
  await page.evaluate(profile, arg);
  await page.locator('.chat-header button[aria-label="Menu"]').click();
  await page.locator('.chat-dropdown-item', { hasText: 'Compartilhar print' }).click();
}

/** Ask for the print again, the way the "toque novamente" toast invites. */
async function askAgain(page) {
  await page.locator('.chat-header button[aria-label="Menu"]').click();
  await page.locator('.chat-dropdown-item', { hasText: 'Compartilhar print' }).click();
}

test.describe('Preview when the browser cannot share files', () => {
  test.beforeEach(async ({ page }) => {
    await openPrint(page, FIREFOX_PROFILE);
    await expect(page.locator('.image-preview')).toBeVisible({ timeout: 20000 });
  });

  // Asking for a click, only to have the browser ask for confirmation on top of
  // it, is two prompts for something already decided.
  test('downloads without being asked twice', async ({ page }) => {
    await expect.poll(() => page.evaluate(() => window.__downloads)).toHaveLength(1);
    expect((await page.evaluate(() => window.__downloads))[0]).toContain('.png');
  });

  // A button that does not work suggests the thing is possible and then takes
  // it away.
  test('offers no buttons it cannot honour', async ({ page }) => {
    await expect(page.locator('.image-preview-action')).toHaveCount(0);
  });

  test('points at the long press, which does work', async ({ page }) => {
    await expect(page.locator('.image-preview-hint')).toContainText('Toque e segure');
  });

  test('shows the image, loaded', async ({ page }) => {
    const img = page.locator('.image-preview-img');
    expect(await img.evaluate(el => el.naturalWidth)).toBeGreaterThan(0);
  });

  // The hint used to sit on top of the picture.
  test('leaves the image clear of the text below it', async ({ page }) => {
    const img = await page.locator('.image-preview-img').boundingBox();
    const hint = await page.locator('.image-preview-hint').boundingBox();

    expect(img.y + img.height).toBeLessThanOrEqual(hint.y + 1);
  });
});

test.describe('Preview when the browser does share files', () => {
  // A platform that shares files never gets here on the happy path — the first
  // attempt succeeds. It only shows up when that attempt was refused, and the
  // second one is where the ambiguity of NotAllowedError gets settled.
  test('shares straight away, without any preview', async ({ page }) => {
    await openPrint(page, SHARES_FILES, true);

    await expect.poll(() => page.evaluate(() => window.__shared)).not.toBeNull();
    await expect(page.locator('.image-preview')).toHaveCount(0);
  });

  test('asks for one more tap, then gives up and previews', async ({ page }) => {
    await openPrint(page, SHARES_FILES, false);

    await expect(page.locator('.search-toast')).toContainText('Toque novamente');
    await expect(page.locator('.image-preview')).toHaveCount(0);

    await askAgain(page);

    // Second refusal settles it: the platform will not take images.
    await expect(page.locator('.image-preview')).toBeVisible({ timeout: 20000 });
  });

  test('offers the share button and nothing else', async ({ page }) => {
    await openPrint(page, SHARES_FILES, false);
    await expect(page.locator('.search-toast')).toContainText('Toque novamente');
    await askAgain(page);
    await expect(page.locator('.image-preview')).toBeVisible({ timeout: 20000 });

    const labels = await page.locator('.image-preview-action').allTextContents();
    expect(labels).toEqual(['Compartilhar']);
  });

  test('hands the image to the share sheet and gets out of the way', async ({ page }) => {
    await openPrint(page, SHARES_FILES, false);
    await expect(page.locator('.search-toast')).toContainText('Toque novamente');
    await askAgain(page);
    await expect(page.locator('.image-preview')).toBeVisible({ timeout: 20000 });

    // The button retries for real; let it through this time.
    await page.evaluate(() => {
      navigator.share = (data) => {
        window.__shared = (data.files || []).map(f => ({ name: f.name, type: f.type }));
        return Promise.resolve();
      };
    });
    await page.locator('.image-preview-action', { hasText: 'Compartilhar' }).click();

    await expect.poll(() => page.evaluate(() => window.__shared)).not.toBeNull();
    expect((await page.evaluate(() => window.__shared))[0].type).toBe('image/png');
    await expect(page.locator('.image-preview')).toHaveCount(0);
  });

  test('drops the button and downloads if the platform refuses after all', async ({ page }) => {
    await openPrint(page, SHARES_FILES, false);
    await expect(page.locator('.search-toast')).toContainText('Toque novamente');
    await askAgain(page);
    await expect(page.locator('.image-preview')).toBeVisible({ timeout: 20000 });

    await page.locator('.image-preview-action', { hasText: 'Compartilhar' }).click();

    await expect(page.locator('.image-preview-action')).toHaveCount(0);
    await expect(page.locator('.image-preview-hint')).toContainText('Toque e segure');
    await expect.poll(() => page.evaluate(() => window.__downloads)).toHaveLength(1);
  });
});

test.describe('Dismissing the preview', () => {
  test.beforeEach(async ({ page }) => {
    await openPrint(page, FIREFOX_PROFILE);
    await expect(page.locator('.image-preview')).toBeVisible({ timeout: 20000 });
  });

  test('closes on the X', async ({ page }) => {
    await page.locator('.image-preview-close').click();
    await expect(page.locator('.image-preview')).toHaveCount(0);
  });

  test('closes on Escape', async ({ page }) => {
    await page.keyboard.press('Escape');
    await expect(page.locator('.image-preview')).toHaveCount(0);
  });

  // A long press starts as a touch on the image; dismissing on that would make
  // the one gesture that works impossible.
  test('tapping the image does not close it', async ({ page }) => {
    await page.locator('.image-preview-img').click();
    await expect(page.locator('.image-preview')).toBeVisible();
  });
});

test.describe('The back button', () => {
  // On Android, back is how a sheet gets dismissed. It used to leave the
  // conversation: the router saw the hash change and went to the list.
  test('closes the preview and stays in the conversation', async ({ page }) => {
    await page.goto('/');
    await page.goto('/#/chat/ciro-soares');
    await expect(page.locator('.chat-msg-bubble').first()).toBeVisible();
    await page.evaluate(FIREFOX_PROFILE);
    await page.locator('.chat-header button[aria-label="Menu"]').click();
    await page.locator('.chat-dropdown-item', { hasText: 'Compartilhar print' }).click();
    await expect(page.locator('.image-preview')).toBeVisible({ timeout: 20000 });

    await page.goBack();

    await expect(page.locator('.image-preview')).toHaveCount(0);
    await expect(page.locator('.chat-msg-bubble').first()).toBeVisible();
    expect(await page.evaluate(() => location.hash)).toBe('#/chat/ciro-soares');
  });

  // Closing on the X must not leave the extra entry behind, or the next back
  // press would go nowhere.
  test('after closing on the X, back leaves the conversation as before', async ({ page }) => {
    await page.goto('/#/');
    await page.goto('/#/chat/ciro-soares');
    await expect(page.locator('.chat-msg-bubble').first()).toBeVisible();
    await page.evaluate(FIREFOX_PROFILE);
    await page.locator('.chat-header button[aria-label="Menu"]').click();
    await page.locator('.chat-dropdown-item', { hasText: 'Compartilhar print' }).click();
    await expect(page.locator('.image-preview')).toBeVisible({ timeout: 20000 });

    await page.locator('.image-preview-close').click();
    await expect(page.locator('.image-preview')).toHaveCount(0);

    await page.goBack();
    await expect.poll(() => page.evaluate(() => location.hash)).toBe('#/');
  });
});
