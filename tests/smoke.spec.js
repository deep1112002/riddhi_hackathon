// UPKEEP demo smoke tests (dev-only). Run: npx playwright test
const { test, expect } = require('@playwright/test');
const fs = require('fs');
const path = require('path');

const ROOT = path.join(__dirname, '..');
const SHOTS = path.join(ROOT, 'screenshots');

// Fail on any console error, uncaught exception or failed request.
function watch(page) {
  const problems = [];
  page.on('console', (m) => { if (m.type() === 'error') problems.push('console: ' + m.text()); });
  page.on('pageerror', (e) => problems.push('pageerror: ' + e.message));
  page.on('requestfailed', (r) => problems.push('requestfailed: ' + r.url() + ' ' + (r.failure() || {}).errorText));
  page.on('response', (r) => { if (r.status() >= 400) problems.push('http ' + r.status() + ': ' + r.url()); });
  return problems;
}
async function fresh(page, hash) {
  await page.goto('index.html#/');
  await page.evaluate(() => { try { localStorage.clear(); } catch (e) {} });
  await page.goto('index.html' + (hash || '#/'));
  await page.reload();
}
async function shot(page, testInfo, name) {
  const dir = path.join(SHOTS, testInfo.project.name);
  fs.mkdirSync(dir, { recursive: true });
  await page.screenshot({ path: path.join(dir, name + '.png'), fullPage: true });
}

const ROUTES = [
  ['home', '#/', 'h1:has-text("Snap your purifier")'],
  ['assist', '#/assist', '.chat >> text=UPKEEP Assist'],
  ['find', '#/find', 'h1:has-text("Find your part")'],
  ['product', '#/product/KIT3-AQN-N10P', 'h1:has-text("AquaNova Neo 10 Plus (wide housing)")'],
  ['cart', '#/cart', 'h1:has-text("Your cart")'],
  ['book', '#/book', 'h1:has-text("Book a technician")'],
  ['order', '#/order', 'h1:has-text("No orders yet")'],
  ['verify', '#/verify/UPK-260901-0001-KIT3AQNN10P-X', 'h1'],
  ['reminders', '#/reminders', '.wa-msg:has-text("Hi Riya")'],
  ['pro', '#/pro', 'h1:has-text("For partner technicians")'],
  ['about', '#/about', 'h1:has-text("About the proposal")']
];

