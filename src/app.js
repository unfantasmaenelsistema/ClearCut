/**
 * ClearCut — interfaz.
 * Cola secuencial de imágenes, recorte con @imgly/background-removal (ISNet en
 * ONNX Runtime Web, dentro del navegador) y composición final en canvas.
 */
import { removeBackground } from '@imgly/background-removal';
import JSZip from 'jszip';
import * as core from './core.js';
import * as historyDb from './history-db.js';
import './styles.css';

const LOGO_URL = new URL('logo.png', document.baseURI).href;
const PREFS_KEY = 'clearcut_prefs_v2';

// --- Estado ---
const state = {
  queue: [],
  selectedIndex: -1,
  isQueueRunning: false,
  cancelRequested: false,

  // Fondo (común a todo el lote)
  bgType: 'transparent', // 'transparent' | 'color' | 'gradient' | 'image'
  solidColor: '#FFFFFF',
  gradientStr: 'linear-gradient(135deg, #f6d365 0%, #fda085 100%)',
  bgBlur: 0,
  customBgImg: null,
  customBgUrl: null,

  // Visor
  splitRatio: 0.5,
  viewMode: 'split', // 'split' | 'final'
  showingOriginal: false,
  zoom: 1,
  isDraggingSplit: false,

  // Exportación
  exportScale: 1,
  exportFormat: 'image/png',
  exportQuality: 0.92,

  // Motor y preferencias (se recuerdan en este navegador)
  prefs: { model: 'isnet_fp16', useGpu: true, history: true, theme: 'dark' },
};

const $ = (id) => document.getElementById(id);
const dom = {
  compatAlert: $('compatAlert'),
  uploadSection: $('uploadSection'),
  batchProgressSection: $('batchProgressSection'),
  editorSection: $('editorSection'),

  dropzone: $('dropzone'),
  fileInput: $('fileInput'),
  browseBtn: $('browseBtn'),
  sampleBatchBtn: $('sampleBatchBtn'),
  modelSelect: $('modelSelect'),
  gpuToggle: $('gpuToggle'),
  gpuHint: $('gpuHint'),
  historyToggle: $('historyToggle'),

  batchProgressMainTitle: $('batchProgressMainTitle'),
  batchProgressSubtitle: $('batchProgressSubtitle'),
  cancelQueueBtn: $('cancelQueueBtn'),
  cumulativeBarTitle: $('cumulativeBarTitle'),
  cumulativePercentLabel: $('cumulativePercentLabel'),
  cumulativeBarFill: $('cumulativeBarFill'),
  currentItemName: $('currentItemName'),
  currentItemPercent: $('currentItemPercent'),
  currentItemFill: $('currentItemFill'),
  batchQueueGrid: $('batchQueueGrid'),

  queueStatsBadge: $('queueStatsBadge'),
  queueStripScroll: $('queueStripScroll'),
  batchDownloadZipBtn: $('batchDownloadZipBtn'),
  addMoreFilesBtn: $('addMoreFilesBtn'),
  addMoreFileInput: $('addMoreFileInput'),
  resetBtn: $('resetBtn'),
  imgDimensionsText: $('imgDimensionsText'),
  inferenceTimeText: $('inferenceTimeText'),
  currentFileNameText: $('currentFileNameText'),
  quickToggleOriginalBtn: $('quickToggleOriginalBtn'),

  viewerStage: $('viewerStage'),
  zoomWrapper: $('zoomWrapper'),
  previewCanvas: $('previewCanvas'),
  originalCanvas: $('originalCanvas'),
  originalSplitLayer: $('originalSplitLayer'),
  splitSliderLine: $('splitSliderLine'),
  badgeBefore: $('badgeBefore'),
  badgeAfter: $('badgeAfter'),
  tabSplitView: $('tabSplitView'),
  tabFinalOnly: $('tabFinalOnly'),
  zoomInBtn: $('zoomInBtn'),
  zoomOutBtn: $('zoomOutBtn'),
  zoomResetBtn: $('zoomResetBtn'),
  zoomLabel: $('zoomLabel'),

  bgTypeBtns: document.querySelectorAll('.bg-type-btn'),
  bgPanels: {
    transparent: $('bgPanelTransparent'),
    color: $('bgPanelColor'),
    gradient: $('bgPanelGradient'),
    image: $('bgPanelImage'),
  },
  colorSwatches: document.querySelectorAll('.color-swatch-btn'),
  customColorPicker: $('customColorPicker'),
  customColorHex: $('customColorHex'),
  gradientSwatches: document.querySelectorAll('.gradient-swatch-btn'),
  customBgDropzone: $('customBgDropzone'),
  customBgFileInput: $('customBgFileInput'),
  customBgPreviewRow: $('customBgPreviewRow'),
  customBgThumb: $('customBgThumb'),
  removeCustomBgBtn: $('removeCustomBgBtn'),
  bgBlurInput: $('bgBlurInput'),
  blurVal: $('blurVal'),

  resetAdjustmentsBtn: $('resetAdjustmentsBtn'),
  shadowToggle: $('shadowToggle'),
  shadowBadge: $('shadowBadge'),
  shadowCard: $('shadowCard'),
  shadowControlsWrap: $('shadowControlsWrap'),
  shadowColorPicker: $('shadowColorPicker'),
  shadowColorHex: $('shadowColorHex'),
  stickerToggle: $('stickerToggle'),
  stickerBadge: $('stickerBadge'),
  stickerCard: $('stickerCard'),
  stickerControlsWrap: $('stickerControlsWrap'),
  stickerColorPicker: $('stickerColorPicker'),
  stickerColorHex: $('stickerColorHex'),
  resetEffectsBtn: $('resetEffectsBtn'),

  flipHBtn: $('flipHBtn'),
  flipVBtn: $('flipVBtn'),
  rotateBtn: $('rotateBtn'),
  resetTransformBtn: $('resetTransformBtn'),
  aspectPillBtns: document.querySelectorAll('.aspect-pill-btn'),
  applyToAllBatchBtn: $('applyToAllBatchBtn'),

  scalePillBtns: document.querySelectorAll('.scale-pill-btn'),
  exportScaleVal: $('exportScaleVal'),
  estDimensions: $('estDimensions'),
  estFileSize: $('estFileSize'),
  jpgFillHint: $('jpgFillHint'),

  shortcutsModalBtn: $('shortcutsModalBtn'),
  shortcutsModal: $('shortcutsModal'),
  closeShortcutsBtn: $('closeShortcutsBtn'),

  formatPngBtn: $('formatPngBtn'),
  formatJpgBtn: $('formatJpgBtn'),
  jpgQualityRow: $('jpgQualityRow'),
  jpgQualityInput: $('jpgQualityInput'),
  jpgQualityVal: $('jpgQualityVal'),
  downloadBtn: $('downloadBtn'),
  copyClipboardBtn: $('copyClipboardBtn'),

  historyBar: $('historyBar'),
  historyGrid: $('historyGrid'),
  clearHistoryBtn: $('clearHistoryBtn'),
  viewHistoryFromEditorBtn: $('viewHistoryFromEditorBtn'),

  brandLink: $('brandLink'),
  themeToggleBtn: $('themeToggleBtn'),
  themeIconSun: $('themeIconSun'),
  themeIconMoon: $('themeIconMoon'),
  toastContainer: $('toastContainer'),
};

