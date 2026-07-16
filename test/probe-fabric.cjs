const { chromium } = require('/Users/hehonghua/.workbuddy/binaries/node/workspace/node_modules/playwright');
(async () => {
  const browser = await chromium.launch({
    executablePath: '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
    headless: true, args: ['--no-sandbox', '--disable-gpu']
  });
  const page = await browser.newPage({ viewport: { width: 1280, height: 900 } });
  
  // Go to gallery and click first template
  await page.goto('http://127.0.0.1:8000/#/', { waitUntil: 'networkidle' });
  await page.locator('.tpl-card[data-id="tpl-01"]').click();
  await page.waitForSelector('#c', { timeout: 10000 });
  await page.waitForTimeout(2500);
  
  // Probe all possible ways to access the Fabric canvas instance
  const info = await page.evaluate(() => {
    const el = document.querySelector('#c');
    if (!el) return 'NO_ELEMENT';
    
    const result = {
      elTag: el.tagName,
      keys: Object.keys(el).filter(k => k.toLowerCase().includes('fabric') || k.startsWith('__')),
      fabricCanvas: !!el.fabricCanvas,
      __fabricCanvas: !!el.__fabricCanvas,
      _fabricCanvas: !!el._fabricCanvas,
      // Check if it's a global
      globalFabCanvas: typeof window.fabricCanvas !== 'undefined',
      globalHC_Editor: typeof window.HC_Editor !== 'undefined',
      // Try getting from fabric's internal registry
      fabricVersion: typeof window.fabric !== 'undefined' ? (window.fabric.version || 'no version prop') : 'no fabric global',
    };
    
    // List ALL properties on the element that might be fabric-related
    const ownKeys = [];
    for (let k in el) {
      try {
        if (k.includes('abric') || k.includes('anvas') || k.startsWith('__')) {
          const v = el[k];
          ownKeys.push({ k, type: typeof v, isObj: v && typeof v === 'object' });
        }
      } catch(e) {}
    }
    result.candidateProps = ownKeys;
    
    return result;
  });
  
  console.log(JSON.stringify(info, null, 2));
  await browser.close();
})().catch(e => console.error(e));
