// Run with: CHROMIUM_PATH=/usr/bin/chromium node tests/loan-calculator-browser.cjs
// External requests are blocked; no application or personal data is submitted.
const assert = require('node:assert/strict');
const http = require('node:http');
const fs = require('node:fs');
const path = require('node:path');
const { chromium } = require('playwright');
const root = path.resolve(__dirname, '..');
(async () => {
  const server = http.createServer((req, res) => {
    const pathname = new URL(req.url, 'http://localhost').pathname;
    const file = path.join(root, pathname === '/' ? 'index.html' : pathname);
    try {
      const types = { '.js': 'text/javascript', '.css': 'text/css', '.html': 'text/html', '.png': 'image/png' };
      res.setHeader('Content-Type', types[path.extname(file)] || 'application/octet-stream');
      res.end(fs.readFileSync(file));
    } catch { res.writeHead(404); res.end(); }
  });
  await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
  let browser;
  try {
    browser = await chromium.launch({ headless: true, ...(process.env.CHROMIUM_PATH ? { executablePath: process.env.CHROMIUM_PATH } : {}), args: ['--no-sandbox'] });
    const page = await browser.newPage();
    const base = `http://127.0.0.1:${server.address().port}`;
    await page.route('**/*', route => {
      const url = route.request().url();
      if (url.startsWith(base)) return route.continue();
      if (url === 'https://www.duitjom.my/') return route.fulfill({ contentType: 'text/html', body: '<h1>Application destination stub</h1>' });
      return route.abort();
    });
    await page.goto(base, { waitUntil: 'networkidle' });
    // Dismiss only the existing maintenance overlay, leaving the page flow intact.
    await page.evaluate(() => document.getElementById('welcomePopup')?.remove());
    assert(await page.locator('#loanCalculator').isVisible(), 'public content needs no login');
    const structure = await page.evaluate(() => {
      const auth = document.getElementById('firebaseAuthContainer');
      const calculator = document.getElementById('loanCalculator');
      const footer = document.getElementById('siteFooter');
      const ids = [...document.querySelectorAll('[id]')].map(el => el.id);
      return {
        belowLogin: auth.getBoundingClientRect().bottom <= calculator.getBoundingClientRect().top,
        footerLast: footer === document.getElementById('mainPage').lastElementChild,
        uniqueIds: ids.length === new Set(ids).size,
        emoji: /\p{Extended_Pictographic}/u.test(calculator.textContent),
      };
    });
    assert.deepEqual(structure, { belowLogin: true, footerLast: true, uniqueIds: true, emoji: false });
    assert.equal(await page.locator('#loanCalculator').evaluate(el => el.nextElementSibling.id), 'loanInformation');
    assert.equal(await page.locator('#soalan-lazim').count(), 1);
    assert.equal(await page.locator('.info-feature-card').count(), 5);
    assert.equal(await page.locator('.info-faq-item').count(), 8);
    assert.equal(await page.locator('#loanInformation a').evaluateAll(els => els.every(el => el.href === 'https://www.duitjom.my/')), true);
    for (const width of [320, 390, 768, 1024, 1440]) {
      await page.setViewportSize({ width, height: 900 });
      const layout = await page.locator('#loanCalculator').evaluate(el => {
        const rect = el.getBoundingClientRect();
        return { columns: getComputedStyle(el.querySelector('.steps-grid')).gridTemplateColumns.split(' ').length,
          overflow: el.scrollWidth > el.clientWidth,
          outside: [...el.querySelectorAll('*')].some(child => { const r = child.getBoundingClientRect(); return r.width > 0 && (r.left < rect.left - 1 || r.right > rect.right + 1); }) };
      });
      assert.equal(layout.columns, width >= 1024 ? 3 : 1);
      assert.equal(layout.overflow, false);
      assert.equal(layout.outside, false);
      const infoLayout = await page.locator('#loanInformation').evaluate(el => ({
        columns: getComputedStyle(el.querySelector('.info-features-grid')).gridTemplateColumns.split(' ').length,
        overflow: el.scrollWidth > el.clientWidth,
        outside: [...el.querySelectorAll('*')].some(child => {
          const r = child.getBoundingClientRect();
          return r.width > 0 && (r.left < -1 || r.right > innerWidth + 1);
        }),
      }));
      assert.equal(infoLayout.columns, width >= 900 ? 2 : 1);
      assert.equal(infoLayout.overflow, false);
      assert.equal(infoLayout.outside, false);
      console.log(`${width}px: calculator and continuation layout passed`);
    }
    const slider = page.locator('#loanAmountSlider');
    const amount = page.locator('#loanAmountDisplay');
    assert.equal(await amount.textContent(), 'RM 1,000');
    for (const value of [300, 500, 1000, 2000, 3000, 5000]) {
      await page.locator(`[data-loan-amount="${value}"]`).click();
      assert.equal(await slider.inputValue(), String(value));
      assert.equal(await amount.textContent(), `RM ${value.toLocaleString('en-MY')}`);
      assert.equal(await page.locator('[data-loan-amount][aria-pressed="true"]').count(), 1);
    }
    await slider.focus();
    await slider.press('Home');
    assert.equal(await amount.textContent(), 'RM 300');
    await slider.press('ArrowRight');
    assert.equal(await amount.textContent(), 'RM 400');
    assert.equal(await page.locator('[data-loan-amount][aria-pressed="true"]').count(), 0);
    await slider.press('End');
    assert.equal(await amount.textContent(), 'RM 5,000');
    const phone = page.locator('#loanPhoneInput');
    await page.locator('#loanApplicationForm button').click();
    assert(await page.locator('#loanPhoneError').isVisible());
    assert.equal(await phone.getAttribute('aria-invalid'), 'true');
    await phone.fill('12ab-34');
    assert.equal(await phone.inputValue(), '1234');
    await phone.press('Enter');
    assert(await page.locator('#loanPhoneError').isVisible());
    assert.equal(page.url(), base + '/');
    assert.equal(await page.locator('#phoneInput').inputValue(), '', 'existing payment phone remains untouched');
    await page.locator('#siteFooter a[href="#loanCalculator"]').click();
    assert.equal(new URL(page.url()).hash, '#loanCalculator');
    await page.locator('.info-stats-grid').scrollIntoViewIfNeeded();
    await page.waitForTimeout(2200);
    assert.deepEqual(await page.locator('.info-counter').allTextContents(), ['50K+', '99.9%', '5']);
    await page.setViewportSize({ width: 320, height: 844 });
    for (let i = 1; i <= 8; i++) {
      const button = page.locator(`#loanFaqQuestion${i}`);
      await button.focus();
      await button.press('Enter');
      assert.equal(await button.getAttribute('aria-expanded'), 'true');
      assert.equal(await page.locator('.info-faq-item.open').count(), 1);
      const answer = page.locator(`#loanFaqAnswer${i}`);
      assert(await answer.isVisible());
      assert.equal(await answer.evaluate(el => el.scrollHeight <= el.clientHeight), true, 'answer is not clipped');
    }
    await page.locator('#loanFaqQuestion8').press('Space');
    assert.equal(await page.locator('.info-faq-item.open').count(), 0);
    assert.equal(await page.locator('.faq-answer:not([hidden])').count(), 0);
    await page.locator('#siteFooter a[href="#soalan-lazim"]').click();
    assert.equal(new URL(page.url()).hash, '#soalan-lazim');
    await page.emulateMedia({ reducedMotion: 'reduce' });
    assert.equal(await page.locator('.banknote').first().evaluate(el => getComputedStyle(el).animationName), 'none');
    assert.equal(await page.locator('.duitjom-loan .apply-btn').evaluate(el => getComputedStyle(el, '::after').animationName), 'none');
    for (const url of ['/css/loan-calculator.css', '/js/loan-calculator.js', '/css/loan-information.css', '/js/loan-information.js']) assert.equal((await page.request.get(base + url)).status(), 200);
    await phone.fill('0123456789');
    await phone.press('Enter');
    await page.waitForURL('https://www.duitjom.my/');
    assert.equal(page.url(), 'https://www.duitjom.my/', 'redirect carries no phone data');
    console.log('PASS: DOM order, SVG-only icons, slider keyboard and presets, phone validation, footer anchor, FAQ keyboard controls, counters and application redirect');
  } finally {
    if (browser) await browser.close();
    await new Promise(resolve => server.close(resolve));
  }
})().catch(error => { console.error(error); process.exitCode = 1; });