// --- Utilidades DOM (sin innerHTML con datos del usuario) ---
function el(tag, props = {}, children = []) {
  const node = document.createElement(tag);
  for (const [k, v] of Object.entries(props)) {
    if (v == null) continue;
    if (k === 'class') node.className = v;
    else if (k === 'text') node.textContent = v;
    else if (k === 'style') node.style.cssText = v;
    else if (k.startsWith('on')) node.addEventListener(k.slice(2), v);
    else node.setAttribute(k, v);
  }
  for (const c of [].concat(children)) if (c) node.append(c);
  return node;
}

const SVG_NS = 'http://www.w3.org/2000/svg';
const ICONS = {
  success: [['polyline', { points: '20 6 9 17 4 12' }]],
  error: [['circle', { cx: 12, cy: 12, r: 10 }], ['line', { x1: 12, y1: 8, x2: 12, y2: 12 }], ['line', { x1: 12, y1: 16, x2: 12.01, y2: 16 }]],
  info: [['circle', { cx: 12, cy: 12, r: 10 }], ['line', { x1: 12, y1: 16, x2: 12, y2: 12 }], ['line', { x1: 12, y1: 8, x2: 12.01, y2: 8 }]],
  close: [['line', { x1: 18, y1: 6, x2: 6, y2: 18 }], ['line', { x1: 6, y1: 6, x2: 18, y2: 18 }]],
};
function icon(name, size = 18, width = 2.5) {
  const svg = document.createElementNS(SVG_NS, 'svg');
  for (const [k, v] of Object.entries({ width: size, height: size, viewBox: '0 0 24 24', fill: 'none', stroke: 'currentColor', 'stroke-width': width })) svg.setAttribute(k, v);
  for (const [tag, attrs] of ICONS[name]) {
    const s = document.createElementNS(SVG_NS, tag);
    for (const [k, v] of Object.entries(attrs)) s.setAttribute(k, v);
    svg.append(s);
  }
  return svg;
}

function showToast(message, type = 'info', duration = 3500) {
  const toast = el('div', { class: `toast ${type}`, role: type === 'error' ? 'alert' : 'status' }, [icon(type), el('span', { text: message })]);
  dom.toastContainer.append(toast);
  setTimeout(() => {
    toast.style.transition = 'all 0.3s ease';
    toast.style.opacity = '0';
    toast.style.transform = 'translateY(8px)';
    setTimeout(() => toast.remove(), 300);
  }, duration);
}

function showView(name) {
  dom.uploadSection.style.display = name === 'upload' ? 'block' : 'none';
  dom.batchProgressSection.style.display = name === 'progress' ? 'block' : 'none';
  dom.editorSection.style.display = name === 'editor' ? 'flex' : 'none';
  if (name === 'upload') renderHistoryUI();
}

// --- Preferencias ---
function loadPrefs() {
  try {
    const saved = JSON.parse(localStorage.getItem(PREFS_KEY) || '{}');
    if (saved && typeof saved === 'object') Object.assign(state.prefs, saved);
  } catch { /* preferencias por defecto */ }
  if (!core.MODELS[state.prefs.model]) state.prefs.model = 'isnet_fp16';
}
function savePrefs() {
  try { localStorage.setItem(PREFS_KEY, JSON.stringify(state.prefs)); } catch { /* modo privado */ }
}

function checkBrowserCompatibility() {
  const ok = typeof WebAssembly === 'object' && typeof WebAssembly.instantiate === 'function' && typeof Worker !== 'undefined';
  if (!ok) dom.compatAlert.style.display = 'flex';
  return ok;
}

// --- Tema ---
function applyTheme(theme) {
  const light = theme === 'light';
  document.documentElement.classList.toggle('light', light);
  document.documentElement.classList.toggle('dark', !light);
  dom.themeIconSun.classList.toggle('hidden', light);
  dom.themeIconMoon.classList.toggle('hidden', !light);
  state.prefs.theme = theme;
  savePrefs();
}
function initTheme() {
  applyTheme(state.prefs.theme === 'light' ? 'light' : 'dark');
  dom.themeToggleBtn.addEventListener('click', () => {
    applyTheme(document.documentElement.classList.contains('light') ? 'dark' : 'light');
  });
}

// --- Memoria ---
function clearItemUrls(item) {
  for (const k of ['originalUrl', 'cutoutUrl']) {
    if (item[k]) URL.revokeObjectURL(item[k]);
    item[k] = null;
  }
  item.silhouette = null;
}
function clearEntireQueue() {
  state.queue.forEach(clearItemUrls);
  state.queue = [];
  state.selectedIndex = -1;
}

// --- Motor de IA ---
// imgly memoriza la sesión por configuración y conserva el callback `progress`
// de la PRIMERA llamada; por eso el callback es fijo y delega en este puntero.
let progressSink = () => {};
const engineConfig = (device) => ({
  model: state.prefs.model,
  device,
  output: { format: 'image/png', quality: 1 },
  progress: (key, current, total) => progressSink(key, current, total),
});
let gpuFailed = false;

async function cutOut(file) {
  const wantGpu = state.prefs.useGpu && !gpuFailed && 'gpu' in navigator;
  if (wantGpu) {
    try {
      return await removeBackground(file, engineConfig('gpu'));
    } catch (err) {
      console.warn('WebGPU no disponible, se usa la CPU:', err);
      gpuFailed = true;
      showToast('La GPU no ha podido ejecutar el modelo; se sigue con la CPU', 'info', 4500);
    }
  }
  return removeBackground(file, engineConfig('cpu'));
}

function initEngineControls() {
  dom.modelSelect.value = state.prefs.model;
  dom.gpuToggle.checked = !!state.prefs.useGpu;
  dom.historyToggle.checked = !!state.prefs.history;
  if (!('gpu' in navigator)) {
    dom.gpuToggle.checked = false;
    dom.gpuToggle.disabled = true;
    dom.gpuHint.textContent = 'Este navegador no tiene WebGPU: se usará la CPU.';
  }
  dom.modelSelect.addEventListener('change', () => { state.prefs.model = dom.modelSelect.value; savePrefs(); });
  dom.gpuToggle.addEventListener('change', () => { state.prefs.useGpu = dom.gpuToggle.checked; gpuFailed = false; savePrefs(); });
  dom.historyToggle.addEventListener('change', async () => {
    state.prefs.history = dom.historyToggle.checked;
    savePrefs();
    if (!state.prefs.history) {
      await historyDb.clearHistory().catch(() => {});
      renderHistoryUI();
      showToast('Historial desactivado y vaciado', 'info', 2000);
    }
  });
}

// --- Historial (IndexedDB, resolución completa) ---
async function saveToHistory(item) {
  if (!state.prefs.history || !item.cutoutBlob) return;
  try {
    await historyDb.addHistory({
      id: item.id,
      name: item.name,
      timestamp: Date.now(),
      width: item.cutoutImg.naturalWidth,
      height: item.cutoutImg.naturalHeight,
      duration: item.duration,
      original: item.file,
      cutout: item.cutoutBlob,
    });
  } catch (err) {
    console.warn('No se pudo guardar en el historial local:', err);
  }
}

