import { defineConfig } from 'vite';

// Política de seguridad de la build publicada. En desarrollo no se añade
// porque el cliente de Vite necesita websockets y scripts inline.
// - wasm-unsafe-eval: compilar el WebAssembly de ONNX Runtime.
// - unsafe-eval: ndarray (dependencia de imgly) genera sus accesores con new Function.
//   Sigue sin permitirse ningún script externo ni inline.
// - blob: imgly descarga el .mjs/.wasm de ONNX Runtime y los carga como blob.
// - staticimgly.com: CDN de IMG.LY con el modelo ISNet y ONNX Runtime.
const CSP = [
  "default-src 'self'",
  "script-src 'self' 'unsafe-eval' 'wasm-unsafe-eval' blob:",
  "worker-src 'self' blob:",
  "connect-src 'self' blob: data: https://staticimgly.com",
  "img-src 'self' blob: data:",
  "style-src 'self' 'unsafe-inline'",
  "font-src 'self'",
  "object-src 'none'",
  "base-uri 'self'",
  "form-action 'none'",
].join('; ');

const cspPlugin = {
  name: 'clearcut-csp',
  apply: 'build',
  transformIndexHtml: (html) =>
    html.replace('<meta charset="UTF-8" />', `<meta charset="UTF-8" />\n  <meta http-equiv="Content-Security-Policy" content="${CSP}" />`),
};

// Rutas relativas: la misma build sirve en la raíz de un dominio y en
// https://unfantasmaenelsistema.github.io/ClearCut/
export default defineConfig({
  base: './',
  plugins: [cspPlugin],
  build: { target: 'es2022', chunkSizeWarningLimit: 1500 },
  server: { port: 5180 },
});
