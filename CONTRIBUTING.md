# Guía de Contribución a ClearCut AI 🚀

¡Gracias por tu interés en colaborar con **ClearCut AI**! Este proyecto es de código abierto y agradecemos sugerencias, reportes de problemas y nuevas funciones.

---

## 🛠️ Entorno de Desarrollo Local

### Requisitos previos
- **Node.js** v18 o v20+
- **npm** v9+ (o `pnpm` / `bun`)

### Pasos para iniciar

1. Haz un fork del repositorio en GitHub.
2. Clona tu fork localmente:
   ```bash
   git clone https://github.com/TU-USUARIO/clearcut-ai.git
   cd clearcut-ai
   ```
3. Instala las dependencias:
   ```bash
   npm install
   ```
4. Inicia el servidor de desarrollo en caliente:
   ```bash
   npm run dev
   ```
5. Abre en tu navegador en `http://localhost:3000`.

---

## 🧪 Comprobación de Calidad y Compilación

Antes de enviar un Pull Request, ejecuta las comprobaciones de TypeScript y construcción:

```bash
# Validar tipos TypeScript
npm run lint

# Probar la compilación para producción
npm run build
```

---

## 💡 Guías de Código

- **100% Client-Side:** No introduzcas dependencias que requieran servidores backend o claves de API remotas para procesar imágenes. La privacidad total en el cliente es la filosofía central de la app.
- **Rendimiento:** Las transformaciones pesadas de imágenes deben utilizar Canvas de alto rendimiento o Web Workers para no congelar el hilo principal.
- **Estilos:** Mantener la estética limpia en temas Claro y Oscuro con Tailwind CSS y variables CSS semánticas.

---

## 📄 Licencia

Al contribuir con este repositorio, aceptas que tus contribuciones se licencien bajo la [Licencia MIT](./LICENSE).
