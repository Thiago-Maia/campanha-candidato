/* =============================================================================
   Gerador de foto de apoio — lógica da aplicação
   Sem dependências, sem build. Tudo roda no navegador do eleitor:
   nenhuma foto é enviada para servidor.
   ========================================================================== */

(function () {
  'use strict';

  var CFG = window.CAMPAIGN_CONFIG || {};
  var EXPORT = CFG.export || {};
  var S = EXPORT.size || 1000;          // resolução do arquivo final (quadrado)
  var MAX_ZOOM = 4;
  var MAX_FILE_MB = 25;

  // ---------------------------------------------------------------------------
  // Utilidades
  // ---------------------------------------------------------------------------

  function $(id) { return document.getElementById(id); }

  function clamp(v, min, max) {
    if (max < min) { return (min + max) / 2; }
    return v < min ? min : (v > max ? max : v);
  }

  function pick(path, fallback) {
    var parts = String(path).split('.');
    var node = CFG;
    for (var i = 0; i < parts.length; i++) {
      if (node == null) { return fallback; }
      node = node[parts[i]];
    }
    return node == null || node === '' ? fallback : node;
  }

  function escapeXml(value) {
    return String(value)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;');
  }

  var el = {
    stage: $('stage'),
    canvas: $('preview'),
    empty: $('emptyState'),
    loading: $('loadingState'),
    dragHint: $('dragHint'),
    fileInput: $('fileInput'),
    pickBtn: $('pickBtn'),
    controls: $('controls'),
    zoom: $('zoom'),
    zoomValue: $('zoomValue'),
    centerBtn: $('centerBtn'),
    resetBtn: $('resetBtn'),
    downloadBtn: $('downloadBtn'),
    shareBtn: $('shareBtn'),
    status: $('status'),
    frames: $('frames'),
    steps: $('steps'),
    legal: $('legal'),
    credits: $('credits'),
    creditsText: $('creditsText'),
    creditsLink: $('creditsLink')
  };

  var ctx = el.canvas.getContext('2d');

  var state = {
    image: null,       // ImageBitmap ou HTMLImageElement
    frame: null,       // HTMLImageElement da moldura ativa
    frameIndex: 0,
    zoom: 1,           // 1 = enquadramento "cobrir"
    x: 0,              // canto superior esquerdo da foto, em unidades do canvas (0..S)
    y: 0
  };

  // ---------------------------------------------------------------------------
  // Identidade (cores, textos, metadados) vinda do config
  // ---------------------------------------------------------------------------

  function applyTheme() {
    var theme = CFG.theme || {};
    var root = document.documentElement;
    Object.keys(theme).forEach(function (key) {
      if (!theme[key]) { return; }
      var name = '--' + key.replace(/[A-Z]/g, function (c) { return '-' + c.toLowerCase(); });
      root.style.setProperty(name, theme[key]);
    });
    var meta = document.querySelector('meta[name="theme-color"]');
    if (meta && theme.primary) { meta.setAttribute('content', theme.primary); }
  }

  function applyMeta() {
    var m = CFG.meta || {};
    if (m.title) {
      document.title = m.title;
      setMeta('property', 'og:title', m.title);
    }
    if (m.description) {
      setMeta('name', 'description', m.description);
      setMeta('property', 'og:description', m.description);
    }
    if (m.shareUrl) { setMeta('property', 'og:url', m.shareUrl); }
    if (m.ogImage) { setMeta('property', 'og:image', m.ogImage); }
  }

  function setMeta(attr, key, value) {
    var node = document.querySelector('meta[' + attr + '="' + key + '"]');
    if (!node) {
      node = document.createElement('meta');
      node.setAttribute(attr, key);
      document.head.appendChild(node);
    }
    node.setAttribute('content', value);
  }

  function applyTexts() {
    document.querySelectorAll('[data-cfg]').forEach(function (node) {
      var value = pick(node.getAttribute('data-cfg'), null);
      if (value != null) { node.textContent = value; }
    });

    var steps = pick('texts.steps', []);
    el.steps.innerHTML = '';
    steps.forEach(function (step) {
      var li = document.createElement('li');
      var body = document.createElement('div');
      var strong = document.createElement('strong');
      strong.textContent = step.title || '';
      var span = document.createElement('span');
      span.textContent = step.text || '';
      body.appendChild(strong);
      body.appendChild(span);
      li.appendChild(body);
      el.steps.appendChild(li);
    });

    var disclaimer = pick('legal.disclaimer', '');
    if (disclaimer) {
      el.legal.textContent = disclaimer;
      el.legal.hidden = false;
    }

    var footer = CFG.footer || {};
    if (footer.text || footer.linkLabel) {
      el.creditsText.textContent = footer.text ? footer.text + ' ' : '';
      if (footer.linkLabel && footer.linkUrl) {
        el.creditsLink.textContent = footer.linkLabel;
        el.creditsLink.href = footer.linkUrl;
      } else {
        el.creditsLink.remove();
      }
      el.credits.hidden = false;
    }
  }

  // ---------------------------------------------------------------------------
  // Molduras
  // ---------------------------------------------------------------------------

  function loadImageElement(src) {
    return new Promise(function (resolve, reject) {
      var img = new Image();
      img.decoding = 'async';
      img.onload = function () { resolve(img); };
      img.onerror = function () { reject(new Error('Não foi possível carregar ' + src)); };
      img.src = src;
    });
  }

  // Molduras .svg funcionam como modelo: os marcadores {{NOME}}, {{NUMERO}},
  // {{PARTIDO}}, {{SLOGAN}} e as cores do tema são substituídos na hora.
  // Arquivos .png (arte final do designer) são carregados como estão.
  function fillTemplate(svgText) {
    var c = CFG.candidate || {};
    var t = CFG.theme || {};
    var map = {
      NOME: c.name || '',
      NUMERO: c.number || '',
      PARTIDO: c.party || '',
      SLOGAN: c.slogan || '',
      COR_PRIMARIA: t.primary || '#0f5f9e',
      COR_ESCURA: t.primaryDark || '#0a3f6d',
      COR_DESTAQUE: t.accent || '#f3c04a'
    };
    return svgText.replace(/\{\{(\w+)\}\}/g, function (all, key) {
      return Object.prototype.hasOwnProperty.call(map, key) ? escapeXml(map[key]) : all;
    });
  }

  function loadFrame(frame) {
    if (!/\.svg(\?|$)/i.test(frame.src)) {
      return loadImageElement(frame.src);
    }
    return fetch(frame.src)
      .then(function (res) {
        if (!res.ok) { throw new Error('HTTP ' + res.status); }
        return res.text();
      })
      .then(function (text) {
        var blob = new Blob([fillTemplate(text)], { type: 'image/svg+xml;charset=utf-8' });
        return loadImageElement(URL.createObjectURL(blob));
      })
      .catch(function () {
        // Sem servidor (file://) o fetch falha: carrega o SVG cru como fallback.
        return loadImageElement(frame.src);
      });
  }

  function buildFrames() {
    var frames = (CFG.frames || []).slice();
    if (!frames.length) {
      setStatus('Nenhuma moldura configurada em js/config.js.', true);
      return Promise.resolve();
    }

    el.frames.innerHTML = '';

    return Promise.all(frames.map(function (frame, index) {
      return loadFrame(frame).then(function (img) {
        frame._img = img;

        var btn = document.createElement('button');
        btn.type = 'button';
        btn.className = 'frame';
        btn.setAttribute('role', 'radio');
        btn.setAttribute('aria-checked', index === 0 ? 'true' : 'false');
        btn.setAttribute('aria-label', 'Selecionar ' + (frame.label || 'moldura ' + (index + 1)));

        var thumb = new Image();
        thumb.src = img.src;
        thumb.alt = '';
        btn.appendChild(thumb);

        var caption = document.createElement('span');
        caption.textContent = frame.label || 'Moldura ' + (index + 1);
        btn.appendChild(caption);

        var check = document.createElement('span');
        check.className = 'frame__check';
        check.setAttribute('aria-hidden', 'true');
        check.textContent = '✓';
        btn.appendChild(check);

        btn.addEventListener('click', function () { selectFrame(index); });

        frame._btn = btn;
        return frame;
      }).catch(function (err) {
        console.error(err);
        return null;
      });
    })).then(function (loaded) {
      loaded.forEach(function (frame) {
        if (frame && frame._btn) { el.frames.appendChild(frame._btn); }
      });
      var first = loaded.findIndex(function (f) { return f && f._img; });
      if (first >= 0) { selectFrame(first); }
      else { setStatus('As molduras não puderam ser carregadas.', true); }
    });
  }

  function selectFrame(index) {
    var frames = CFG.frames || [];
    var frame = frames[index];
    if (!frame || !frame._img) { return; }

    state.frameIndex = index;
    state.frame = frame._img;

    frames.forEach(function (f, i) {
      if (f._btn) { f._btn.setAttribute('aria-checked', i === index ? 'true' : 'false'); }
    });

    schedulePaint();
  }

  // ---------------------------------------------------------------------------
  // Enquadramento e desenho
  // ---------------------------------------------------------------------------

  function coverScale() {
    if (!state.image) { return 1; }
    return Math.max(S / state.image.width, S / state.image.height);
  }

  function drawSize() {
    var k = coverScale() * state.zoom;
    return { w: state.image.width * k, h: state.image.height * k };
  }

  function clampOffsets() {
    if (!state.image) { return; }
    var d = drawSize();
    state.x = clamp(state.x, S - d.w, 0);
    state.y = clamp(state.y, S - d.h, 0);
  }

  function centerImage() {
    if (!state.image) { return; }
    var d = drawSize();
    state.x = (S - d.w) / 2;
    state.y = (S - d.h) / 2;
  }

  function setZoom(zoom, anchorX, anchorY) {
    if (!state.image) { return; }
    var next = clamp(zoom, 1, MAX_ZOOM);
    if (next === state.zoom) { return; }

    var ax = anchorX == null ? S / 2 : anchorX;
    var ay = anchorY == null ? S / 2 : anchorY;
    var ratio = next / state.zoom;

    state.x = ax - (ax - state.x) * ratio;
    state.y = ay - (ay - state.y) * ratio;
    state.zoom = next;

    clampOffsets();
    syncZoomUI();
    schedulePaint();
  }

  function syncZoomUI() {
    var percent = Math.round(state.zoom * 100);
    el.zoom.value = String(percent);
    el.zoomValue.textContent = percent + '%';
  }

  function paint(target, size) {
    target.clearRect(0, 0, size, size);
    var f = size / S;

    if (state.image) {
      var d = drawSize();
      target.imageSmoothingEnabled = true;
      target.imageSmoothingQuality = 'high';
      target.drawImage(state.image, state.x * f, state.y * f, d.w * f, d.h * f);
    }
    if (state.frame) {
      target.drawImage(state.frame, 0, 0, size, size);
    }
  }

  var paintQueued = false;

  function schedulePaint() {
    if (paintQueued) { return; }
    paintQueued = true;
    requestAnimationFrame(function () {
      paintQueued = false;
      resizeCanvas();
      paint(ctx, el.canvas.width);
    });
  }

  function resizeCanvas() {
    var rect = el.canvas.getBoundingClientRect();
    var dpr = Math.min(window.devicePixelRatio || 1, 2);
    var size = Math.max(1, Math.round(Math.min(rect.width, S) * dpr));
    if (el.canvas.width !== size) {
      el.canvas.width = size;
      el.canvas.height = size;
    }
  }

  // ---------------------------------------------------------------------------
  // Carregar a foto do usuário
  // ---------------------------------------------------------------------------

  var ACCEPTED = ['image/jpeg', 'image/png', 'image/webp'];

  function handleFile(file) {
    if (!file) { return; }

    if (ACCEPTED.indexOf(file.type) === -1) {
      setStatus('Formato não suportado. Use JPG, PNG ou WEBP.', true);
      return;
    }
    if (file.size > MAX_FILE_MB * 1024 * 1024) {
      setStatus('A imagem tem mais de ' + MAX_FILE_MB + ' MB. Escolha um arquivo menor.', true);
      return;
    }

    setStatus('');
    el.loading.hidden = false;

    decode(file).then(function (image) {
      state.image = image;
      state.zoom = 1;
      centerImage();
      clampOffsets();

      el.stage.classList.add('is-ready');
      el.controls.hidden = false;
      el.dragHint.hidden = false;
      el.downloadBtn.disabled = false;
      el.pickBtn.textContent = 'Trocar minha foto';
      if (canShareFiles()) { el.shareBtn.hidden = false; }

      syncZoomUI();
      schedulePaint();
    }).catch(function (err) {
      console.error(err);
      setStatus('Não foi possível abrir esta imagem. Tente outra foto.', true);
    }).then(function () {
      el.loading.hidden = true;
    });
  }

  function decode(file) {
    if (window.createImageBitmap) {
      // imageOrientation corrige fotos de celular giradas pelo EXIF.
      return createImageBitmap(file, { imageOrientation: 'from-image' })
        .catch(function () { return createImageBitmap(file); })
        .catch(function () { return decodeWithImg(file); });
    }
    return decodeWithImg(file);
  }

  function decodeWithImg(file) {
    var url = URL.createObjectURL(file);
    return loadImageElement(url).then(function (img) {
      return img;
    }).catch(function (err) {
      URL.revokeObjectURL(url);
      throw err;
    });
  }

  // ---------------------------------------------------------------------------
  // Interação: arrastar, pinça e roda do mouse
  // ---------------------------------------------------------------------------

  var pointers = new Map();
  var pinchStart = null;

  function toCanvasUnits(px) {
    var rect = el.canvas.getBoundingClientRect();
    return px * (S / (rect.width || 1));
  }

  function pointerCenter() {
    var list = Array.from(pointers.values());
    var sx = 0, sy = 0;
    list.forEach(function (p) { sx += p.x; sy += p.y; });
    return { x: sx / list.length, y: sy / list.length };
  }

  function pointerDistance() {
    var list = Array.from(pointers.values());
    var dx = list[0].x - list[1].x;
    var dy = list[0].y - list[1].y;
    return Math.hypot(dx, dy);
  }

  el.canvas.addEventListener('pointerdown', function (ev) {
    if (!state.image) { return; }
    try { el.canvas.setPointerCapture(ev.pointerId); } catch (err) { /* ponteiro já liberado */ }
    pointers.set(ev.pointerId, { x: ev.clientX, y: ev.clientY });
    el.stage.classList.add('is-dragging');
    if (pointers.size === 2) {
      pinchStart = { dist: pointerDistance(), zoom: state.zoom };
    }
  });

  el.canvas.addEventListener('pointermove', function (ev) {
    if (!state.image || !pointers.has(ev.pointerId)) { return; }

    var prev = pointers.get(ev.pointerId);
    pointers.set(ev.pointerId, { x: ev.clientX, y: ev.clientY });

    if (pointers.size === 1) {
      state.x += toCanvasUnits(ev.clientX - prev.x);
      state.y += toCanvasUnits(ev.clientY - prev.y);
      clampOffsets();
      schedulePaint();
      return;
    }

    if (pointers.size === 2 && pinchStart) {
      var dist = pointerDistance();
      if (pinchStart.dist > 0) {
        var mid = pointerCenter();
        var rect = el.canvas.getBoundingClientRect();
        setZoom(
          pinchStart.zoom * (dist / pinchStart.dist),
          toCanvasUnits(mid.x - rect.left),
          toCanvasUnits(mid.y - rect.top)
        );
      }
    }
  });

  ['pointerup', 'pointercancel', 'pointerleave'].forEach(function (type) {
    el.canvas.addEventListener(type, function (ev) {
      pointers.delete(ev.pointerId);
      if (pointers.size < 2) { pinchStart = null; }
      if (pointers.size === 0) { el.stage.classList.remove('is-dragging'); }
    });
  });

  el.canvas.addEventListener('wheel', function (ev) {
    if (!state.image) { return; }
    ev.preventDefault();
    var rect = el.canvas.getBoundingClientRect();
    var factor = Math.exp(-ev.deltaY * 0.0015);
    setZoom(
      state.zoom * factor,
      toCanvasUnits(ev.clientX - rect.left),
      toCanvasUnits(ev.clientY - rect.top)
    );
  }, { passive: false });

  // Arrastar um arquivo direto para a prévia
  ['dragenter', 'dragover'].forEach(function (type) {
    el.stage.addEventListener(type, function (ev) {
      ev.preventDefault();
      el.stage.classList.add('is-dragover');
    });
  });

  ['dragleave', 'drop'].forEach(function (type) {
    el.stage.addEventListener(type, function (ev) {
      ev.preventDefault();
      el.stage.classList.remove('is-dragover');
    });
  });

  el.stage.addEventListener('drop', function (ev) {
    var file = ev.dataTransfer && ev.dataTransfer.files && ev.dataTransfer.files[0];
    if (file) { handleFile(file); }
  });

  // Colar uma imagem (Ctrl+V)
  window.addEventListener('paste', function (ev) {
    var items = ev.clipboardData && ev.clipboardData.files;
    if (items && items.length) { handleFile(items[0]); }
  });

  // ---------------------------------------------------------------------------
  // Controles
  // ---------------------------------------------------------------------------

  el.pickBtn.addEventListener('click', function () { el.fileInput.click(); });

  el.stage.addEventListener('click', function () {
    if (!state.image) { el.fileInput.click(); }
  });

  el.fileInput.addEventListener('change', function (ev) {
    handleFile(ev.target.files && ev.target.files[0]);
    ev.target.value = '';
  });

  el.zoom.addEventListener('input', function (ev) {
    setZoom(Number(ev.target.value) / 100);
  });

  el.centerBtn.addEventListener('click', function () {
    centerImage();
    clampOffsets();
    schedulePaint();
  });

  el.resetBtn.addEventListener('click', function () {
    state.zoom = 1;
    centerImage();
    clampOffsets();
    syncZoomUI();
    schedulePaint();
    setStatus('');
  });

  window.addEventListener('resize', schedulePaint);

  // ---------------------------------------------------------------------------
  // Exportar
  // ---------------------------------------------------------------------------

  function renderExport() {
    var canvas = document.createElement('canvas');
    canvas.width = S;
    canvas.height = S;
    paint(canvas.getContext('2d'), S);
    return canvas;
  }

  function toBlob(canvas) {
    return new Promise(function (resolve, reject) {
      try {
        canvas.toBlob(function (blob) {
          if (blob) { resolve(blob); } else { reject(new Error('toBlob vazio')); }
        }, EXPORT.mime || 'image/png');
      } catch (err) {
        reject(err);
      }
    });
  }

  function exportBlob() {
    return toBlob(renderExport()).catch(function (err) {
      if (err && err.name === 'SecurityError') {
        throw new Error('local');
      }
      throw err;
    });
  }

  function filename() {
    return EXPORT.filename || 'foto-de-apoio.png';
  }

  el.downloadBtn.addEventListener('click', function () {
    if (!state.image) { return; }
    setStatus('Preparando sua imagem…');

    exportBlob().then(function (blob) {
      var url = URL.createObjectURL(blob);
      var link = document.createElement('a');
      link.href = url;
      link.download = filename();
      document.body.appendChild(link);
      link.click();
      link.remove();
      setTimeout(function () { URL.revokeObjectURL(url); }, 10000);
      setStatus('Pronto! Sua imagem foi baixada.');
    }).catch(reportExportError);
  });

  function canShareFiles() {
    if (!navigator.canShare || !navigator.share || typeof File === 'undefined') { return false; }
    try {
      return navigator.canShare({
        files: [new File([new Blob()], filename(), { type: EXPORT.mime || 'image/png' })]
      });
    } catch (err) {
      return false;
    }
  }

  el.shareBtn.addEventListener('click', function () {
    if (!state.image) { return; }
    setStatus('Preparando sua imagem…');

    exportBlob().then(function (blob) {
      var file = new File([blob], filename(), { type: blob.type });
      return navigator.share({
        files: [file],
        title: pick('meta.title', 'Minha foto de apoio')
      });
    }).then(function () {
      setStatus('');
    }).catch(function (err) {
      if (err && err.name === 'AbortError') { setStatus(''); return; }
      reportExportError(err);
    });
  });

  function reportExportError(err) {
    console.error(err);
    if (err && err.message === 'local') {
      setStatus('Abra o site por um servidor (http://) para conseguir baixar a imagem.', true);
      return;
    }
    setStatus('Não foi possível gerar a imagem. Tente novamente.', true);
  }

  function setStatus(message, isError) {
    el.status.textContent = message || '';
    el.status.classList.toggle('is-error', !!isError);
  }

  // ---------------------------------------------------------------------------
  // Início
  // ---------------------------------------------------------------------------

  applyTheme();
  applyMeta();
  applyTexts();
  syncZoomUI();
  buildFrames().then(schedulePaint);
})();
