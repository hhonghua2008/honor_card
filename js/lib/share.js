(function () {
  function encode(obj) {
    const json = JSON.stringify(obj);
    const bytes = new TextEncoder().encode(json);
    const compressed = pako.deflate(bytes);
    let bin = '';
    compressed.forEach(b => { bin += String.fromCharCode(b); });
    return btoa(bin).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
  }

  function decode(str) {
    str = str.replace(/-/g, '+').replace(/_/g, '/');
    const bin = atob(str);
    const bytes = new Uint8Array(bin.length);
    for (let i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i);
    const json = pako.inflate(bytes);
    return JSON.parse(new TextDecoder().decode(json));
  }

  /** 分享时剥离照片像素数据，保留布局元数据 */
  function stripPhotos(scene) {
    if (!scene || !scene.objects) return scene;
    const copy = JSON.parse(JSON.stringify(scene));
    let stripped = false;
    copy.objects.forEach(o => {
      if (o.hcType === 'photo' && o.hcUserImage) {
        stripped = true;
        delete o.src;
        delete o.hcUserImage;
        o.hcPhotoStripped = true;
      }
    });
    return { scene: copy, photosStripped: stripped };
  }

  function buildSharePayload(templateId, scene) {
    const { scene: stripped, photosStripped } = stripPhotos(scene);
    return { templateId, scene: stripped, photosStripped, v: 1 };
  }

  window.HC_Share = { encode, decode, stripPhotos, buildSharePayload };
})();
