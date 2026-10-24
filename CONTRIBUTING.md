# Cómo colaborar con ClearCut

Gracias por echar una mano. Antes de abrir un PR:

```bash
npm ci
npm test        # pruebas del núcleo (src/core.js)
npm run build   # la build tiene que salir sin errores
npm run dev     # pruébalo en http://localhost:5180 con fotos reales
```

## Reglas del proyecto

- **Las imágenes no salen del navegador.** No añadas nada que las suba a un servidor, ni analítica, ni recursos de terceros (fuentes, CDN). La única conexión externa permitida es la descarga del modelo desde `staticimgly.com`; la CSP de `vite.config.js` lo hace cumplir.
- **Nada de `innerHTML` con datos del usuario** (nombres de archivo incluidos): usa el helper `el()` de `src/app.js`.
- La lógica que no necesita DOM va en `src/core.js` con su prueba en `tests/core.test.js`.
- Textos de la interfaz en español.

## Licencia

Tus contribuciones se publican con la licencia [MIT](LICENSE) del repositorio. Ten en cuenta que la app publicada incluye `@imgly/background-removal` (AGPL-3.0); el README lo explica.
