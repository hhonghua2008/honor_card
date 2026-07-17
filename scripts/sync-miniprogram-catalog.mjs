#!/usr/bin/env node
/** 从 js/data/templates.js 同步小程序模板目录 */
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const src = fs.readFileSync(path.join(root, 'js/data/templates.js'), 'utf8');
const w = {};
// eslint-disable-next-line no-new-func
new Function('window', src)(w);

const SCENE_LABELS = {
  photo: '照片奖状',
  campus: '校园表扬',
  corporate: '员工表彰',
  activity: '活动荣誉',
  festival: '节日励志'
};

const catalog = w.HC_TEMPLATES.map(t => ({
  id: t.id,
  name: t.name,
  category: t.category,
  scene: t.sceneCategory || 'campus',
  sceneLabel: SCENE_LABELS[t.sceneCategory] || '其他',
  landscape: t.canvas.w > t.canvas.h,
  thumb: t.thumb
}));

const out = path.join(root, 'miniprogram/data/catalog.json');
fs.mkdirSync(path.dirname(out), { recursive: true });
fs.writeFileSync(out, JSON.stringify({ version: 1, count: catalog.length, templates: catalog }, null, 2) + '\n');
console.log('Wrote', catalog.length, 'templates →', out);
