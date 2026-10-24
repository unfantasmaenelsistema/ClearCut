/**
 * ClearCut — núcleo sin DOM.
 * Geometría del lienzo, degradados, nombres de archivo y atajos de teclado.
 * Se prueba con `npm test` (node --test) sin navegador.
 */

export const SUPPORTED_TYPES = ['image/jpeg', 'image/png', 'image/webp', 'image/avif'];

export const MODELS = {
  isnet_quint8: { label: 'Rápido', size: '44 MB' },
  isnet_fp16: { label: 'Equilibrado', size: '88 MB' },
  isnet: { label: 'Máxima precisión', size: '176 MB' },
};

export function isSupportedImageType(type) {
  return SUPPORTED_TYPES.includes(String(type || '').toLowerCase());
}

export function hexToRgb(hex) {
  let c = String(hex || '').replace('#', '');
  if (c.length === 3) c = c.split('').map((x) => x + x).join('');
  if (!/^[0-9a-f]{6}$/i.test(c)) return { r: 0, g: 0, b: 0 };
  const num = parseInt(c, 16);
  return { r: (num >> 16) & 255, g: (num >> 8) & 255, b: num & 255 };
}

export function formatBytes(bytes) {
  if (!bytes) return '0 B';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB'];
  const i = Math.min(sizes.length - 1, Math.floor(Math.log(bytes) / Math.log(k)));
  return `${parseFloat((bytes / k ** i).toFixed(1))} ${sizes[i]}`;
}

/** Proporciones de los presets de lienzo y el margen que dejan alrededor del sujeto. */
const ASPECTS = {
  '1:1': { ratio: 1, pad: 1.08 },
  '9:16': { ratio: 9 / 16, pad: 1.15 },
  '16:9': { ratio: 16 / 9, pad: 1.15 },
  '4:5': { ratio: 4 / 5, pad: 1.12 },
};

/**
 * Tamaño del lienzo final y de la imagen dibujada.
 * Con giro de 90/270 el lienzo intercambia ancho y alto; la imagen se dibuja
 * con su tamaño propio dentro del contexto ya rotado.
 */
export function computeComposition(imgW, imgH, { rotation = 0, aspectRatio = 'original' } = {}, scale = 1) {
  const turned = rotation === 90 || rotation === 270;
  const effW = turned ? imgH : imgW;
  const effH = turned ? imgW : imgH;
  let targetW = effW;
  let targetH = effH;

  const preset = ASPECTS[aspectRatio];
  if (preset) {
    if (effW / effH > preset.ratio) {
      targetW = Math.round(effW * preset.pad);
      targetH = Math.round(targetW / preset.ratio);
    } else {
      targetH = Math.round(effH * preset.pad);
      targetW = Math.round(targetH * preset.ratio);
    }
  }

  return {
    width: Math.max(1, Math.round(targetW * scale)),
    height: Math.max(1, Math.round(targetH * scale)),
    drawW: Math.max(1, Math.round(imgW * scale)),
    drawH: Math.max(1, Math.round(imgH * scale)),
  };
}

/**
 * Interpreta los degradados CSS de las muestras para dibujarlos igual en el canvas.
 * Admite `linear-gradient(<ángulo>deg, ...)` y `radial-gradient(circle, ...)`.
 */
