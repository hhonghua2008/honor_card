(function () {
  const KEY = 'hc_events_v1';
  const MAX = 200;

  function track(event, props) {
    props = props || {};
    const row = { event, props, t: Date.now(), plan: window.HC_Plan ? window.HC_Plan.planLabel() : 'unknown' };
    try {
      const list = JSON.parse(localStorage.getItem(KEY) || '[]');
      list.push(row);
      while (list.length > MAX) list.shift();
      localStorage.setItem(KEY, JSON.stringify(list));
    } catch (e) { /* ignore */ }

    if (typeof window.gtag === 'function') {
      window.gtag('event', event, props);
    }
    if (window.HC_GA_ID && !window.gtag) {
      /* GA4 脚本可在 index.html 配置 HC_GA_ID 后加载 */
    }
  }

  function getEvents() {
    try { return JSON.parse(localStorage.getItem(KEY) || '[]'); } catch (e) { return []; }
  }

  window.HC_Analytics = { track, getEvents };
})();
