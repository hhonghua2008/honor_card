(function () {
  function parseNames(text) {
    const lines = text.split(/\r?\n/).map(s => s.trim()).filter(Boolean);
    const names = [];
    lines.forEach(line => {
      const col = line.split(/[,，\t]/)[0].trim();
      if (col && col !== '姓名' && col !== 'name' && col !== 'Name') names.push(col);
    });
    return [...new Set(names)];
  }

  function parseExcel(file) {
    return new Promise((resolve, reject) => {
      const r = new FileReader();
      r.onload = (e) => {
        try {
          if (!window.XLSX) { reject(new Error('NO_XLSX')); return; }
          const wb = XLSX.read(e.target.result, { type: 'array' });
          const sheet = wb.Sheets[wb.SheetNames[0]];
          const rows = XLSX.utils.sheet_to_json(sheet, { header: 1 });
          const names = [];
          rows.forEach((row, i) => {
            const cell = (row[0] || '').toString().trim();
            if (!cell) return;
            if (i === 0 && /姓名|name/i.test(cell)) return;
            names.push(cell);
          });
          resolve([...new Set(names)]);
        } catch (err) { reject(err); }
      };
      r.onerror = reject;
      r.readAsArrayBuffer(file);
    });
  }

  function safeFilename(name) {
    return name.replace(/[\\/:*?"<>|]/g, '_').slice(0, 40);
  }

  async function pickSuffix(editor) {
    const cur = editor.getTextLayer('recipient') || '';
    let def = '同学';
    const m = cur.match(/(同学|先生\/女士|先生|女士|小朋友|同志)[：:]/);
    if (m) def = m[1];

    const choice = await window.HC_UI.modal({
      title: '选择称呼后缀',
      body: `
        <label style="display:block;font-size:13px">后缀
          <select class="hc-modal-input" id="batchSuffix" style="margin-top:6px">
            <option value="同学"${def === '同学' ? ' selected' : ''}>同学</option>
            <option value="小朋友"${def === '小朋友' ? ' selected' : ''}>小朋友</option>
            <option value="先生/女士"${def === '先生/女士' ? ' selected' : ''}>先生/女士</option>
            <option value="同志"${def === '同志' ? ' selected' : ''}>同志</option>
          </select>
        </label>`,
      buttons: [{ label: '取消' }, { label: '下一步', primary: true }]
    });

    if (!choice || !choice.primary) return null;
    const sel = document.querySelector('#batchSuffix');
    return sel ? sel.value : def;
  }

  async function pickFormat() {
    const isPro = window.HC_Plan && window.HC_Plan.isPro();
    const choice = await window.HC_UI.modal({
      title: '导出格式',
      body: `
        <label style="display:block;margin-bottom:8px;font-size:13px">
          <input type="radio" name="batchFmt" value="png" checked> PNG 图片（通用）
        </label>
        <label style="display:block;font-size:13px;color:${isPro ? 'inherit' : '#999'}">
          <input type="radio" name="batchFmt" value="pdf" ${isPro ? '' : 'disabled'}> PDF 打印文件 ${isPro ? '' : '（Pro）'}
        </label>`,
      buttons: [{ label: '取消' }, { label: '下一步', primary: true }]
    });
    if (!choice || !choice.primary) return null;
    const sel = document.querySelector('input[name=batchFmt]:checked');
    const fmt = sel ? sel.value : 'png';
    if (fmt === 'pdf' && window.HC_Plan && !window.HC_Plan.isPro()) {
      window.HC_Pricing.showUpgradeModal();
      return null;
    }
    return fmt;
  }

  async function pickNamesInput(suffix) {
    const limit = window.HC_Plan ? window.HC_Plan.batchLimit() : 10;
    const isPro = window.HC_Plan && window.HC_Plan.isPro();

    return new Promise(resolve => {
      let uploadedFile = null;
      const overlay = document.createElement('div');
      overlay.className = 'hc-modal-overlay';
      overlay.innerHTML = `
        <div class="hc-modal" style="width:min(480px,92vw)">
          <h3 class="hc-modal-title">批量生成奖状</h3>
          <div class="hc-modal-body">
            <p style="margin:0 0 10px;font-size:13px;color:#8a6d4b">粘贴名单或上传 Excel/CSV（取第一列）</p>
            <textarea class="hc-modal-textarea" id="batchNames" rows="6" placeholder="张三&#10;李四"></textarea>
            <div style="margin-top:10px">
              <label class="btn" style="cursor:pointer;display:inline-block">📎 上传 Excel/CSV
                <input type="file" id="batchFile" accept=".xlsx,.xls,.csv" style="display:none">
              </label>
              <span id="batchFileName" style="font-size:12px;color:#999;margin-left:8px"></span>
            </div>
            <p style="margin:8px 0 0;font-size:12px;color:#999">后缀：<b>${suffix}</b> · 上限 ${limit} 人${isPro ? '' : ' · <a href="#/pricing">升级 Pro</a>'}</p>
          </div>
          <div class="hc-modal-actions">
            <button class="btn" data-act="cancel">取消</button>
            <button class="btn primary" data-act="ok">开始生成</button>
          </div>
        </div>`;
      document.body.appendChild(overlay);
      overlay.querySelector('#batchFile').onchange = (e) => {
        uploadedFile = e.target.files[0] || null;
        overlay.querySelector('#batchFileName').textContent = uploadedFile ? uploadedFile.name : '';
      };
      overlay.querySelector('[data-act=cancel]').onclick = () => { overlay.remove(); resolve(null); };
      overlay.querySelector('[data-act=ok]').onclick = async () => {
        const text = overlay.querySelector('#batchNames').value;
        overlay.remove();
        let names = parseNames(text);
        if (uploadedFile) {
          try {
            if (uploadedFile.name.endsWith('.csv')) {
              names = parseNames(await uploadedFile.text());
            } else {
              names = await parseExcel(uploadedFile);
            }
          } catch (e) {
            window.HC_UI.toast('Excel 解析失败', 'error');
            resolve(null);
            return;
          }
        }
        resolve(names);
      };
    });
  }

  async function run(editor) {
    if (!window.JSZip) {
      window.HC_UI.toast('批量功能加载失败，请刷新页面', 'error');
      return;
    }

    window.HC_Analytics && window.HC_Analytics.track('batch_start');

    const suffix = await pickSuffix(editor);
    if (suffix === null) return;

    const fmt = await pickFormat();
    if (!fmt) return;

    const names = await pickNamesInput(suffix);
    if (!names || !names.length) {
      window.HC_UI.toast('请输入至少一个姓名', 'error');
      return;
    }

    const limit = window.HC_Plan ? window.HC_Plan.batchLimit() : 10;
    if (names.length > limit) {
      window.HC_UI.toast('超过上限 ' + limit + ' 人，请升级 Pro 或分批处理', 'error');
      if (window.HC_Plan && !window.HC_Plan.isPro()) window.HC_Pricing.showUpgradeModal();
      return;
    }

    const ok = await window.HC_UI.confirm(
      `将为 <b>${names.length}</b> 人生成 ${fmt.toUpperCase()} 并打包 ZIP？`,
      { title: '确认批量生成', okLabel: '开始' }
    );
    if (!ok) return;

    const origRecipient = editor.getTextLayer('recipient');
    const zip = new JSZip();
    const scale = editor._exportScale('standard');
    const land = editor.isLandscape();

    for (let i = 0; i < names.length; i++) {
      const name = names[i];
      editor.setTextLayer('recipient', name + ' ' + suffix + '：');
      editor.canvas.renderAll();
      await new Promise(r => setTimeout(r, 20));
      const url = await editor.getExportDataUrl(scale);
      if (fmt === 'pdf') {
        zip.file(safeFilename(name) + '.pdf', window.HC_Export.pdfBlob(url, { landscape: land }));
      } else {
        zip.file(safeFilename(name) + '.png', window.HC_Export.dataUrlToBlob(url));
      }
      if (i % 5 === 0) window.HC_UI.toast('生成中 ' + (i + 1) + '/' + names.length + '…', 'info');
    }

    editor.setTextLayer('recipient', origRecipient);
    editor.canvas.renderAll();
    editor.refreshForm();

    const zipBlob = await zip.generateAsync({ type: 'blob' });
    const dlUrl = URL.createObjectURL(zipBlob);
    window.HC_Export.download(dlUrl, (editor.template.name || 'honorcard') + '_批量_' + names.length + '人.zip');
    setTimeout(() => URL.revokeObjectURL(dlUrl), 5000);
    window.HC_Analytics && window.HC_Analytics.track('batch_done', { count: names.length, fmt });
    window.HC_UI.toast('已生成 ' + names.length + ' 份 ' + fmt.toUpperCase(), 'success');
  }

  window.HC_Batch = { run, parseNames, parseExcel };
})();