async function renderHistoryUI() {
  let history = [];
  try { history = state.prefs.history ? await historyDb.listHistory() : []; } catch { history = []; }
  for (const u of dom.historyGrid.querySelectorAll('img')) URL.revokeObjectURL(u.src);
  dom.historyGrid.replaceChildren();
  dom.historyBar.classList.toggle('hidden', history.length === 0);

  for (const entry of history) {
    const thumbUrl = URL.createObjectURL(entry.cutout);
    const time = new Date(entry.timestamp).toLocaleString('es-ES', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' });
    const del = el('button', { class: 'history-card-del', type: 'button', title: 'Eliminar del historial', 'aria-label': `Eliminar ${entry.name} del historial` }, [icon('close', 10, 3)]);
    del.addEventListener('click', async (e) => {
      e.stopPropagation();
      await historyDb.deleteHistory(entry.id).catch(() => {});
      renderHistoryUI();
    });
    const card = el('div', {
      class: 'history-card', role: 'button', tabindex: '0', title: `Abrir «${entry.name}» en el editor`,
      onclick: () => restoreFromHistory(entry),
      onkeydown: (e) => { if (e.key === 'Enter') restoreFromHistory(entry); },
    }, [
      el('div', { class: 'history-card-thumb-wrap checkerboard-bg' }, [el('img', { src: thumbUrl, class: 'history-card-thumb', alt: entry.name })]),
      el('div', { class: 'history-card-name', title: entry.name, text: entry.name }),
      el('div', { class: 'history-card-meta', text: `${entry.width} × ${entry.height} px` }),
      el('div', { class: 'history-card-meta', style: 'color:var(--text-subtle);', text: time }),
      del,
    ]);
    dom.historyGrid.append(card);
  }
}

async function restoreFromHistory(entry) {
  const existing = state.queue.findIndex((i) => i.id === entry.id);
  if (existing !== -1) {
    showView('editor');
    selectQueueItem(existing);
    return;
  }
  try {
    const item = newQueueItem(entry.original, entry.name, entry.id);
    item.originalImg = await loadImageElement(item.originalUrl);
    item.cutoutBlob = entry.cutout;
    item.cutoutUrl = URL.createObjectURL(entry.cutout);
    item.cutoutImg = await loadImageElement(item.cutoutUrl);
    item.status = 'done';
    item.progress = 100;
    item.duration = entry.duration;
    state.queue.push(item);
    showView('editor');
    selectQueueItem(state.queue.length - 1);
    showToast(`«${entry.name}» recuperada del historial`, 'success');
  } catch (err) {
    console.error('Error al recuperar desde historial:', err);
    showToast('No se pudo recuperar la imagen guardada', 'error');
  }
}

// --- Cola ---
let idCounter = 0;
function newQueueItem(file, name, id) {
  return {
    id: id || `item_${Date.now()}_${++idCounter}`,
    file,
    name,
    size: file.size || 0,
    status: 'pending', // 'pending' | 'processing' | 'done' | 'error'
    progress: 0,
    originalUrl: URL.createObjectURL(file),
    originalImg: null,
    cutoutBlob: null,
    cutoutUrl: null,
    cutoutImg: null,
    duration: 0,
    error: null,
    silhouette: null,
    ...structuredClone(core.DEFAULT_SETTINGS),
  };
}

function addFilesToQueue(fileList) {
  if (!checkBrowserCompatibility()) {
    showToast('Navegador incompatible con WebAssembly o Web Workers', 'error');
    return;
  }
  const items = [];
  for (const file of fileList) {
    if (!core.isSupportedImageType(file.type)) {
      showToast(`Omitido «${file.name || 'archivo'}»: solo JPG, PNG, WebP o AVIF`, 'error');
      continue;
    }
    items.push(newQueueItem(file, file.name || `imagen_${state.queue.length + items.length + 1}.png`));
  }
  if (!items.length) return;

  state.queue.push(...items);
  showToast(`${items.length} foto(s) añadidas a la cola`, 'info', 2000);
  if (!state.isQueueRunning) startQueueProcessing();
  else renderQueueProgressUI();
}

function describeProgress(key, current, total) {
  if (key.startsWith('fetch:/models')) return `Descargando el modelo: ${core.formatBytes(current)} de ${core.formatBytes(total)}`;
  if (key.startsWith('fetch:')) return `Descargando ONNX Runtime: ${core.formatBytes(current)} de ${core.formatBytes(total)}`;
  return {
    'compute:decode': 'Leyendo la imagen',
    'compute:inference': 'Calculando la máscara',
    'compute:mask': 'Aplicando la máscara',
    'compute:encode': 'Generando el PNG',
  }[key] || 'Procesando';
}

async function startQueueProcessing() {
  if (state.isQueueRunning) return;
  state.isQueueRunning = true;
  state.cancelRequested = false;
  showView('progress');
  renderQueueProgressUI();

  while (!state.cancelRequested) {
    const idx = state.queue.findIndex((i) => i.status === 'pending');
    if (idx === -1) break;
    const item = state.queue[idx];
    item.status = 'processing';
    item.progress = 0;
    renderQueueProgressUI();
    setCurrentBar(`${item.name} — Preparando`, 0);

    progressSink = (key, current, total) => {
      const pct = total > 0 ? Math.round((current / total) * 100) : 0;
      item.progress = pct;
      setCurrentBar(`${item.name} — ${describeProgress(key, current, total)}`, pct);
      updateCumulativeBar(pct);
      const pill = dom.batchQueueGrid.children[idx]?.querySelector('.queue-item-status-pill');
      if (pill) pill.textContent = `${pct}%`;
    };

    const t0 = performance.now();
    try {
      item.originalImg = item.originalImg || (await loadImageElement(item.originalUrl));
      const blob = await cutOut(item.file);
      item.cutoutBlob = blob;
      item.cutoutUrl = URL.createObjectURL(blob);
      item.cutoutImg = await loadImageElement(item.cutoutUrl);
      item.status = 'done';
      item.progress = 100;
      item.duration = ((performance.now() - t0) / 1000).toFixed(1);
      saveToHistory(item);
    } catch (err) {
      console.error(`Error procesando ${item.name}:`, err);
      item.status = 'error';
      item.error = err?.message || 'Error de procesamiento';
    }
    progressSink = () => {};
    renderQueueProgressUI();
  }

  state.isQueueRunning = false;
  const done = state.queue.filter((i) => i.status === 'done').length;
  const failed = state.queue.filter((i) => i.status === 'error').length;
  const pending = state.queue.filter((i) => i.status === 'pending').length;

  if (done === 0) {
    const reason = state.queue.find((i) => i.error)?.error;
    showToast(state.cancelRequested ? 'Cola detenida antes de terminar ninguna imagen'
      : `No se pudo recortar ninguna imagen${reason ? `: ${reason}` : ''}`, 'error', 6000);
    clearEntireQueue();
    showView('upload');
    return;
  }

  const parts = [`${done} de ${state.queue.length} listas`];
  if (failed) parts.push(`${failed} con error`);
  if (pending) parts.push(`${pending} sin procesar (cola detenida)`);
  showToast(`Lote terminado: ${parts.join(', ')}`, failed ? 'info' : 'success', 5000);

  if (state.selectedIndex === -1 || state.queue[state.selectedIndex]?.status !== 'done') {
    selectQueueItem(state.queue.findIndex((i) => i.status === 'done'));
  }
  showView('editor');
  renderQueueStrip();
  renderPreview();
}

function setCurrentBar(text, pct) {
  dom.currentItemName.textContent = text;
  dom.currentItemPercent.textContent = `${pct}%`;
  dom.currentItemFill.style.width = `${pct}%`;
}

function updateCumulativeBar(currentPct = 0) {
  const total = state.queue.length;
  const overall = core.overallProgress(state.queue, currentPct);
  const done = state.queue.filter((i) => i.status === 'done').length;
  const processing = state.queue.findIndex((i) => i.status === 'processing');
  const pos = processing !== -1 ? processing + 1 : done;
  dom.cumulativeBarTitle.textContent = `Progreso: ${done} de ${total} listas (procesando ${pos}/${total})`;
  dom.cumulativePercentLabel.textContent = `${overall}%`;
  dom.cumulativeBarFill.style.width = `${overall}%`;
  dom.batchProgressMainTitle.textContent = `Procesando lote: ${done}/${total} fotos listas`;
  dom.batchProgressSubtitle.textContent = `Una imagen cada vez para no agotar la memoria · ${overall}% del total`;
}

const STATUS_LABEL = { pending: 'En cola', processing: '', done: 'Lista ✓', error: 'Error ✕' };
const STATUS_CLASS = { pending: 'status-pending', processing: 'status-processing', done: 'status-done', error: 'status-error' };

function thumbOf(item) {
  return item.status === 'done' && item.cutoutUrl ? item.cutoutUrl : item.originalUrl;
}

function renderQueueProgressUI() {
  const nodes = state.queue.map((item) => el('div', { class: `queue-preview-item ${item.status === 'processing' ? 'active' : ''}`, title: item.error || item.name }, [
    el('img', { src: thumbOf(item), class: `queue-item-thumb ${item.status === 'done' ? 'checkerboard-bg' : ''}`, alt: item.name }),
    el('div', { class: 'queue-item-name', title: item.name, text: item.name }),
    el('div', { class: `queue-item-status-pill ${STATUS_CLASS[item.status]}`, text: item.status === 'processing' ? `${item.progress}%` : STATUS_LABEL[item.status] }),
  ]));
  dom.batchQueueGrid.replaceChildren(...nodes);
  updateCumulativeBar(state.queue.find((i) => i.status === 'processing')?.progress || 0);
}

const DOT_COLOR = { pending: '#94a3b8', processing: '#6366f1', done: '#10b981', error: '#ef4444' };

function renderQueueStrip() {
  const done = state.queue.filter((i) => i.status === 'done').length;
  dom.queueStatsBadge.textContent = `${done} de ${state.queue.length} fotos listas`;
  const nodes = state.queue.map((item, idx) => el('button', {
    type: 'button',
    class: `queue-strip-item ${idx === state.selectedIndex ? 'selected' : ''}`,
    title: item.status === 'error' ? `${item.name}: ${item.error}` : item.name,
    'aria-label': item.name,
    onclick: () => {
      if (item.status === 'done') selectQueueItem(idx);
      else if (item.status === 'error') showToast(`«${item.name}» falló: ${item.error}`, 'error', 5000);
      else showToast(`«${item.name}» está ${item.status === 'processing' ? 'procesándose' : 'en espera'}`, 'info');
    },
  }, [
    el('img', { src: thumbOf(item), class: item.status === 'done' ? 'checkerboard-bg' : '', alt: '' }),
    el('div', { class: 'queue-strip-status-dot', style: `background-color:${DOT_COLOR[item.status]};` }),
  ]));
  dom.queueStripScroll.replaceChildren(...nodes);
}

// --- Composición en canvas ---
function applyBackground(ctx, w, h, opaqueFill) {
  if (state.bgType === 'color') {
    ctx.fillStyle = state.solidColor;
    ctx.fillRect(0, 0, w, h);
  } else if (state.bgType === 'gradient') {
    ctx.fillStyle = canvasGradient(ctx, state.gradientStr, w, h);
    ctx.fillRect(0, 0, w, h);
  } else if (state.bgType === 'image' && state.customBgImg) {
    ctx.save();
    if (state.bgBlur > 0) {
      // El desenfoque se calcula sobre el tamaño final para que preview y export coincidan.
      ctx.filter = `blur(${Math.round(state.bgBlur * Math.max(w, h) / 1000)}px)`;
    }
    drawCoverImage(ctx, state.customBgImg, w, h);
    ctx.restore();
  } else if (opaqueFill) {
    ctx.fillStyle = '#FFFFFF';
    ctx.fillRect(0, 0, w, h);
  }
}

function canvasGradient(ctx, str, w, h) {
  const g = core.parseGradient(str);
  if (!g) return '#6366f1';
  let grad;
  if (g.type === 'radial') {
    grad = ctx.createRadialGradient(w / 2, h / 2, 0, w / 2, h / 2, core.radialGradientRadius(w, h));
  } else {
    const l = core.linearGradientLine(g.angle, w, h);
    grad = ctx.createLinearGradient(l.x0, l.y0, l.x1, l.y1);
  }
  g.stops.forEach((s) => grad.addColorStop(s.offset, s.color));
  return grad;
}

function drawCoverImage(ctx, img, w, h) {
  const iw = img.naturalWidth || img.width;
  const ih = img.naturalHeight || img.height;
  const r = Math.max(w / iw, h / ih);
  ctx.drawImage(img, 0, 0, iw, ih, (w - iw * r) / 2, (h - ih * r) / 2, iw * r, ih * r);
}

/** Silueta de color del recorte, cacheada por imagen y color (el borde pegatina la estampa muchas veces). */
function silhouetteOf(item, color) {
  if (item.silhouette?.color === color) return item.silhouette.canvas;
  const img = item.cutoutImg;
  const c = document.createElement('canvas');
  c.width = img.naturalWidth;
  c.height = img.naturalHeight;
  const cx = c.getContext('2d');
  cx.drawImage(img, 0, 0);
  cx.globalCompositeOperation = 'source-in';
  cx.fillStyle = color;
  cx.fillRect(0, 0, c.width, c.height);
  item.silhouette = { color, canvas: c };
  return c;
}

function withTransform(ctx, item, w, h, fn) {
  ctx.save();
  ctx.translate(w / 2, h / 2);
  if (item.rotation) ctx.rotate((item.rotation * Math.PI) / 180);
  ctx.scale(item.flipH ? -1 : 1, item.flipV ? -1 : 1);
  fn();
  ctx.restore();
}

/** Recorte ya girado/volteado, con borde pegatina y ajustes de color, en una capa del tamaño del lienzo. */
function subjectLayer(item, w, h, scale) {
  const img = item.cutoutImg;
  const { drawW, drawH } = core.computeComposition(img.naturalWidth, img.naturalHeight, item, scale);
  const layer = document.createElement('canvas');
  layer.width = w;
  layer.height = h;
  const l = layer.getContext('2d');
  const x = -drawW / 2;
  const y = -drawH / 2;
  withTransform(l, item, w, h, () => {
    if (item.stickerEnabled && item.stickerWidth > 0) {
      const sil = silhouetteOf(item, item.stickerColor);
      const radius = Math.max(1, Math.round(item.stickerWidth * scale));
      // Más ángulos cuanto más grueso el borde, para que no queden huecos.
      const steps = Math.max(16, Math.ceil(radius * 1.5));
      for (let r = Math.min(2, radius); r <= radius; r += Math.max(1, radius / 6)) {
        for (let i = 0; i < steps; i++) {
          const a = (i / steps) * Math.PI * 2;
          l.drawImage(sil, x + Math.cos(a) * r, y + Math.sin(a) * r, drawW, drawH);
        }
      }
    }
    const { brightness: br, contrast: co, saturation: sa } = item;
    if (br !== 100 || co !== 100 || sa !== 100) l.filter = `brightness(${br}%) contrast(${co}%) saturate(${sa}%)`;
    l.drawImage(img, x, y, drawW, drawH);
  });
  return layer;
}

/** Fondo → sombra → borde → recorte. La sombra sale de la capa entera, borde incluido. */
function drawComposition(canvas, item, scale = 1, { opaqueFill = false } = {}) {
  const img = item.cutoutImg;
  const { width: w, height: h } = core.computeComposition(img.naturalWidth, img.naturalHeight, item, scale);
  canvas.width = w;
  canvas.height = h;
  const ctx = canvas.getContext('2d');
  ctx.clearRect(0, 0, w, h);
  applyBackground(ctx, w, h, opaqueFill);

  const layer = subjectLayer(item, w, h, scale);
  ctx.save();
  if (item.shadowEnabled && item.shadowOpacity > 0) {
    // En coordenadas del lienzo: la sombra cae hacia abajo aunque la imagen esté girada.
    const { r, g, b } = core.hexToRgb(item.shadowColor);
    ctx.shadowColor = `rgba(${r}, ${g}, ${b}, ${item.shadowOpacity / 100})`;
    ctx.shadowBlur = item.shadowBlur * scale;
    ctx.shadowOffsetY = item.shadowOffsetY * scale;
  }
  ctx.drawImage(layer, 0, 0);
  ctx.restore();
}

/** «Antes»: la foto original con el mismo giro, volteo y lienzo que el recorte, para que el comparador cuadre. */
function drawOriginal(canvas, item) {
  const img = item.originalImg;
  const cut = item.cutoutImg;
  const { width: w, height: h, drawW, drawH } = core.computeComposition(cut.naturalWidth, cut.naturalHeight, item, 1);
  canvas.width = w;
  canvas.height = h;
  const ctx = canvas.getContext('2d');
  ctx.clearRect(0, 0, w, h);
  withTransform(ctx, item, w, h, () => ctx.drawImage(img, -drawW / 2, -drawH / 2, drawW, drawH));
}

function renderItemToBlob(item, mime, quality, scale) {
  const c = document.createElement('canvas');
  drawComposition(c, item, scale, { opaqueFill: core.needsOpaqueFill(mime, state.bgType, !!state.customBgImg) });
  return new Promise((resolve) => c.toBlob(resolve, mime, quality));
}

let estTimer = null;
function updateEstimate() {
  const item = activeItem();
  if (!item) return;
  const dims = core.computeComposition(item.cutoutImg.naturalWidth, item.cutoutImg.naturalHeight, item, state.exportScale);
  dom.estDimensions.textContent = `${dims.width} × ${dims.height} px`;
  dom.jpgFillHint.classList.toggle('hidden', !core.needsOpaqueFill(state.exportFormat, state.bgType, !!state.customBgImg));
  clearTimeout(estTimer);
  estTimer = setTimeout(async () => {
    const blob = await renderItemToBlob(item, state.exportFormat, exportQuality(), state.exportScale);
    if (blob && item === activeItem()) dom.estFileSize.textContent = `~${core.formatBytes(blob.size)}`;
  }, 300);
}

const exportQuality = () => (state.exportFormat === 'image/png' ? 1 : state.exportQuality);
const activeItem = () => {
  const item = state.queue[state.selectedIndex];
  return item && item.status === 'done' && item.cutoutImg ? item : null;
};

let rafPending = false;
function renderPreview() {
  if (rafPending) return;
  rafPending = true;
  requestAnimationFrame(() => {
    rafPending = false;
    const item = activeItem();
    if (!item) return;
    drawComposition(dom.previewCanvas, item, 1);
    drawOriginal(dom.originalCanvas, item);
    dom.imgDimensionsText.textContent = `${dom.previewCanvas.width} × ${dom.previewCanvas.height} px`;
    updateEstimate();
  });
}

// --- Selección y sincronización de controles ---
const SLIDERS = [
  { key: 'brightness', input: 'brightnessInput', label: 'brightnessVal', unit: '%' },
  { key: 'contrast', input: 'contrastInput', label: 'contrastVal', unit: '%' },
  { key: 'saturation', input: 'saturationInput', label: 'saturationVal', unit: '%' },
  { key: 'shadowBlur', input: 'shadowBlurInput', label: 'shadowBlurVal', unit: 'px' },
  { key: 'shadowOffsetY', input: 'shadowOffsetYInput', label: 'shadowOffsetYVal', unit: 'px' },
  { key: 'shadowOpacity', input: 'shadowOpacityInput', label: 'shadowOpacityVal', unit: '%' },
  { key: 'stickerWidth', input: 'stickerWidthInput', label: 'stickerWidthVal', unit: 'px' },
];

function syncControls(item) {
  for (const s of SLIDERS) {
    $(s.input).value = item[s.key];
    $(s.label).textContent = `${item[s.key]}${s.unit}`;
  }
  setEffectUi('shadow', item.shadowEnabled, 'Activa', 'Inactiva');
  setEffectUi('sticker', item.stickerEnabled, 'Activo', 'Inactivo');
  dom.shadowColorPicker.value = item.shadowColor;
  dom.shadowColorHex.textContent = item.shadowColor.toUpperCase();
  dom.stickerColorPicker.value = item.stickerColor;
  dom.stickerColorHex.textContent = item.stickerColor.toUpperCase();
  dom.flipHBtn.classList.toggle('active', item.flipH);
  dom.flipVBtn.classList.toggle('active', item.flipV);
  dom.aspectPillBtns.forEach((b) => b.classList.toggle('active', b.dataset.aspect === item.aspectRatio));
}

function setEffectUi(name, on, onText, offText) {
  dom[`${name}Toggle`].checked = on;
  dom[`${name}Badge`].textContent = on ? onText : offText;
  dom[`${name}Badge`].classList.toggle('active', on);
  dom[`${name}Card`].classList.toggle('active', on);
  dom[`${name}ControlsWrap`].classList.toggle('hidden', !on);
}

function selectQueueItem(index) {
  const item = state.queue[index];
  if (!item || item.status !== 'done') return;
  state.selectedIndex = index;
  dom.currentFileNameText.textContent = item.name;
  dom.currentFileNameText.parentElement.title = item.name;
  dom.inferenceTimeText.textContent = `${item.duration}s`;
  syncControls(item);
  renderQueueStrip();
  renderPreview();
  updateSplitSlider(state.splitRatio);
}

/** Cambia un ajuste de la imagen activa y repinta. */
function setItem(key, value) {
  const item = activeItem();
  if (!item) return;
  item[key] = value;
  renderPreview();
}

// --- Comparador antes/después ---
function updateSplitSlider(ratio) {
  state.splitRatio = Math.max(0, Math.min(1, ratio));
  const pct = state.splitRatio * 100;
  dom.splitSliderLine.style.left = `${pct}%`;
  dom.originalSplitLayer.style.clipPath = `polygon(0 0, ${pct}% 0, ${pct}% 100%, 0 100%)`;
}

function applyViewMode() {
  const split = state.viewMode === 'split';
  const showOriginalLayer = split || state.showingOriginal;
  dom.tabSplitView.classList.toggle('active', split);
  dom.tabFinalOnly.classList.toggle('active', !split);
  dom.originalSplitLayer.style.display = showOriginalLayer ? 'flex' : 'none';
  dom.splitSliderLine.style.display = split && !state.showingOriginal ? 'flex' : 'none';
  dom.badgeBefore.style.display = split && !state.showingOriginal ? 'block' : 'none';
  dom.badgeAfter.style.display = split && !state.showingOriginal ? 'block' : 'none';
  dom.originalSplitLayer.style.clipPath = state.showingOriginal ? 'none' : `polygon(0 0, ${state.splitRatio * 100}% 0, ${state.splitRatio * 100}% 100%, 0 100%)`;
  dom.quickToggleOriginalBtn.querySelector('span').textContent = state.showingOriginal ? 'Ver recorte' : 'Ver original';
}

function initSplitEvents() {
  const stage = dom.viewerStage;
  const move = (clientX) => {
    const rect = stage.getBoundingClientRect();
    updateSplitSlider((clientX - rect.left) / rect.width);
  };
  const onMove = (e) => {
    if (!state.isDraggingSplit) return;
    const x = e.touches ? e.touches[0]?.clientX : e.clientX;
    if (x !== undefined) move(x);
  };
  const onUp = () => {
    setTimeout(() => { state.isDraggingSplit = false; }, 0);
    window.removeEventListener('pointermove', onMove);
    window.removeEventListener('pointerup', onUp);
  };
  dom.splitSliderLine.addEventListener('pointerdown', (e) => {
    e.preventDefault();
    state.isDraggingSplit = true;
    window.addEventListener('pointermove', onMove);
    window.addEventListener('pointerup', onUp);
  });
  stage.addEventListener('click', (e) => {
    if (state.viewMode !== 'split' || state.showingOriginal || state.isDraggingSplit) return;
    move(e.clientX);
  });

  dom.tabSplitView.addEventListener('click', () => { state.viewMode = 'split'; state.showingOriginal = false; updateSplitSlider(0.5); applyViewMode(); });
  dom.tabFinalOnly.addEventListener('click', () => { state.viewMode = 'final'; state.showingOriginal = false; applyViewMode(); });
  dom.quickToggleOriginalBtn.addEventListener('click', () => { state.showingOriginal = !state.showingOriginal; applyViewMode(); });

  dom.zoomInBtn.addEventListener('click', () => setZoom(state.zoom + 0.25));
  dom.zoomOutBtn.addEventListener('click', () => setZoom(state.zoom - 0.25));
  dom.zoomResetBtn.addEventListener('click', () => setZoom(1));
}

function setZoom(val) {
  state.zoom = Math.max(0.5, Math.min(3, val));
  dom.zoomWrapper.style.transform = `scale(${state.zoom})`;
  dom.zoomLabel.textContent = `${Math.round(state.zoom * 100)}%`;
}

// --- Fondo ---
function initBackgroundControls() {
  dom.bgTypeBtns.forEach((btn) => btn.addEventListener('click', () => {
    dom.bgTypeBtns.forEach((b) => b.classList.toggle('active', b === btn));
    state.bgType = btn.dataset.bgType;
    for (const [type, panel] of Object.entries(dom.bgPanels)) panel.classList.toggle('hidden', type !== state.bgType);
    renderPreview();
  }));

  dom.colorSwatches.forEach((sw) => sw.addEventListener('click', () => {
    dom.colorSwatches.forEach((s) => s.classList.toggle('active', s === sw));
    state.solidColor = sw.dataset.color;
    dom.customColorPicker.value = state.solidColor;
    dom.customColorHex.textContent = state.solidColor.toUpperCase();
    renderPreview();
  }));
  dom.customColorPicker.addEventListener('input', (e) => {
    state.solidColor = e.target.value;
    dom.customColorHex.textContent = state.solidColor.toUpperCase();
    dom.colorSwatches.forEach((s) => s.classList.remove('active'));
    renderPreview();
  });

  dom.gradientSwatches.forEach((sw) => {
    sw.style.background = sw.dataset.gradient;
    sw.addEventListener('click', () => {
      dom.gradientSwatches.forEach((s) => s.classList.toggle('active', s === sw));
      state.gradientStr = sw.dataset.gradient;
      renderPreview();
    });
  });

  dom.customBgDropzone.addEventListener('click', () => dom.customBgFileInput.click());
  dom.customBgDropzone.addEventListener('keydown', (e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); dom.customBgFileInput.click(); } });
  dom.customBgFileInput.addEventListener('change', async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!file.type.startsWith('image/')) {
      showToast('Selecciona un archivo de imagen válido', 'error');
      return;
    }
    try {
      const url = URL.createObjectURL(file);
      const img = await loadImageElement(url);
      if (state.customBgUrl) URL.revokeObjectURL(state.customBgUrl);
      state.customBgUrl = url;
      state.customBgImg = img;
      dom.customBgThumb.src = url;
      dom.customBgPreviewRow.style.display = 'flex';
      dom.customBgDropzone.style.display = 'none';
      renderPreview();
      showToast('Fondo personalizado cargado', 'info', 2000);
    } catch {
      showToast('No se pudo abrir esa imagen de fondo', 'error');
    }
  });
  dom.removeCustomBgBtn.addEventListener('click', (e) => {
    e.stopPropagation();
    if (state.customBgUrl) URL.revokeObjectURL(state.customBgUrl);
    state.customBgUrl = null;
    state.customBgImg = null;
    dom.customBgFileInput.value = '';
    dom.customBgPreviewRow.style.display = 'none';
    dom.customBgDropzone.style.display = 'block';
    renderPreview();
  });

  dom.bgBlurInput.addEventListener('input', (e) => {
    state.bgBlur = parseInt(e.target.value, 10);
    dom.blurVal.textContent = `${state.bgBlur}`;
    renderPreview();
  });
}

