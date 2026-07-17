#!/usr/bin/env node
/** 从 js/data/templates.js 同步小程序模板目录（含原生编辑器所需图层） */
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const src = fs.readFileSync(path.join(root, 'js/data/templates.js'), 'utf8');
const w = {};
new Function('window', src)(w);

const SCENE_LABELS = {
  photo: '照片奖状',
  campus: '校园表扬',
  corporate: '员工表彰',
  activity: '活动荣誉',
  festival: '节日励志'
};

function isSerif(fontFamily) {
  return /Song|SimSun|serif|Kai|Kaiti/i.test(String(fontFamily || ''));
}

function pickLayer(l) {
  if (l.type === 'photo') {
    return {
      type: 'photo',
      id: l.id,
      left: l.left,
      top: l.top,
      width: l.width,
      height: l.height,
      mask: l.mask || 'square',
      frame: !!l.frame,
      originX: l.originX || 'center',
      originY: l.originY || 'center'
    };
  }
  if (l.type === 'seal') {
    return {
      type: 'seal',
      id: l.id,
      text: l.text || '荣誉专用章',
      left: l.left,
      top: l.top,
      size: l.size || 120,
      color: l.color || '#c1272d'
    };
  }
  if (l.type === 'text') {
    return {
      type: 'text',
      id: l.id,
      text: l.text || '',
      left: l.left,
      top: l.top,
      width: l.width || 0,
      fontSize: l.fontSize || 32,
      fontWeight: l.fontWeight || 'normal',
      fill: l.fill || '#333',
      textAlign: l.textAlign || 'center',
      originX: l.originX || 'center',
      originY: l.originY || 'center',
      lineHeight: l.lineHeight || 1.5,
      charSpacing: l.charSpacing || 0,
      serif: isSerif(l.fontFamily)
    };
  }
  return null;
}

function parseRecipient(text) {
  const raw = String(text || '').replace(/：$/, '').trim();
  const m = raw.match(/^(.+?)\s+(\S+)$/);
  if (m) return { name: m[1], suffix: m[2] };
  return { name: raw || '张小明', suffix: '同学' };
}

function buildDefaults(layers) {
  const map = {};
  layers.forEach(l => { if (l.type === 'text') map[l.id] = l.text; });
  const rec = parseRecipient(map.recipient);
  return {
    title: map.title || '奖状',
    label: map.recipient_label || '',
    name: rec.name,
    suffix: rec.suffix,
    reason: map.reason || '',
    honor: map.honor || '',
    closing: map.closing || '',
    issuer: map.issuer || '荣誉颁发',
    date: map.date || '',
    sealText: (layers.find(l => l.type === 'seal') || {}).text || '荣誉专用章'
  };
}

function mpBgFromWeb(bg) {
  // assets/templates/tpl-01-red-web.png → assets/templates/tpl-01-red-mp.jpg
  return String(bg || '').replace(/-web\.png$/i, '-mp.jpg');
}

const catalog = w.HC_TEMPLATES.map(t => {
  const layers = (t.layers || []).map(pickLayer).filter(Boolean);
  const photo = layers.find(l => l.type === 'photo') || null;
  return {
    id: t.id,
    name: t.name,
    category: t.category,
    scene: t.sceneCategory || 'campus',
    sceneLabel: SCENE_LABELS[t.sceneCategory] || '其他',
    landscape: t.canvas.w > t.canvas.h,
    thumb: t.thumb,
    bg: mpBgFromWeb(t.bg), // 小程序用压缩 JPEG
    bgFull: t.bg,           // 保留原 web 路径备查
    canvas: { w: t.canvas.w, h: t.canvas.h },
    hasPhoto: !!photo,
    photo,
    defaults: buildDefaults(layers),
    layers
  };
});

const payload = { version: 3, count: catalog.length, templates: catalog };
const dir = path.join(root, 'miniprogram/data');
fs.mkdirSync(dir, { recursive: true });
// 小程序不能稳定 require .json，同步输出 .js
const outJs = path.join(dir, 'catalog.js');
fs.writeFileSync(outJs, 'module.exports = ' + JSON.stringify(payload, null, 2) + ';\n');
fs.writeFileSync(path.join(dir, 'catalog.json'), JSON.stringify(payload, null, 2) + '\n');
console.log('Wrote', catalog.length, 'templates (v3) →', outJs);
