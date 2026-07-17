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
      lineHeight: l.lineHeight || 1.5
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
    name: rec.name,
    suffix: rec.suffix,
    reason: map.reason || '',
    honor: map.honor || '',
    closing: map.closing || '',
    issuer: map.issuer || '荣誉颁发',
    date: map.date || ''
  };
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
    bg: t.bg,
    canvas: { w: t.canvas.w, h: t.canvas.h },
    hasPhoto: !!photo,
    photo,
    defaults: buildDefaults(layers),
    layers
  };
});

const out = path.join(root, 'miniprogram/data/catalog.json');
fs.mkdirSync(path.dirname(out), { recursive: true });
fs.writeFileSync(out, JSON.stringify({ version: 2, count: catalog.length, templates: catalog }, null, 2) + '\n');
console.log('Wrote', catalog.length, 'templates (v2 editor) →', out);