// --- Ajustes, efectos y transformaciones ---
function initEditControls() {
  for (const s of SLIDERS) {
    $(s.input).addEventListener('input', (e) => {
      const val = parseInt(e.target.value, 10);
      $(s.label).textContent = `${val}${s.unit}`;
      setItem(s.key, val);
    });
  }

  dom.resetAdjustmentsBtn.addEventListener('click', () => {
    const item = activeItem();
    if (!item) return;
    Object.assign(item, { brightness: 100, contrast: 100, saturation: 100 });
    syncControls(item);
    renderPreview();
  });

  dom.shadowToggle.addEventListener('change', () => { setEffectUi('shadow', dom.shadowToggle.checked, 'Activa', 'Inactiva'); setItem('shadowEnabled', dom.shadowToggle.checked); });
  dom.stickerToggle.addEventListener('change', () => { setEffectUi('sticker', dom.stickerToggle.checked, 'Activo', 'Inactivo'); setItem('stickerEnabled', dom.stickerToggle.checked); });
  dom.shadowColorPicker.addEventListener('input', (e) => { dom.shadowColorHex.textContent = e.target.value.toUpperCase(); setItem('shadowColor', e.target.value); });
  dom.stickerColorPicker.addEventListener('input', (e) => { dom.stickerColorHex.textContent = e.target.value.toUpperCase(); setItem('stickerColor', e.target.value); });

  dom.resetEffectsBtn.addEventListener('click', () => {
    const item = activeItem();
    if (!item) return;
    for (const k of ['shadowEnabled', 'shadowBlur', 'shadowOffsetY', 'shadowOpacity', 'shadowColor', 'stickerEnabled', 'stickerWidth', 'stickerColor']) item[k] = core.DEFAULT_SETTINGS[k];
    syncControls(item);
    renderPreview();
  });

  dom.flipHBtn.addEventListener('click', () => { const i = activeItem(); if (!i) return; setItem('flipH', !i.flipH); dom.flipHBtn.classList.toggle('active', i.flipH); });
  dom.flipVBtn.addEventListener('click', () => { const i = activeItem(); if (!i) return; setItem('flipV', !i.flipV); dom.flipVBtn.classList.toggle('active', i.flipV); });
  dom.rotateBtn.addEventListener('click', () => { const i = activeItem(); if (!i) return; setItem('rotation', (i.rotation + 90) % 360); showToast(`Rotación: ${i.rotation}°`, 'info', 1200); });

  dom.resetTransformBtn.addEventListener('click', () => {
    const item = activeItem();
    if (!item) return;
    Object.assign(item, { flipH: false, flipV: false, rotation: 0, aspectRatio: 'original' });
    syncControls(item);
    renderPreview();
  });

  dom.aspectPillBtns.forEach((btn) => btn.addEventListener('click', () => {
    dom.aspectPillBtns.forEach((b) => b.classList.toggle('active', b === btn));
    setItem('aspectRatio', btn.dataset.aspect);
  }));

  dom.applyToAllBatchBtn.addEventListener('click', () => {
    const src = activeItem();
    if (!src) return;
    for (const item of state.queue) {
      if (item === src) continue;
      for (const k of core.ITEM_SETTINGS) item[k] = src[k];
    }
    renderPreview();
    showToast(`Ajustes copiados a las ${state.queue.length} imágenes del lote (el fondo ya es común a todas)`, 'success', 3500);
  });
}

