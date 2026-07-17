/**
 * P3 云同步 — 微信云开发
 * 开通：公众平台 → 云开发 → 创建环境 → 把 envId 填入 config.cloudEnv
 * 集合：projects（权限建议：仅创建者可读写）
 */
const { cloudEnv } = require('./config');
const projects = require('./projects');

let ready = false;

function enabled() {
  return !!cloudEnv;
}

function init() {
  if (!cloudEnv || ready) return !!ready;
  try {
    if (!wx.cloud) return false;
    wx.cloud.init({ env: cloudEnv, traceUser: true });
    ready = true;
    return true;
  } catch (e) {
    console.warn('cloud init fail', e);
    return false;
  }
}

function db() {
  if (!init()) return null;
  return wx.cloud.database();
}

function stripHeavy(p) {
  return {
    id: p.id,
    tplId: p.tplId,
    name: p.name,
    fields: p.fields,
    thumb: p.thumb,
    updatedAt: p.updatedAt
  };
}

function pushAll() {
  return new Promise((resolve) => {
    const database = db();
    if (!database) return resolve({ ok: false, msg: '未开通云开发，请填写 cloudEnv' });
    const list = projects.list().map(stripHeavy);
    if (!list.length) return resolve({ ok: true, msg: '本地无草稿', count: 0 });

    const col = database.collection('projects');
    let done = 0;
    let fail = 0;
    list.forEach(p => {
      col.doc(p.id).set({
        data: Object.assign({}, p, { _syncedAt: Date.now() })
      }).then(() => {
        done++;
        if (done + fail === list.length) {
          resolve({
            ok: fail === 0,
            msg: '已上传 ' + done + ' 条' + (fail ? '，失败 ' + fail : ''),
            count: done
          });
        }
      }).catch(() => {
        fail++;
        if (done + fail === list.length) {
          resolve({ ok: false, msg: '部分失败：成功 ' + done + ' / 失败 ' + fail, count: done });
        }
      });
    });
  });
}

function pullAll() {
  return new Promise((resolve) => {
    const database = db();
    if (!database) return resolve({ ok: false, msg: '未开通云开发' });
    database.collection('projects').limit(100).get({
      success: res => {
        const remote = res.data || [];
        const local = projects.list();
        const map = {};
        local.forEach(p => { map[p.id] = p; });
        let merged = 0;
        remote.forEach(r => {
          const id = r._id || r.id;
          if (!id) return;
          const cur = map[id];
          const remoteTs = r.updatedAt || 0;
          const localTs = (cur && cur.updatedAt) || 0;
          if (!cur || remoteTs >= localTs) {
            map[id] = {
              id,
              tplId: r.tplId,
              name: r.name,
              fields: r.fields,
              photoPath: '',
              thumb: r.thumb,
              updatedAt: remoteTs || Date.now()
            };
            merged++;
          }
        });
        const next = Object.values(map).sort((a, b) => (b.updatedAt || 0) - (a.updatedAt || 0));
        wx.setStorageSync('hc_mp_projects_v1', next);
        resolve({ ok: true, msg: '已同步，合并 ' + merged + ' 条', count: next.length });
      },
      fail: err => resolve({ ok: false, msg: (err && err.errMsg) || '拉取失败' })
    });
  });
}

function pushOne(proj) {
  return new Promise((resolve) => {
    const database = db();
    if (!database) return resolve({ ok: false });
    database.collection('projects').doc(proj.id).set({
      data: Object.assign({}, stripHeavy(proj), { _syncedAt: Date.now() })
    }).then(() => resolve({ ok: true })).catch(() => resolve({ ok: false }));
  });
}

module.exports = { enabled, init, pushAll, pullAll, pushOne };
