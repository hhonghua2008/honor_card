(function () {
  const KEY = 'hc_onboarded';

  function showEditorTips(view) {
    if (localStorage.getItem(KEY)) return;
    const wrap = view.querySelector('.left-tools');
    if (!wrap) return;
    const tip = document.createElement('div');
    tip.className = 'onboard-tip';
    tip.innerHTML = `
      <b>👋 快速上手</b>
      <ol>
        <li>左侧「内容模版」一键套用场景</li>
        <li>改姓名、正文，或点击画布编辑</li>
        <li>完成后保存或下载 PNG/PDF</li>
      </ol>
      <button class="btn primary" id="onboardOk">知道了</button>`;
    wrap.insertBefore(tip, wrap.firstChild);
    tip.querySelector('#onboardOk').onclick = () => {
      localStorage.setItem(KEY, '1');
      tip.remove();
    };
  }

  window.HC_Onboarding = { showEditorTips };
})();