export function parseGradient(str) {
  const m = /^\s*(linear|radial)-gradient\((.*)\)\s*$/i.exec(String(str || ''));
  if (!m) return null;
  const type = m[1].toLowerCase();
  const parts = m[2].split(/,(?![^(]*\))/).map((p) => p.trim());
  let angle = 180;
  if (type === 'linear' && /deg$/i.test(parts[0])) angle = parseFloat(parts.shift());
  else if (type === 'radial' && !/^#|^rgb/i.test(parts[0])) parts.shift();

  const stops = parts.map((p, i, arr) => {
    const [color, pos] = p.split(/\s+/);
    const offset = pos ? parseFloat(pos) / 100 : i / Math.max(1, arr.length - 1);
    return { color, offset: Math.min(1, Math.max(0, offset)) };
  });
  if (stops.length < 2) return null;
  return { type, angle, stops };
}

/** Recta del degradado lineal CSS (misma longitud que usa el navegador) para createLinearGradient. */
export function linearGradientLine(angleDeg, w, h) {
  const a = (angleDeg * Math.PI) / 180;
  const dx = Math.sin(a);
  const dy = -Math.cos(a);
  const half = (Math.abs(w * dx) + Math.abs(h * dy)) / 2;
  return { x0: w / 2 - dx * half, y0: h / 2 - dy * half, x1: w / 2 + dx * half, y1: h / 2 + dy * half };
}

/** `radial-gradient(circle, ...)` por defecto llega a la esquina más lejana. */
export function radialGradientRadius(w, h) {
  return Math.hypot(w, h) / 2;
}

/** Quita la extensión y los caracteres no válidos en nombres de archivo de Windows/macOS/Linux. */
export function baseName(name) {
  const noExt = String(name || '').replace(/\.[^/.]+$/, '');
  const clean = noExt.replace(/[\\/:*?"<>|\u0000-\u001f]+/g, '_').trim();
  return clean || 'imagen';
}

export function outputName(name, ext, scale = 1) {
  const suffix = scale < 1 ? `@${Math.round(scale * 100)}` : '';
  return `${baseName(name)}-clearcut${suffix}.${ext}`;
}

/** Evita que dos archivos con el mismo nombre se pisen dentro del ZIP. */
export function uniqueName(name, used) {
  if (!used.has(name)) {
    used.add(name);
    return name;
  }
  const dot = name.lastIndexOf('.');
  const stem = dot > 0 ? name.slice(0, dot) : name;
  const ext = dot > 0 ? name.slice(dot) : '';
  let n = 2;
  while (used.has(`${stem} (${n})${ext}`)) n++;
  const out = `${stem} (${n})${ext}`;
  used.add(out);
  return out;
}

/** JPEG no tiene canal alfa: sin fondo, el canvas lo exportaría en negro. */
export function needsOpaqueFill(format, bgType, hasCustomBg) {
  if (format !== 'image/jpeg') return false;
  return bgType === 'transparent' || (bgType === 'image' && !hasCustomBg);
}

/**
 * Atajos del editor. Las letras solo cuentan sin Ctrl/Cmd/Alt, para que
 * Ctrl+V (pegar), Ctrl+R (recargar) o Ctrl+H (historial) sigan siendo del navegador.
 */
export function matchShortcut({ key = '', code = '', ctrlKey = false, metaKey = false, altKey = false, shiftKey = false }) {
  const k = key.toLowerCase();
  const mod = ctrlKey || metaKey;
  if (mod && !altKey && (k === 's' || k === 'd')) return 'download';
  if (mod && !altKey && k === 'c') return 'copy';
  if (mod || altKey) return null;
  if (key === '?' || (key === '/' && shiftKey)) return 'help';
  if (code === 'Space') return 'toggle-original';
  if (k === 'h') return 'flip-h';
  if (k === 'v') return 'flip-v';
  if (k === 'r') return 'rotate';
  if (key === '+' || key === '=') return 'zoom-in';
  if (key === '-') return 'zoom-out';
  if (key === '0') return 'zoom-reset';
  if (key === 'ArrowRight') return 'next';
  if (key === 'ArrowLeft') return 'prev';
  return null;
}

/** Siguiente/anterior imagen terminada de la cola, sin salirse de los extremos. */
export function neighbourDone(queue, from, dir) {
  for (let i = from + dir; i >= 0 && i < queue.length; i += dir) {
    if (queue[i].status === 'done') return i;
  }
  return -1;
}

/** Progreso global de la tanda: imágenes acabadas (o fallidas) más la fracción de la actual. */
export function overallProgress(queue, currentPercent = 0) {
  if (!queue.length) return 0;
  const finished = queue.filter((i) => i.status === 'done' || i.status === 'error').length;
  const running = queue.some((i) => i.status === 'processing') ? Math.min(100, Math.max(0, currentPercent)) / 100 : 0;
  return Math.min(100, Math.round(((finished + running) / queue.length) * 100));
}

/** Ajustes por imagen que «Aplicar a todo el lote» copia. */
export const ITEM_SETTINGS = [
  'brightness', 'contrast', 'saturation',
  'shadowEnabled', 'shadowBlur', 'shadowOffsetY', 'shadowOpacity', 'shadowColor',
  'stickerEnabled', 'stickerWidth', 'stickerColor',
  'flipH', 'flipV', 'rotation', 'aspectRatio',
];

export const DEFAULT_SETTINGS = {
  brightness: 100, contrast: 100, saturation: 100,
  shadowEnabled: false, shadowBlur: 25, shadowOffsetY: 15, shadowOpacity: 35, shadowColor: '#000000',
  stickerEnabled: false, stickerWidth: 12, stickerColor: '#FFFFFF',
  flipH: false, flipV: false, rotation: 0, aspectRatio: 'original',
};
