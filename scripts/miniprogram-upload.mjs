#!/usr/bin/env node
/**
 * 上传小程序到微信平台（需 miniprogram-ci + 上传密钥）
 *
 * 环境变量：
 *   WECHAT_APPID       小程序 AppID
 *   WECHAT_UPLOAD_KEY  上传密钥文件路径（.key）
 *   WECHAT_VERSION     版本号，默认 1.6.0
 *   WECHAT_DESC        版本描述
 */
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const mpRoot = path.join(root, 'miniprogram');

const appid = process.env.WECHAT_APPID;
const keyPath = process.env.WECHAT_UPLOAD_KEY;
const version = process.env.WECHAT_VERSION || '1.6.0';
const desc = process.env.WECHAT_DESC || 'HonorCard 个人版：28 套模板画廊 + H5 编辑';

if (!appid || !keyPath) {
  console.error('❌ 请设置 WECHAT_APPID 和 WECHAT_UPLOAD_KEY');
  console.error('   密钥：公众平台 → 开发管理 → 小程序代码上传 → 生成');
  process.exit(1);
}
if (!fs.existsSync(keyPath)) {
  console.error('❌ 找不到密钥文件:', keyPath);
  process.exit(1);
}

const cfgPath = path.join(mpRoot, 'project.config.json');
const cfg = JSON.parse(fs.readFileSync(cfgPath, 'utf8'));
if (cfg.appid === 'REPLACE_WITH_YOUR_APPID' || cfg.appid === 'touristappid') {
  console.error('❌ 请先在 miniprogram/project.config.json 填入正式 AppID');
  process.exit(1);
}

const { default: ci } = await import('miniprogram-ci');

const project = new ci.Project({
  appid,
  type: 'miniProgram',
  projectPath: mpRoot,
  privateKeyPath: keyPath,
  ignores: ['node_modules/**/*', 'private/**/*']
});

console.log('📤 上传 HonorCard 小程序…', version);
const result = await ci.upload({
  project,
  version,
  desc,
  setting: { es6: true, minify: true }
});
console.log('✅ 上传成功');
console.log(result);
