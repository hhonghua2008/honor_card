(function () {
  async function saveAsProject(templateId, scene, name) {
    const proj = {
      id: 'p_' + Date.now(),
      name: name || '来自分享的奖状',
      templateId,
      scene,
      updatedAt: Date.now()
    };
    await window.HC_Storage.save(proj);
    return proj;
  }

  function render(view, data) {
    const templates = window.HC_TEMPLATES;
    const t = templates.find(x => x.id === data.templateId) || templates[0];
    const editor = new window.HC_Editor({
      view,
      template: t,
      project: { id: 'shared', scene: data.scene },
      mode: 'readonly',
      shareMeta: data
    });

    const saveBtn = editor.view.querySelector('#saveAsBtn');
    if (saveBtn) {
      saveBtn.onclick = async () => {
        try {
          const proj = await saveAsProject(data.templateId, data.scene, t.name + '（分享）');
          window.HC_UI.toast('已保存到「我的项目」', 'success');
          location.hash = '#/editor?proj=' + proj.id;
        } catch (e) {
          window.HC_UI.toast('保存失败：' + (e.message || e), 'error');
        }
      };
    }
  }

  window.HC_ShareView = { render };
})();