test('static checks: no modules, no root-absolute paths, .nojekyll present', async () => {
  const html = fs.readFileSync(path.join(ROOT, 'index.html'), 'utf8');
  expect(html).not.toMatch(/type=["']module["']/);
  expect(html).not.toMatch(/(src|href)=["']\/(?!\/)/);
  const js = ['app', 'assist', 'data', 'qr', 'svg', 'tour'].map((f) => fs.readFileSync(path.join(ROOT, 'js', f + '.js'), 'utf8')).join('\n');
  expect(js).not.toMatch(/["'(]\/assets\//);
  expect(js).not.toMatch(/\bfetch\(/);
  expect(fs.existsSync(path.join(ROOT, '.nojekyll'))).toBe(true);
});

test('every route renders without errors, banner always visible', async ({ page }, testInfo) => {
  const problems = watch(page);
  await fresh(page);
  for (const [name, hash, sel] of ROUTES) {
    await page.goto('index.html' + hash);
    await expect(page.locator(sel).first()).toBeVisible();
    await expect(page.locator('.demo-banner')).toContainText('Hackathon demo');
    await expect(page.locator('.demo-banner')).toContainText('fictional products and prices');
    await page.waitForTimeout(400);
    await shot(page, testInfo, 'route-' + name);
  }
  // no horizontal scrolling on any viewport
  for (const [, hash] of ROUTES) {
    await page.goto('index.html' + hash);
    const overflow = await page.evaluate(() => Math.max(document.documentElement.scrollWidth, document.body.scrollWidth) - window.innerWidth);
    expect(overflow, 'horizontal overflow on ' + hash).toBeLessThanOrEqual(1);
  }
  expect(problems).toEqual([]);
});

test('works from file:// too', async ({ page }) => {
  const problems = watch(page);
  await page.goto('file://' + path.join(ROOT, 'index.html') + '#/find');
  await expect(page.locator('h1:has-text("Find your part")')).toBeVisible();
  await page.selectOption('#f-brand', 'clearsip');
  await page.selectOption('#f-model', 'CSP-M6');
  await expect(page.locator('[data-find-results] .product-card')).toHaveCount(4);
  expect(problems).toEqual([]);
});

test('browser back/forward and finder exact fits', async ({ page }) => {
  const problems = watch(page);
  await fresh(page);
  await page.click('.hero >> text=Find my part manually');
  await expect(page).toHaveURL(/#\/find$/);
  await page.selectOption('#f-brand', 'aquanova');
  await page.selectOption('#f-model', 'AQN-N10P');
  await page.check('input[name="stage"][value="membrane"]');
  const names = await page.locator('[data-find-results] .product-card h3').allTextContents();
  expect(names).toEqual(['RO membrane 80 GPD — standard 11.75″', 'Complete annual kit — AquaNova Neo 10 Plus (wide housing)']);
  // every result is an exact fit for the chosen model
  for (const fit of await page.locator('[data-find-results] .fits').allTextContents()) expect(fit).toContain('AquaNova Neo 10 Plus');
  await page.locator('[data-find-results] h3 a').first().click();
  await expect(page).toHaveURL(/#\/product\/MEM80-STD$/);
  await page.goBack();
  await expect(page).toHaveURL(/#\/find$/);
  await page.goBack();
  await expect(page.locator('.hero')).toBeVisible();
  await page.goForward();
  await expect(page).toHaveURL(/#\/find$/);
  expect(problems).toEqual([]);
});

test('Assist: photo flow with a sample photo, then symptom and recommendation', async ({ page }, testInfo) => {
  const problems = watch(page);
  await fresh(page, '#/assist');
  await page.click('.chip:has-text("Upload a photo")');
  await page.click('[data-action="as-sample"][data-code="AQN-N10P"]');
  await expect(page.locator('.scan .scan-label').last()).toHaveText(/Reading the model label/);
  await expect(page.locator('.detect')).toContainText('AquaNova Neo 10 Plus', { timeout: 10000 });
  await expect(page.locator('.detect')).toContainText('AQN-N10P');
  await expect(page.locator('.detect')).toContainText('RO+UV');
  await page.locator('.chips[data-used="false"] .chip:has-text("Water is slow")').click();
  const rec = page.locator('.rec').last();
  await expect(rec).toContainText('Exact fit');
  await expect(rec).toContainText('Filter kit — AquaNova Neo 10 Plus (wide housing)');
  await expect(rec).toContainText('₹999');
  // "Last changed?" adjusts the advice (over a year → complete annual kit)
  await rec.locator('[data-action="as-last"][data-val="gt12"]').click();
  await expect(page.locator('.rec').last()).toContainText('Complete annual kit — AquaNova Neo 10 Plus');
  await expect(page.locator('.rec').last()).toContainText('₹2,479');
  await shot(page, testInfo, 'assist-photo-flow');
  expect(problems).toEqual([]);
});

test('Assist: all five quick-reply chips', async ({ page }) => {
  const problems = watch(page);
  await fresh(page, '#/assist');
  const cases = [
    ['Water is slow', 'Filter kit — HydraPure Classic RO'],
    ['Tastes or smells odd', 'Filter kit — HydraPure Classic RO'],
    ['Leaking', 'Book a diagnosis visit (₹349)'],
    ['Time for a filter change', 'Filter kit — HydraPure Classic RO'],
    ['Upload a photo', 'Snap or upload the model label']
  ];
  for (const [chip, expectText] of cases) {
    await page.click('[data-action="as-restart"]');
    await page.locator('.chips[data-used="false"] .chip', { hasText: chip }).first().click();
    if (chip !== 'Upload a photo') {
      await page.locator('.chip:has-text("HydraPure Classic RO")').last().click();
    }
    await expect(page.locator('.chat-log')).toContainText(expectText, { timeout: 10000 });
  }
  expect(problems).toEqual([]);
});

test('Assist: typed model, unknown model hand-off, uploaded photo', async ({ page }) => {
  const problems = watch(page);
  await fresh(page, '#/assist');
  await page.fill('#chat-text', 'my aquanova neo 8 tastes funny');
  await page.press('#chat-text', 'Enter');
  await expect(page.locator('.rec').last()).toContainText('Filter kit — AquaNova Neo 8', { timeout: 10000 });

  await page.click('[data-action="as-restart"]');
  await page.fill('#chat-text', 'Zeta 5');
  await page.press('#chat-text', 'Enter');
  await expect(page.locator('.chat-log')).toContainText("That model isn't mapped yet, so I won't guess.", { timeout: 10000 });
  await expect(page.locator('.chat-log')).toContainText('Connecting you to an UPKEEP expert on WhatsApp');
  await expect(page.locator('.msg.expert')).toContainText('Human expert', { timeout: 10000 });
  await expect(page.locator('.msg.expert')).toContainText('photo of the label');

  // high TDS typed with a model code
  await page.click('[data-action="as-restart"]');
  await page.fill('#chat-text', 'PRH-ELT water tastes salty, TDS is high');
  await page.press('#chat-text', 'Enter');
  await expect(page.locator('.rec').last()).toContainText('RO membrane 80 GPD — PuraHome Elite RO+UV+UF', { timeout: 10000 });

  // any uploaded image → AquaNova Neo 10 Plus at 92%
  await page.click('[data-action="as-restart"]');
  await page.click('.chip:has-text("Upload a photo")');
  const png = Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==', 'base64');
  await page.locator('input[type="file"]').last().setInputFiles({ name: 'purifier.png', mimeType: 'image/png', buffer: png });
  await expect(page.locator('.detect').last()).toContainText('92% confident', { timeout: 10000 });
  await expect(page.locator('.detect').last()).toContainText('AquaNova Neo 10 Plus');
  expect(problems).toEqual([]);
});

test('Assist: booking inside chat and reminder opt-in', async ({ page }, testInfo) => {
  const problems = watch(page);
  await fresh(page, '#/assist');
  await page.click('.chip:has-text("Water is slow")');
  await page.locator('.chip:has-text("AquaNova Neo 10 Plus")').click();
  await page.locator('.rec [data-action="as-book"]').click();
  await page.locator('[data-action="as-day"]').first().click();
  await page.locator('[data-action="as-slot"][data-slot="morning"]').click();
  await page.click('[data-action="as-confirm"]');
  await expect(page.locator('[data-tour="tech"]')).toContainText('Sarjan-trained', { timeout: 10000 });
  await expect(page.locator('[data-tour="tech"]')).toContainText('Mehul Parmar');
  await expect(page.locator('[data-tour="tech"]')).toContainText('overflow booking with a partner service network (demo)');
  await page.click('.chip:has-text("Yes, remind me")');
  await expect(page.locator('.chat-log')).toContainText("I'll message you on WhatsApp");
  await shot(page, testInfo, 'assist-booking');
  await page.goto('index.html#/reminders');
  await expect(page.locator('text=WhatsApp · set')).toBeVisible();
  await page.goto('index.html#/cart');
  await expect(page.locator('.line-item')).toHaveCount(1);
  await expect(page.locator('[data-total]')).toHaveText('₹1,348');
  expect(problems).toEqual([]);
});

test('sediment add-on cannot be bought alone', async ({ page }) => {
  const problems = watch(page);
  await fresh(page, '#/product/SED-AQN-N10P');
  await expect(page.locator('text=Add-on only.')).toBeVisible();
  await page.click('button:has-text("Add to kit in my cart")', { force: true }); // aria-disabled: explains instead of adding
  await expect(page.locator('[data-cart-count]')).toHaveText('0');
  await page.click('button:has-text("Add with filter kit")');
  await expect(page.locator('[data-cart-count]')).toHaveText('2');
  await page.goto('index.html#/cart');
  await expect(page.locator('[data-total]')).toHaveText('₹1,293');
  // removing the kit leaves an orphan add-on: checkout is blocked
  await page.locator('.line-item').first().locator('button:has-text("Remove")').click();
  await expect(page.locator('button:has-text("Place demo order")')).toBeDisabled();
  expect(problems).toEqual([]);
});

test('add to cart, place order, scan QR, verify', async ({ page }, testInfo) => {
  const problems = watch(page);
  await fresh(page, '#/product/KIT3-AQN-N10P');
  await page.click('button:has-text("Part + Pro")');
  await page.click('button:has-text("Add to cart · ₹1,348")');
  await expect(page.locator('[data-cart-count]')).toHaveText('1');
  await page.goto('index.html#/cart');
  await expect(page.locator('[data-total]')).toHaveText('₹1,348');
  await page.click('.partner-btn:has-text("Zepto")');
  await expect(page.locator('[data-modal]')).toContainText('In the live product this opens the partner app with the exact SKU');
  await page.click('[data-action="choose-quick"]');
  await expect(page.locator('input[name="dlv"][value="quick"]')).toBeChecked();
  await shot(page, testInfo, 'cart');
  await page.click('button:has-text("Place demo order")');
  await expect(page).toHaveURL(/#\/order$/);
  await expect(page.locator('.timeline')).toContainText('Technician visit');
  await expect(page.locator('.timeline')).toContainText('~15 min via Zepto');
  await shot(page, testInfo, 'order');

  // Decode the QR in the browser with jsQR and follow it.
  await page.addScriptTag({ path: require.resolve('jsqr/dist/jsQR.js') });
  const decoded = await page.evaluate(async () => {
    const svg = document.querySelector('[data-qr-link] svg');
    const xml = new XMLSerializer().serializeToString(svg);
    const img = new Image();
    img.src = 'data:image/svg+xml;charset=utf-8,' + encodeURIComponent(xml);
    await img.decode();
    const c = document.createElement('canvas');
    c.width = c.height = 400;
    const g = c.getContext('2d');
    g.imageSmoothingEnabled = false;
    g.drawImage(img, 0, 0, 400, 400);
    const d = g.getImageData(0, 0, 400, 400);
    const r = window.jsQR(d.data, 400, 400);
    return r && r.data;
  });
  expect(decoded).toMatch(/^http:\/\/localhost:8080\/index\.html#\/verify\/UPK-\d{6}-\d{4}-KIT3AQNN10P-[A-Z]$/);
  const href = await page.locator('[data-qr-link]').getAttribute('href');
  expect(decoded.endsWith(href)).toBe(true);
  await page.goto(decoded);
  await expect(page.locator('h1')).toHaveText('Genuine UPKEEP part ✓');
  await expect(page.locator('.facts')).toContainText('Changodar, Ahmedabad');
  await expect(page.locator('.facts')).toContainText('12 months from delivery');
  await shot(page, testInfo, 'verify');

  // A fresh browser (no saved state) can still verify the serial.
  await page.evaluate(() => localStorage.clear());
  await page.reload();
  await expect(page.locator('h1')).toHaveText('Genuine UPKEEP part ✓');
  // A tampered serial fails.
  await page.goto(decoded.replace(/-[A-Z]$/, (m) => (m === '-Q' ? '-R' : '-Q')));
  await expect(page.locator('h1')).toHaveText("We couldn't verify this serial. Contact us.");
  expect(problems).toEqual([]);
});

test('reset demo and ?demo=1 presenter shortcut', async ({ page }) => {
  const problems = watch(page);
  await page.goto('index.html?demo=1#/cart');
  await expect(page.locator('[data-cart-count]')).toHaveText('2');
  await page.goto('index.html?demo=1#/order');
  await expect(page.locator('[data-qr-link]')).toBeVisible();
  await page.goto('index.html#/cart');
  await page.locator('.site-footer [data-action="reset-demo"]').click();
  await expect(page).toHaveURL(/#\/$/);
  await expect(page.locator('[data-cart-count]')).toHaveText('0');
  await page.goto('index.html#/order');
  await expect(page.locator('h1')).toHaveText('No orders yet');
  expect(problems).toEqual([]);
});

test('pro join form shows a success toast', async ({ page }) => {
  const problems = watch(page);
  await fresh(page, '#/pro');
  await page.fill('#j-name', 'Ravi Patel');
  await page.fill('#j-phone', '98765 43210');
  await page.click('button:has-text("Request to join")');
  await expect(page.locator('.toast')).toContainText('Thanks Ravi');
  expect(problems).toEqual([]);
});

test('guided demo runs start to finish in under 3 minutes', async ({ page }, testInfo) => {
  const problems = watch(page);
  await fresh(page);
  const t0 = Date.now();
  await page.locator('body').press('d');
  await expect(page.locator('.tour-card')).toBeVisible();
  for (let i = 1; i <= 7; i++) {
    await expect(page.locator('.tour-card .t-step')).toHaveText(`Step ${i} of 7`);
    const next = page.locator('[data-tour-btn="next"]');
    await expect(next).toBeEnabled({ timeout: 20000 });
    await page.waitForTimeout(250);
    if (i === 2) await expect(page.locator('.detect')).toContainText('AquaNova Neo 10 Plus');
    if (i === 3) await expect(page.locator('.rec').last()).toContainText('Filter kit — AquaNova Neo 10 Plus');
    if (i === 4) await expect(page.locator('[data-tour="tech"]')).toBeVisible();
    if (i === 5) await expect(page.locator('[data-qr-link]')).toBeVisible();
    if (i === 6) await expect(page.locator('h1')).toHaveText('Genuine UPKEEP part ✓');
    if (i === 7) await expect(page.locator('.wa-msg')).toContainText('Hi Riya');
    if (i === 2 || i === 5) await shot(page, testInfo, 'tour-step-' + i);
    await next.click();
  }
  await expect(page.locator('.tour-card')).toHaveCount(0);
  await expect(page).toHaveURL(/#\/$/);
  expect(Date.now() - t0).toBeLessThan(180000);

  // Exit at any step with Esc
  await page.click('[data-action="tour-start"]');
  await expect(page.locator('[data-tour-btn="next"]')).toBeEnabled();
  await page.click('[data-tour-btn="next"]');
  await expect(page.locator('.tour-card .t-step')).toHaveText('Step 2 of 7');
  await page.keyboard.press('Escape');
  await expect(page.locator('.tour-card')).toHaveCount(0);
  expect(problems).toEqual([]);
});