// --- Exportación ---
function initExportControls() {
  const setFormat = (fmt) => {
    state.exportFormat = fmt;
    dom.formatPngBtn.classList.toggle('active', fmt === 'image/png');
    dom.formatJpgBtn.classList.toggle('active', fmt === 'image/jpeg');
    dom.jpgQualityRow.classList.toggle('hidden', fmt !== 'image/jpeg');
    updateEstimate();
  };
  dom.formatPngBtn.addEventListener('click', () => setFormat('image/png'));
  dom.formatJpgBtn.addEventListener('click', () => setFormat('image/jpeg'));
  dom.jpgQualityInput.addEventListener('input', (e) => {
    const val = parseInt(e.target.value, 10);
    state.exportQuality = val / 100;
    dom.jpgQualityVal.textContent = `${val}%`;
    updateEstimate();
  });

  const scaleLabels = { '1.0': '100% (original)', '0.75': '75%', '0.5': '50% (web)' };
  dom.scalePillBtns.forEach((btn) => btn.addEventListener('click', () => {
    dom.scalePillBtns.forEach((b) => b.classList.toggle('active', b === btn));
    state.exportScale = parseFloat(btn.dataset.scale);
    dom.exportScaleVal.textContent = scaleLabels[btn.dataset.scale];
    updateEstimate();
  }));

  const ext = () => (state.exportFormat === 'image/png' ? 'png' : 'jpg');

  dom.downloadBtn.addEventListener('click', async () => {
    const item = activeItem();
    if (!item) return;
    const blob = await renderItemToBlob(item, state.exportFormat, exportQuality(), state.exportScale);
    if (!blob) return showToast('Error al exportar la imagen (¿es demasiado grande para el navegador?)', 'error');
    triggerDownload(blob, core.outputName(item.name, ext(), state.exportScale));
    showToast(`Descargado ${ext().toUpperCase()} (${core.formatBytes(blob.size)})`, 'success');
  });

  dom.copyClipboardBtn.addEventListener('click', async () => {
    const item = activeItem();
    if (!item) return;
    if (!navigator.clipboard?.write || !window.ClipboardItem) {
      showToast('Tu navegador no permite copiar imágenes al portapapeles', 'error');
      return;
    }
    try {
      // Safari exige pasar la promesa del blob dentro del mismo gesto del usuario.
      const blobPromise = renderItemToBlob(item, 'image/png', 1, 1);
      await navigator.clipboard.write([new ClipboardItem({ 'image/png': blobPromise })]);
      showToast('Imagen copiada al portapapeles (PNG)', 'success');
    } catch (err) {
      console.error(err);
      showToast('El navegador no ha dado permiso para escribir en el portapapeles', 'error');
    }
  });

  dom.batchDownloadZipBtn.addEventListener('click', async () => {
    const done = state.queue.filter((i) => i.status === 'done');
    if (!done.length) return showToast('No hay imágenes terminadas para descargar', 'error');
    dom.batchDownloadZipBtn.disabled = true;
    try {
      showToast(`Comprimiendo ${done.length} imágenes en ZIP...`, 'info', 2500);
      const zip = new JSZip();
      const used = new Set();
      for (const item of done) {
        const blob = await renderItemToBlob(item, state.exportFormat, exportQuality(), state.exportScale);
        if (blob) zip.file(core.uniqueName(core.outputName(item.name, ext(), state.exportScale), used), blob);
      }
      // PNG y JPG ya están comprimidos: STORE evita gastar CPU para ganar nada.
      const zipBlob = await zip.generateAsync({ type: 'blob', compression: 'STORE' });
      const stamp = new Date().toISOString().slice(0, 19).replace(/[:T]/g, '-');
      triggerDownload(zipBlob, `clearcut-lote-${stamp}.zip`);
      showToast(`ZIP descargado: ${used.size} imágenes, ${core.formatBytes(zipBlob.size)}`, 'success');
    } catch (err) {
      console.error(err);
      showToast('No se pudo generar el ZIP', 'error');
    } finally {
      dom.batchDownloadZipBtn.disabled = false;
    }
  });
}

