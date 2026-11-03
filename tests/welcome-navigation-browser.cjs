const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const http = require('node:http');
const { chromium } = require('playwright');
const root = path.resolve(__dirname, '..');
(async () => {
  const server = http.createServer((req, res) => {
    const file = path.join(root, decodeURIComponent(req.url.split('?')[0]).replace(/\/$/, '/index.html'));
    try {
      const ext = path.extname(file);
      res.setHeader('Content-Type', ({'.html':'text/html','.js':'text/javascript','.css':'text/css','.png':'image/png','.jpeg':'image/jpeg'})[ext] || 'application/octet-stream');
      res.end(fs.readFileSync(file));
    } catch { res.writeHead(404); res.end(); }
  });
  await new Promise(r => server.listen(0, '127.0.0.1', r));
  let browser;
  try {
    browser = await chromium.launch({headless:true, ...(process.env.CHROMIUM_PATH ? {executablePath:process.env.CHROMIUM_PATH} : {}), args:['--no-sandbox','--disable-dev-shm-usage']});
    const context = await browser.newContext({viewport:{width:390,height:844}});
    await context.route('**/*', route => new URL(route.request().url()).hostname === '127.0.0.1' ? route.continue() : route.abort());
    const page = await context.newPage();
    const errors = []; page.on('pageerror', e => errors.push(e.message));
    await page.clock.install();
    const base = `http://127.0.0.1:${server.address().port}`;
    await page.goto(base, {waitUntil:'networkidle'});
    assert.equal(await page.locator('#welcomePopupCloseX').isDisabled(), true, 'X must be locked for five seconds');
    assert.equal(await page.locator('#welcomePopup [data-welcome-slide]').count(), 2);
    await page.keyboard.press('Escape');
    assert.equal(await page.locator('#welcomePopup').getAttribute('aria-hidden'), 'false');
    await page.clock.fastForward(1500);
    assert.equal(await page.locator('#welcomePopup').getAttribute('data-slide'), '1');
    await page.locator('[data-welcome-dot="0"]').click();
    assert.equal(await page.locator('#welcomePopup').getAttribute('data-slide'), '0');
    await page.clock.fastForward(3500);
    assert.equal(await page.locator('#welcomePopupCloseX').isDisabled(), false);
    await page.clock.fastForward(60000);
    assert.equal(await page.locator('#welcomePopup').getAttribute('aria-hidden'), 'false', 'Never auto-close');
    await page.locator('#welcomeDontShow').check();
    await page.locator('#welcomePopupCloseX').click();
    await page.reload({waitUntil:'networkidle'});
    assert.equal(await page.locator('#welcomePopup').getAttribute('aria-hidden'), 'true', 'Remember opt-out');
    await page.locator('#languageToggle').click();
    await page.locator('[data-locale-option="ms"]').click();
    assert.equal(await page.locator('html').getAttribute('lang'), 'ms');
    await page.locator('#sidebarToggleButton').click();
    await page.clock.fastForward(400);
    assert.equal(await page.locator('#sidebarOverlay').getAttribute('aria-hidden'), 'false');
    assert.equal(await page.locator('#sidebarMenu a[href="/page/about-us.html"]').count(), 1);
    await page.keyboard.press('Escape');
    await page.clock.fastForward(400);
    assert.equal(await page.locator('#sidebarOverlay').getAttribute('aria-hidden'), 'true');
    assert.equal(await page.locator('body > header').evaluate(el => getComputedStyle(el).backgroundColor), 'rgb(255, 255, 255)');
    for (const width of [360, 430, 1280]) {
      await page.setViewportSize({width,height:844});
      await page.evaluate(() => localStorage.removeItem('duitjom:welcome:launch-v1:hidden'));
      await page.reload({waitUntil:'networkidle'});
      const box = await page.locator('.welcome-popup').boundingBox();
      assert(box.x >= 0 && box.y >= 0 && box.x + box.width <= width + 1 && box.y + box.height <= 845);
      const image = await page.locator('[data-welcome-slide] img').first().evaluate(el => ({ok:el.complete && el.naturalWidth>0,fit:getComputedStyle(el).objectFit}));
      assert(image.ok); assert.equal(image.fit, 'contain');
    }
    assert.deepEqual(errors, []);
    console.log('PASS: five-second lock, no automatic close, two slides, manual slide, opt-out, language, sidebar, white navbar and responsive image sizing.');
  } finally { await browser?.close(); server.close(); }
})().catch(e => { console.error(e); process.exitCode=1; });
