import { chromium } from 'playwright';

const CHROME = '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome';

const browser = await chromium.launch({
  executablePath: CHROME,
  headless: true,
  args: ['--no-sandbox', '--disable-gpu', '--disable-dev-shm-usage', '--disable-software-rasterizer'],
});
const page = await browser.newPage({ viewport: { width: 1280, height: 900 } });
await page.goto('http://127.0.0.1:8000/', { waitUntil: 'networkidle', timeout: 30000 });
console.log('TITLE:', await page.title());
console.log('GALLERY_CARDS:', await page.locator('.tpl-card').count());
await page.screenshot({ path: '/Users/hehonghua/workshop/honor_card/test/shots/00-home.png' });
await browser.close();
console.log('LAUNCH_OK');
