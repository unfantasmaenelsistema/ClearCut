import { test } from 'node:test';
import assert from 'node:assert/strict';
import * as core from '../src/core.js';

test('tipos admitidos: los que decodifican todos los navegadores modernos, no SVG', () => {
  for (const t of ['image/jpeg', 'image/png', 'image/webp', 'image/avif', 'IMAGE/PNG']) assert.ok(core.isSupportedImageType(t), t);
  for (const t of ['image/svg+xml', 'image/gif', 'image/bmp', '', undefined]) assert.ok(!core.isSupportedImageType(t), String(t));
});

test('hexToRgb admite #rgb, #rrggbb y valores inválidos', () => {
  assert.deepEqual(core.hexToRgb('#fff'), { r: 255, g: 255, b: 255 });
  assert.deepEqual(core.hexToRgb('#004B87'), { r: 0, g: 75, b: 135 });
  assert.deepEqual(core.hexToRgb('nada'), { r: 0, g: 0, b: 0 });
});

test('formatBytes', () => {
  assert.equal(core.formatBytes(0), '0 B');
  assert.equal(core.formatBytes(1536), '1.5 KB');
  assert.equal(core.formatBytes(88.2e6), '84.1 MB');
});

test('lienzo original y giro de 90° intercambia ancho y alto', () => {
  assert.deepEqual(core.computeComposition(1200, 800, {}), { width: 1200, height: 800, drawW: 1200, drawH: 800 });
  const r = core.computeComposition(1200, 800, { rotation: 90 });
  assert.equal(r.width, 800);
  assert.equal(r.height, 1200);
  assert.equal(r.drawW, 1200, 'la imagen se dibuja con su tamaño propio dentro del contexto girado');
});

test('presets de lienzo: proporción exacta y el sujeto cabe entero', () => {
  for (const [aspect, ratio] of [['1:1', 1], ['9:16', 9 / 16], ['16:9', 16 / 9], ['4:5', 4 / 5]]) {
    for (const [w, h, rot] of [[1200, 800, 0], [800, 1200, 0], [1000, 1000, 0], [1200, 800, 90], [3000, 500, 0]]) {
      const c = core.computeComposition(w, h, { aspectRatio: aspect, rotation: rot });
      const effW = rot === 90 ? h : w;
      const effH = rot === 90 ? w : h;
      assert.ok(Math.abs(c.width / c.height - ratio) < 0.01, `${aspect} ${w}x${h}`);
      assert.ok(c.width >= effW && c.height >= effH, `${aspect} ${w}x${h} recorta al sujeto`);
    }
  }
});

test('escala de exportación', () => {
  const c = core.computeComposition(1000, 500, { aspectRatio: '1:1' }, 0.5);
  assert.equal(c.width, 540);
  assert.equal(c.height, 540);
  assert.equal(c.drawW, 500);
});

test('parseGradient lee las muestras de la interfaz', () => {
  assert.deepEqual(core.parseGradient('linear-gradient(135deg, #f6d365 0%, #fda085 100%)'), {
    type: 'linear', angle: 135, stops: [{ color: '#f6d365', offset: 0 }, { color: '#fda085', offset: 1 }],
  });
  const r = core.parseGradient('radial-gradient(circle, #f8fafc 0%, #cbd5e1 100%)');
  assert.equal(r.type, 'radial');
  assert.deepEqual(r.stops.map((s) => s.color), ['#f8fafc', '#cbd5e1'], 'el radial usa sus colores, no unos fijos');
  assert.equal(core.parseGradient('url(x)'), null);
  assert.deepEqual(core.parseGradient('linear-gradient(90deg, red, blue)').stops.map((s) => s.offset), [0, 1]);
});

test('recta del degradado lineal igual que CSS', () => {
  // 90deg: de izquierda a derecha, a media altura.
  const a = core.linearGradientLine(90, 200, 100);
  assert.ok(Math.abs(a.x0 - 0) < 1e-9 && Math.abs(a.x1 - 200) < 1e-9 && Math.abs(a.y0 - 50) < 1e-9);
  // 180deg (por defecto en CSS): de arriba abajo.
  const b = core.linearGradientLine(180, 200, 100);
  assert.ok(Math.abs(b.y0 - 0) < 1e-9 && Math.abs(b.y1 - 100) < 1e-9);
  // 135deg en un cuadrado: de esquina a esquina.
  const c = core.linearGradientLine(135, 100, 100);
  assert.ok(Math.abs(c.x0) < 1e-9 && Math.abs(c.y0) < 1e-9 && Math.abs(c.x1 - 100) < 1e-9 && Math.abs(c.y1 - 100) < 1e-9);
  assert.equal(core.radialGradientRadius(300, 400), 250);
});