function triggerDownload(blob, filename) {
  const url = URL.createObjectURL(blob);
  const a = el('a', { href: url, download: filename });
  document.body.append(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 2000);
}

// --- Atajos y modal ---
function toggleModal(show) {
  const open = show ?? dom.shortcutsModal.classList.contains('hidden');
  dom.shortcutsModal.classList.toggle('hidden', !open);
  if (open) dom.closeShortcutsBtn.focus();
}

function initKeyboard() {
  dom.shortcutsModalBtn.addEventListener('click', () => toggleModal(true));
  dom.closeShortcutsBtn.addEventListener('click', () => toggleModal(false));
  dom.shortcutsModal.addEventListener('click', (e) => { if (e.target === dom.shortcutsModal) toggleModal(false); });

  window.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && !dom.shortcutsModal.classList.contains('hidden')) return toggleModal(false);
    const tag = document.activeElement?.tagName;
    if (tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT') return;

    const action = core.matchShortcut(e);
    if (action === 'help') { e.preventDefault(); return toggleModal(); }
    if (!action || dom.editorSection.style.display !== 'flex' || !activeItem()) return;
    if (action === 'copy' && window.getSelection()?.toString()) return;
    // Espacio sobre un botón con foco: que lo pulse el navegador, no el atajo.
    if (action === 'toggle-original' && tag === 'BUTTON') return;

    e.preventDefault();
    const click = {
      download: dom.downloadBtn, copy: dom.copyClipboardBtn, 'toggle-original': dom.quickToggleOriginalBtn,
      'flip-h': dom.flipHBtn, 'flip-v': dom.flipVBtn, rotate: dom.rotateBtn,
      'zoom-in': dom.zoomInBtn, 'zoom-out': dom.zoomOutBtn, 'zoom-reset': dom.zoomResetBtn,
    }[action];
    if (click) return click.click();
    const next = core.neighbourDone(state.queue, state.selectedIndex, action === 'next' ? 1 : -1);
    if (next !== -1) selectQueueItem(next);
  });
}

