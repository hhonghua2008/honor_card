#!/usr/bin/env node
/**
 * 模板色彩对比度验收脚本
 * 用法: node scripts/validate-contrast.mjs
 * 说明: 基于 themePresets 的 accent/body/muted 与典型背景色估算 WCAG 对比度
 */
import { readFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __dir = dirname(fileURLToPath(import.meta.url));
const tplSrc = readFileSync(join(__dir, '../js/data/templates.js'), 'utf8');

function hexToRgb(hex) {
  const h = hex.replace('#', '');
  const n = h.length === 3 ? h.split('').map(c => c + c).join('') : h.slice(0, 6);
  return [0, 2, 4].map(i => parseInt(n.slice(i, i + 2), 16));
}

function luminance([r, g, b]) {
  const a = [r, g, b].map(v => {
    v /= 255;
    return v <= 0.03928 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4);
  });
  return 0.2126 * a[0] + 0.7152 * a[1] + 0.0722 * a[2];
}

function contrast(c1, c2) {
  const l1 = luminance(hexToRgb(c1));
  const l2 = luminance(hexToRgb(c2));
  const lighter = Math.max(l1, l2);
  const darker = Math.min(l1, l2);
  return (lighter + 0.05) / (darker + 0.05);
}

const BG_HINTS = {
  'tpl-01': '#8e1c22', 'tpl-08': '#9a2020', 'tpl-13': '#8e1c22',
  'tpl-03': '#1a3a6e', 'tpl-14': '#1a3a6e',
  'tpl-10': '#f5eed8', 'tpl-19': '#f0e6d0',
  'tpl-22': '#1a1a1a', 'tpl-26': '#3a2860'
};

const vm = { HC_TEMPLATES: null };
const fn = new Function('window', tplSrc + '\nreturn window.HC_TEMPLATES;');
const templates = fn(vm);

let pass = 0;
let warn = 0;

console.log('HonorCard 模板对比度验收\n');
console.log('ID\tPreset\tBody\tAccent\tMuted\tBG(est)\tBody\tAccent');
console.log('─'.repeat(72));

templates.forEach(t => {
  const bg = BG_HINTS[t.id] || '#6b2020';
  t.themePresets.forEach(p => {
    const accent = p.accent || p.title;
    const body = p.body || p.text;
    const muted = p.muted || body;
    const cb = contrast(body, bg);
    const ca = contrast(accent, bg);
    const cm = contrast(muted, bg);
    const bodyOk = cb >= 4.5;
    const accentOk = ca >= 3.0;
    const mutedOk = cm >= 3.0;
    const status = bodyOk && accentOk && mutedOk ? '✓' : '⚠';
    if (status === '✓') pass++; else warn++;
    console.log(
      `${t.id}\t${p.name}\t${bodyOk ? 'OK' : cb.toFixed(1)}\t${accentOk ? 'OK' : ca.toFixed(1)}\t${mutedOk ? 'OK' : cm.toFixed(1)}\t${bg}\t${status}`
    );
  });
});

console.log('─'.repeat(72));
console.log(`合计: ${pass} 通过, ${warn} 需关注 (正文≥4.5, 强调≥3.0, 辅助≥3.0)`);
process.exit(warn > 0 ? 1 : 0);
