(function () {
  function download(url, filename) {
    const a = document.createElement('a');
    a.href = url; a.download = filename;
    document.body.appendChild(a); a.click(); a.remove();
  }

  function png(url, name) { download(url, (name || 'honorcard') + '.png'); }

  function jpg(dataUrl, name, quality) {
    const img = new Image();
    img.onload = () => {
      const c = document.createElement('canvas');
      c.width = img.width; c.height = img.height;
      const ctx = c.getContext('2d');
      ctx.fillStyle = '#ffffff';
      ctx.fillRect(0, 0, c.width, c.height);
      ctx.drawImage(img, 0, 0);
      download(c.toDataURL('image/jpeg', quality || 0.92), (name || 'honorcard') + '.jpg');
    };
    img.src = dataUrl;
  }

  function pdf(url, name, opts) {
    opts = opts || {};
    const land = !!opts.landscape;
    const { jsPDF } = window.jspdf;
    const doc = new jsPDF({
      orientation: land ? 'landscape' : 'portrait',
      unit: 'mm',
      format: 'a4'
    });
    if (land) doc.addImage(url, 'PNG', 0, 0, 297, 210);
    else doc.addImage(url, 'PNG', 0, 0, 210, 297);
    doc.save((name || 'honorcard') + '.pdf');
  }

  function dataUrlToBlob(dataUrl) {
    const parts = dataUrl.split(',');
    const mime = parts[0].match(/:(.*?);/)[1];
    const bin = atob(parts[1]);
    const arr = new Uint8Array(bin.length);
    for (let i = 0; i < bin.length; i++) arr[i] = bin.charCodeAt(i);
    return new Blob([arr], { type: mime });
  }

  function pdfBlob(url, opts) {
    opts = opts || {};
    const land = !!opts.landscape;
    const { jsPDF } = window.jspdf;
    const doc = new jsPDF({
      orientation: land ? 'landscape' : 'portrait',
      unit: 'mm',
      format: 'a4'
    });
    if (land) doc.addImage(url, 'PNG', 0, 0, 297, 210);
    else doc.addImage(url, 'PNG', 0, 0, 210, 297);
    return doc.output('blob');
  }

  window.HC_Export = { png, jpg, pdf, pdfBlob, dataUrlToBlob, download };
  window.HC_EXPORT_PRESETS = {
    standard: { scale: 2, label: '标准（约200dpi）' },
    print: { scale: 3, label: '高清（约300dpi）' }
  };
})();