// --- Entrada de archivos, muestras y navegación ---
async function svgToPngFile(svgDataUrl, name) {
  const img = await loadImageElement(svgDataUrl);
  const c = document.createElement('canvas');
  c.width = img.naturalWidth || 800;
  c.height = img.naturalHeight || 800;
  c.getContext('2d').drawImage(img, 0, 0, c.width, c.height);
  const blob = await new Promise((r) => c.toBlob(r, 'image/png'));
  return new File([blob], name, { type: 'image/png' });
}

async function logoFile(name) {
  const blob = await fetch(LOGO_URL).then((r) => {
    if (!r.ok) throw new Error(`HTTP ${r.status}`);
    return r.blob();
  });
  return new File([blob], name, { type: 'image/png' });
}

async function sampleFiles(types) {
  const files = [];
  for (const [i, t] of types.entries()) {
    const n = types.length > 1 ? `${i + 1}_` : '';
    try {
      files.push(t === 'ghost' ? await logoFile(`${n}un_fantasma_en_el_sistema.png`) : await svgToPngFile(createSampleImageDataUrl(t), `${n}muestra_${t}.png`));
    } catch (err) {
      console.warn('No se pudo preparar la muestra', t, err);
    }
  }
  return files;
}

let pasteCounter = 0;
function initInputs() {
  const { dropzone, fileInput } = dom;
  dom.browseBtn.addEventListener('click', (e) => { e.stopPropagation(); fileInput.click(); });
  dropzone.addEventListener('click', () => fileInput.click());
  dropzone.addEventListener('keydown', (e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); fileInput.click(); } });
  ['dragenter', 'dragover'].forEach((n) => dropzone.addEventListener(n, (e) => { e.preventDefault(); dropzone.classList.add('dragover'); }));
  ['dragleave', 'drop'].forEach((n) => dropzone.addEventListener(n, (e) => { e.preventDefault(); dropzone.classList.remove('dragover'); }));
  dropzone.addEventListener('drop', (e) => { if (e.dataTransfer?.files?.length) addFilesToQueue(e.dataTransfer.files); });
  // Soltar fuera de la zona no debe abrir la imagen en la pestaña y perder el trabajo.
  window.addEventListener('dragover', (e) => e.preventDefault());
  window.addEventListener('drop', (e) => {
    e.preventDefault();
    if (e.dataTransfer?.files?.length && dom.uploadSection.style.display === 'none') addFilesToQueue(e.dataTransfer.files);
  });

  const onPick = (input) => input.addEventListener('change', () => {
    if (input.files?.length) addFilesToQueue(input.files);
    input.value = '';
  });
  onPick(fileInput);
  onPick(dom.addMoreFileInput);
  dom.addMoreFilesBtn.addEventListener('click', () => dom.addMoreFileInput.click());

  dom.cancelQueueBtn.addEventListener('click', () => {
    state.cancelRequested = true;
    dom.batchProgressSubtitle.textContent = 'Deteniendo: se termina la imagen en curso y se para la cola';
  });

  window.addEventListener('paste', (e) => {
    const files = [];
    for (const it of e.clipboardData?.items || []) {
      if (!it.type.startsWith('image/')) continue;
      const f = it.getAsFile();
      if (!f) continue;
      // Todos los navegadores llaman «image.png» a lo pegado: se numera para no pisarse.
      const ext = f.type.split('/')[1] === 'jpeg' ? 'jpg' : f.type.split('/')[1];
      files.push(new File([f], `pegada_${++pasteCounter}.${ext}`, { type: f.type }));
    }
    if (files.length) addFilesToQueue(files);
  });

  document.querySelectorAll('.sample-btn[data-sample]').forEach((btn) => btn.addEventListener('click', async (e) => {
    e.stopPropagation();
    addFilesToQueue(await sampleFiles([btn.dataset.sample]));
  }));
  dom.sampleBatchBtn.addEventListener('click', async (e) => {
    e.stopPropagation();
    addFilesToQueue(await sampleFiles(['ghost', 'portrait', 'product', 'cat']));
  });

  dom.resetBtn.addEventListener('click', () => {
    if (state.isQueueRunning) return;
    clearEntireQueue();
    setZoom(1);
    showView('upload');
  });
  dom.viewHistoryFromEditorBtn.addEventListener('click', () => showView('upload'));
  dom.clearHistoryBtn.addEventListener('click', async () => {
    await historyDb.clearHistory().catch(() => {});
    renderHistoryUI();
    showToast('Historial local vaciado', 'info', 2000);
  });
  dom.brandLink.addEventListener('click', (e) => {
    e.preventDefault();
    if (state.isQueueRunning) return;
    showView(state.queue.some((i) => i.status === 'done') ? 'editor' : 'upload');
    window.scrollTo({ top: 0, behavior: 'smooth' });
  });

  // Avisar antes de cerrar con recortes sin descargar o con la cola en marcha.
  window.addEventListener('beforeunload', (e) => {
    if (state.isQueueRunning || state.queue.some((i) => i.status === 'done')) {
      e.preventDefault();
      e.returnValue = '';
    }
  });
}