test('nombres de salida limpios', () => {
  assert.equal(core.outputName('foto.final.JPG', 'png'), 'foto.final-clearcut.png');
  assert.equal(core.outputName('foto.png', 'jpg', 0.5), 'foto-clearcut@50.jpg');
  assert.equal(core.outputName('a<b>:c?.png', 'png'), 'a_b_c_-clearcut.png');
  assert.equal(core.outputName('', 'png'), 'imagen-clearcut.png');
});

test('uniqueName evita que el ZIP sobrescriba archivos con el mismo nombre', () => {
  const used = new Set();
  assert.equal(core.uniqueName('image-clearcut.png', used), 'image-clearcut.png');
  assert.equal(core.uniqueName('image-clearcut.png', used), 'image-clearcut (2).png');
  assert.equal(core.uniqueName('image-clearcut.png', used), 'image-clearcut (3).png');
  assert.equal(used.size, 3);
});

test('JPEG con fondo transparente necesita relleno opaco', () => {
  assert.ok(core.needsOpaqueFill('image/jpeg', 'transparent', false));
  assert.ok(core.needsOpaqueFill('image/jpeg', 'image', false), 'fondo de imagen sin imagen cargada');
  assert.ok(!core.needsOpaqueFill('image/jpeg', 'image', true));
  assert.ok(!core.needsOpaqueFill('image/jpeg', 'color', false));
  assert.ok(!core.needsOpaqueFill('image/png', 'transparent', false));
});

test('atajos: las letras no se disparan con Ctrl/Cmd (Ctrl+V pega, no voltea)', () => {
  assert.equal(core.matchShortcut({ key: 'v', ctrlKey: true }), null);
  assert.equal(core.matchShortcut({ key: 'r', ctrlKey: true }), null);
  assert.equal(core.matchShortcut({ key: 'h', metaKey: true }), null);
  assert.equal(core.matchShortcut({ key: 'v' }), 'flip-v');
  assert.equal(core.matchShortcut({ key: 'H', shiftKey: true }), 'flip-h');
  assert.equal(core.matchShortcut({ key: 's', ctrlKey: true }), 'download');
  assert.equal(core.matchShortcut({ key: 'd', metaKey: true }), 'download');
  assert.equal(core.matchShortcut({ key: 'c', ctrlKey: true }), 'copy');
  assert.equal(core.matchShortcut({ key: 'c', ctrlKey: true, altKey: true }), null);
  assert.equal(core.matchShortcut({ key: ' ', code: 'Space' }), 'toggle-original');
  assert.equal(core.matchShortcut({ key: '?', shiftKey: true }), 'help');
  assert.equal(core.matchShortcut({ key: 'ArrowRight' }), 'next');
  assert.equal(core.matchShortcut({ key: 'x' }), null);
});

test('navegación por el lote salta las pendientes y con error', () => {
  const q = ['done', 'error', 'pending', 'done', 'done'].map((status) => ({ status }));
  assert.equal(core.neighbourDone(q, 0, 1), 3);
  assert.equal(core.neighbourDone(q, 3, -1), 0);
  assert.equal(core.neighbourDone(q, 4, 1), -1);
  assert.equal(core.neighbourDone(q, 0, -1), -1);
});

test('progreso global cuenta las fallidas como terminadas', () => {
  assert.equal(core.overallProgress([]), 0);
  const q = [{ status: 'done' }, { status: 'error' }, { status: 'processing' }, { status: 'pending' }];
  assert.equal(core.overallProgress(q, 50), 63);
  assert.equal(core.overallProgress(q.map(() => ({ status: 'done' }))), 100);
});

test('ajustes por defecto cubren todo lo que se copia al lote', () => {
  for (const k of core.ITEM_SETTINGS) assert.ok(k in core.DEFAULT_SETTINGS, k);
});
