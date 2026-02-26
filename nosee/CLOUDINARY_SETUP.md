# 🌥️ Configuración de Cloudinary para NØSEE

## ¿Qué es Cloudinary?
Cloudinary es un servicio cloud que permite subir, almacenar y servir imágenes de forma rápida y segura mediante CDN global. Es **gratis** hasta cierto límite de uso.

---

## 📋 PASOS DE CONFIGURACIÓN

### PASO 1: Crear Cuenta Cloudinary (5 minutos)
1. Ir a https://cloudinary.com
2. Hacer clic en **"Sign Up for Free"**
3. Llenar el formulario con:
   - Email: tu@email.com
   - Password: password segura
   - Company name: "NØSEE" (opcional)
4. Confirmar email (revisa tu bandeja)
5. Completar el signup wizard (puedes saltarlo)

### PASO 2: Obtener Cloud Name (2 minutos)
1. Ir a dashboard principal de Cloudinary
2. En la esquina superior derecha verás: **"Cloud Name:"** seguido de un texto
3. **Copiar ese valor** (es tu cloud name, ej: `abc123xyz`)

### PASO 3: Crear .env.local (2 minutos)
1. En la raíz del proyecto (mismo nivel que package.json):
   ```
   /nosee/
   ├── src/
   ├── public/
   ├── tests/
   ├── .env.local          ← CREAR ESTE ARCHIVO
   ├── .env.example
   └── package.json
   ```

2. Crear archivo `.env.local` con contenido:
   ```bash
   # Cloudinary Configuration
   VITE_CLOUDINARY_CLOUD_NAME=tu_cloud_name_aqui
   ```

3. **IMPORTANTE:** Reemplazar `tu_cloud_name_aqui` con el valor real copiado en PASO 2

### PASO 4: Verificar Setup (1 minuto)
1. El archivo `.env.local` YA ESTÁ en `.gitignore`, no se committeará
2. Verificar en `vite.config.js` que tiene alias `@`
3. Verificar en `.gitignore` que tiene:
   ```
   .env.local
   .env
   *.local
   ```

### PASO 5: Probar Upload (5 minutos)

#### Opción A: Vía Navegación
1. Iniciar en dev: `npm run dev`
2. Ir a http://localhost:5173/login
3. Login con cuenta de prueba
4. Ir a "/publicaciones/nueva"
5. Intentar subir una foto
6. Si funciona: ✅ Cloudinary está configurado correctamente

#### Opción B: Vía Consola Browser
1. Abrir DevTools (F12)
2. Ir a Console
3. Chequear que `import.meta.env.VITE_CLOUDINARY_CLOUD_NAME` retorna tu cloud name:
   ```javascript
   console.log(import.meta.env.VITE_CLOUDINARY_CLOUD_NAME)
   // Debe mostrar: "tu_cloud_name_aqui"
   ```

---

## 📝 VERIFICACIÓN De Instalación

### Checklist:
- [ ] Cuenta Cloudinary creada
- [ ] Cloud Name copiado
- [ ] `.env.local` creado en raíz del proyecto
- [ ] `VITE_CLOUDINARY_CLOUD_NAME=xxxx` configurado
- [ ] `.env.local` NO aparece en git (está en .gitignore)
- [ ] `npm run build` compila sin errores
- [ ] `npm run dev` compila sin errores
- [ ] PhotoUploader renderiza correctamente
- [ ] Drag-drop de foto funciona

---

## 🐛 TROUBLESHOOTING

### Error: "Cloudinary cloud name no configurado"
**Solución:**
1. Verificar que `.env.local` existe en la raíz
2. Verificar que tiene `VITE_CLOUDINARY_CLOUD_NAME=`
3. Reiniciar dev server: `npm run dev`
4. Limpiar cache del navegador: Ctrl+Shift+Del

### Error: "CORS error al subir"
**Solución:**
- Cloudinary debería permitir CORS automáticamente
- Hacer login nuevamente en Cloudinary
- Verificar que Cloud Name es correcto

### Error: "Foto no se sube"
**Solución:**
1. Verificar que la foto es < 5MB
2. Intentar con una foto diferente (formato JPG/PNG)
3. Verificar conexión a internet
4. Revisar consola del navegador para errores específicos

---

## 📚 REFERENCIAS

- **Doc Oficial:** https://cloudinary.com/documentation
- **API Upload:** https://cloudinary.com/documentation/upload_images
- **Upload Widget:** https://cloudinary.com/documentation/cloudinary_widget

---

## ✅ PRÓXIMOS PASOS

Una vez configurado Cloudinary:
1. Subir una foto en `/publicaciones/nueva`
2. Crear el test para PhotoUploader
3. Verificar que URL se guarda en publicación
4. Pasar a Tests Unitarios

---

**Estado:** Listo para testing manual 🚀