function loadImageElement(src) {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.decoding = 'async';
    img.onload = () => resolve(img);
    img.onerror = () => reject(new Error('El navegador no ha podido abrir la imagen'));
    img.src = src;
  });
}

function createSampleImageDataUrl(type) {
  const svgs = {
    portrait: `<svg xmlns="http://www.w3.org/2000/svg" width="800" height="800" viewBox="0 0 800 800"><defs><linearGradient id="g" x1="0%" y1="0%" x2="100%" y2="100%"><stop offset="0%" stop-color="#4f46e5"/><stop offset="100%" stop-color="#06b6d4"/></linearGradient></defs><rect width="800" height="800" fill="url(#g)"/><circle cx="400" cy="330" r="140" fill="#fed7aa"/><path d="M 240 330 C 240 180 560 180 560 330 C 560 210 240 210 240 330 Z" fill="#3b0764"/><ellipse cx="350" cy="320" rx="12" ry="8" fill="#1e293b"/><ellipse cx="450" cy="320" rx="12" ry="8" fill="#1e293b"/><path d="M 360 380 Q 400 420 440 380" stroke="#b91c1c" stroke-width="8" fill="none" stroke-linecap="round"/><path d="M 220 720 C 220 500 580 500 580 720 Z" fill="#0f172a"/><polygon points="360,510 400,560 440,510" fill="#fed7aa"/></svg>`,
    product: `<svg xmlns="http://www.w3.org/2000/svg" width="800" height="800" viewBox="0 0 800 800"><rect width="800" height="800" fill="#f1f5f9"/><path d="M 180 520 C 280 530 520 530 640 490 C 620 550 260 550 180 520 Z" fill="#ffffff" stroke="#cbd5e1" stroke-width="4"/><path d="M 180 520 C 200 420 340 320 480 340 C 530 350 620 420 640 490 C 520 530 280 530 180 520 Z" fill="#ea580c"/><path d="M 320 350 L 400 430 M 350 340 L 430 420 M 380 330 L 460 410" stroke="#ffffff" stroke-width="8" stroke-linecap="round"/><circle cx="280" cy="440" r="30" fill="#fed7aa"/></svg>`,
    cat: `<svg xmlns="http://www.w3.org/2000/svg" width="800" height="800" viewBox="0 0 800 800"><rect width="800" height="800" fill="#ec4899"/><circle cx="400" cy="420" r="160" fill="#ffffff"/><polygon points="270,320 310,180 390,290" fill="#ffffff" stroke="#fbcfe8" stroke-width="12"/><polygon points="530,320 490,180 410,290" fill="#ffffff" stroke="#fbcfe8" stroke-width="12"/><ellipse cx="340" cy="390" rx="20" ry="28" fill="#10b981"/><ellipse cx="460" cy="390" rx="20" ry="28" fill="#10b981"/><polygon points="390,440 410,440 400,455" fill="#f43f5e"/><line x1="280" y1="440" x2="360" y2="445" stroke="#94a3b8" stroke-width="4"/><line x1="270" y1="465" x2="360" y2="455" stroke="#94a3b8" stroke-width="4"/><line x1="520" y1="440" x2="440" y2="445" stroke="#94a3b8" stroke-width="4"/><line x1="530" y1="465" x2="440" y2="455" stroke="#94a3b8" stroke-width="4"/></svg>`,
  };
  return `data:image/svg+xml;charset=utf-8,${encodeURIComponent(svgs[type] || svgs.cat)}`;
}

// --- Arranque ---
loadPrefs();
checkBrowserCompatibility();
initTheme();
initEngineControls();
initInputs();
initSplitEvents();
initBackgroundControls();
initEditControls();
initExportControls();
initKeyboard();
applyViewMode();
renderHistoryUI();

// Para las pruebas automáticas (no forma parte de la interfaz).
window.__clearcut = { state, core };
