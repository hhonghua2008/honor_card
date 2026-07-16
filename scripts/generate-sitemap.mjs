#!/usr/bin/env node
/** 生成 sitemap.xml — node scripts/generate-sitemap.mjs */
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dir = path.dirname(fileURLToPath(import.meta.url));
const root = path.join(__dir, '..');
const BASE = process.env.SITE_URL || 'https://honorcard.app';

const seoSrc = fs.readFileSync(path.join(root, 'js/data/seo-pages.js'), 'utf8');
const fn = new Function('window', seoSrc + '\nreturn window.HC_SEO_PAGES;');
const pages = fn({});

const urls = [
  { loc: BASE + '/#/', priority: '1.0' },
  { loc: BASE + '/#/templates', priority: '0.9' },
  { loc: BASE + '/#/guides', priority: '0.9' },
  { loc: BASE + '/#/pricing', priority: '0.8' },
  { loc: BASE + '/#/privacy', priority: '0.3' },
  { loc: BASE + '/#/terms', priority: '0.3' },
  ...pages.map(p => ({ loc: BASE + '/#/guide/' + p.slug, priority: '0.7' }))
];

const xml = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${urls.map(u => `  <url><loc>${u.loc}</loc><priority>${u.priority}</priority></url>`).join('\n')}
</urlset>
`;

const out = path.join(root, 'sitemap.xml');
fs.writeFileSync(out, xml);
console.log('✅ sitemap.xml —', urls.length, 'URLs');
