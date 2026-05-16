/**
 * TestRail — Proceso 2: Gestión de Publicaciones
 *
 * CP-006: Creación de publicación exitosa
 * CP-007: Votación en publicación existente
 * CP-008: Rechazo de voto duplicado
 * CP-009: Carga de imagen de evidencia a Cloudinary
 * CP-010: Selección de tienda mediante geolocalización
 *
 * Cómo ejecutar:
 *   npx playwright test tests/e2e/testrail/proceso-2-publications.spec.js
 *
 * Para un CP específico:
 *   npx playwright test ... --grep "CP-006"
 *
 * ⚠️  REQUISITOS:
 *   - Debe haber productos y tiendas en la BD para CP-006
 *   - Debe haber al menos 1 publicación para CP-007 y CP-008
 *   - Para CP-009 se necesita una imagen de prueba (se genera automáticamente)
 */

import { test, expect } from '@playwright/test';
import { shot, login, TEMP_EMAIL, TEMP_PASSWORD } from './helpers.js';
import path from 'path';
import { fileURLToPath } from 'url';
import fs from 'fs';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

// Genera una imagen PNG mínima de 1x1 pixel para usar como archivo de prueba
function generarImagenPrueba() {
  const imgDir = path.join(__dirname, 'screenshots', 'proceso-2');
  if (!fs.existsSync(imgDir)) fs.mkdirSync(imgDir, { recursive: true });
  const imgPath = path.join(imgDir, '__test-image.png');
  if (!fs.existsSync(imgPath)) {
    // PNG mínimo de 1x1 pixel blanco
    const png = Buffer.from([
      0x89, 0x50, 0x4E, 0x47, 0x0D, 0x0A, 0x1A, 0x0A, // header
      0x00, 0x00, 0x00, 0x0D, 0x49, 0x48, 0x44, 0x52, // IHDR chunk
      0x00, 0x00, 0x00, 0x01, 0x00, 0x00, 0x00, 0x01, // 1x1 pixel
      0x08, 0x02, 0x00, 0x00, 0x00, 0x90, 0x77, 0x53,
      0xDE, 0x00, 0x00, 0x00, 0x0C, 0x49, 0x44, 0x41,
      0x54, 0x08, 0xD7, 0x63, 0x60, 0x60, 0x60, 0x00,
      0x00, 0x00, 0x04, 0x00, 0x01, 0x27, 0x34, 0x27,
      0x0F, 0x00, 0x00, 0x00, 0x00, 0x49, 0x45, 0x4E,
      0x44, 0xAE, 0x42, 0x60, 0x82,                 // IEND
    ]);
    fs.writeFileSync(imgPath, png);
  }
  return imgPath;
}

const TEST_IMAGE = generarImagenPrueba();

// ═════════════════════════════════════════════════════════════════════════════
// CP-006 — Creación de publicación exitosa
// ═════════════════════════════════════════════════════════════════════════════
test('CP-006 — Creación de publicación exitosa', async ({ page }) => {
  test.slow(); // Triplica el timeout (90s en vez de 30s)
  // 👉 PASO 1: Iniciar sesión
  await login(page, TEMP_EMAIL, TEMP_PASSWORD);

  // 👉 PASO 2: Ir al formulario de nueva publicación
  await page.goto('/publicaciones/nueva', { waitUntil: 'networkidle' });
  await page.waitForTimeout(2000);

  // Verificar que la página cargó correctamente
  const urlActual = page.url();
  console.log(`  ℹ️  URL después de navegar: ${urlActual}`);
  const tituloVisible = await page.getByText(/publicaci|nueva/i).isVisible().catch(() => false);
  console.log(`  ℹ️  ¿Título visible? ${tituloVisible}`);

  // Si no está en /publicaciones/nueva, tomar captura y saltar
  if (!urlActual.includes('/publicaciones/nueva')) {
    console.log('  ⚠️  No se pudo acceder a /publicaciones/nueva. Tomando captura del estado actual.');
    await shot(page, 'proceso-2/CP-006-error-acceso.png');
    return;
  }

  // 👉 PASO 3: Llenar producto (autocomplete)
  // El dropdown pone "+ Crear" PRIMERO y los resultados después
  await page.locator('#pub-product').fill('Leche');
  await page.waitForTimeout(2000);

  try {
    // Esperar a que aparezca el dropdown
    await page.locator('#pub-product-listbox').waitFor({ timeout: 5000 });
    // Tomar la SEGUNDA opción (la primera es "+ Crear", la segunda es el producto real)
    const opciones = page.locator('#pub-product-listbox [role="option"]');
    const totalOps = await opciones.count();
    console.log(`  ℹ️  Opciones en dropdown de productos: ${totalOps}`);

    if (totalOps >= 2) {
      // Hay al menos 1 resultado real (opción 2+)
      await opciones.nth(1).click();
      console.log('  ✅ Producto seleccionado del autocomplete');
    } else if (totalOps === 1) {
      // Solo está "+ Crear" — hacer click para crear el producto
      await opciones.first().click();
      console.log('  ℹ️  Solo está +Crear. Abriendo modal de creación...');
      await page.waitForTimeout(2000);
    } else {
      console.log('  ℹ️  No hay opciones en el dropdown.');
    }
  } catch {
    console.log('  ⚠️  No apareció el dropdown de productos.');
  }

  // 👉 PASO 4: Llenar tienda (autocomplete)
  // Misma estructura: "+ Crear" es la opción 0, resultados desde opción 1
  await page.locator('#pub-store').fill('Tienda');
  await page.waitForTimeout(2000);

  try {
    await page.locator('#pub-store-listbox').waitFor({ timeout: 5000 });
    const opcionesTienda = page.locator('#pub-store-listbox [role="option"]');
    const totalTiendas = await opcionesTienda.count();
    console.log(`  ℹ️  Opciones en dropdown de tiendas: ${totalTiendas}`);

    if (totalTiendas >= 2) {
      await opcionesTienda.nth(1).click();
      console.log('  ✅ Tienda seleccionada del autocomplete');
    } else if (totalTiendas === 1) {
      await opcionesTienda.first().click();
      console.log('  ℹ️  Abriendo modal de creación de tienda...');
      await page.waitForTimeout(2000);
    } else {
      console.log('  ℹ️  No hay opciones en el dropdown de tiendas.');
    }
  } catch {
    console.log('  ⚠️  No apareció el dropdown de tiendas.');
  }

  // 👉 PASO 5: Llenar precio y descripción vía JavaScript (más directo)
  await page.waitForTimeout(1000);
  await page.evaluate(() => {
    const price = document.querySelector('#pub-price');
    if (price) {
      price.value = '';
      price.value = '15000';
      price.dispatchEvent(new Event('input', { bubbles: true }));
      price.dispatchEvent(new Event('change', { bubbles: true }));
    }
    const desc = document.querySelector('#pub-description');
    if (desc) {
      desc.value = 'Publicación de prueba para TestRail CP-006';
      desc.dispatchEvent(new Event('input', { bubbles: true }));
    }
  });
  await page.waitForTimeout(500);

  // 👉 PASO 7: Click en "Confirmar publicación"
  await page.getByRole('button', { name: /confirmar publicación/i }).click();

  // 👉 PASO 8: Esperar resultado (éxito o error)
  await page.waitForTimeout(4000);

  // 📸 CAPTURA DE PANTALLA
  await shot(page, 'proceso-2/CP-006-publicacion-creada.png');

  // ✅ VERIFICACIÓN MANUAL EN TESTRAIL:
  // - Si la publicación se creó: debe redirigir y mostrar confirmación
  // - Si faltan datos obligatorios: se ven errores de validación en rojo
  //   (producto/tienda no existen en BD) — en ese caso, USA la app manualmente:
  //   1. Crea un producto desde el formulario (+ Crear "Leche")
  //   2. Crea una tienda desde el formulario (+ Crear tienda "Tienda")
  //   3. Llena precio y descripción
  //   4. Click en "Confirmar publicación"
  //   5. Vuelve a ejecutar este test
});

// ═════════════════════════════════════════════════════════════════════════════
// CP-007 — Votación en publicación existente
// ═════════════════════════════════════════════════════════════════════════════
test('CP-007 — Votación en publicación existente', async ({ page }) => {
  // 👉 PASO 1: Iniciar sesión
  await login(page, TEMP_EMAIL, TEMP_PASSWORD);

  // 👉 PASO 2: Ir a la HomePage donde están las publicaciones
  await page.goto('/');
  await page.waitForTimeout(2000);

  // 👉 PASO 3: Buscar el botón "✓ Validar" en la primera publicación
  const validarBtn = page.getByRole('button', { name: /validar/i }).first();

  // Verificar que existe al menos una publicación para votar
  const btnCount = await validarBtn.count();
  if (btnCount === 0) {
    console.log('  ⚠️  No hay publicaciones para votar. El test se salta.');
    await shot(page, 'proceso-2/CP-007-sin-publicaciones.png');
    test.skip();
    return;
  }

  // 👉 PASO 4: Click en "✓ Validar"
  await validarBtn.click();
  await page.waitForTimeout(1500);

  // 📸 CAPTURA DE PANTALLA
  await shot(page, 'proceso-2/CP-007-voto-exitoso.png');

  // ✅ VERIFICACIÓN MANUAL EN TESTRAIL:
  // - El botón debe cambiar a "✓ Validado"
  // - El contador de validaciones debe aumentar
});

// ═════════════════════════════════════════════════════════════════════════════
// CP-008 — Rechazo de voto duplicado
// ═════════════════════════════════════════════════════════════════════════════
test('CP-008 — Rechazo de voto duplicado', async ({ page }) => {
  // 👉 PASO 1: Iniciar sesión
  await login(page, TEMP_EMAIL, TEMP_PASSWORD);

  // 👉 PASO 2: Ir a la HomePage
  await page.goto('/');
  await page.waitForTimeout(2000);

  // 👉 PASO 3: Buscar botón "✓ Validar" o "✓ Validado"
  const votarBtn = page.getByRole('button', { name: /validar|validado/i }).first();

  const btnCount = await votarBtn.count();
  if (btnCount === 0) {
    console.log('  ⚠️  No hay publicaciones. Test saltado.');
    await shot(page, 'proceso-2/CP-008-sin-publicaciones.png');
    test.skip();
    return;
  }

  // Si el botón dice "✓ Validar" (no ha votado aún), votar primero
  const btnText = await votarBtn.textContent();
  if (btnText.includes('Validar')) {
    await votarBtn.click();
    await page.waitForTimeout(1500);
  }

  // 👉 PASO 4: Intentar votar de nuevo (click en "✓ Validado")
  const mismoBtn = page.getByRole('button', { name: /validado/i }).first();
  if (await mismoBtn.isVisible()) {
    await mismoBtn.click();
    await page.waitForTimeout(1500);
  }

  // 📸 CAPTURA DE PANTALLA
  await shot(page, 'proceso-2/CP-008-voto-duplicado.png');

  // ✅ VERIFICACIÓN MANUAL EN TESTRAIL:
  // - El voto NO debe duplicarse (el contador no aumenta al doble)
  // - Según implementación: el voto se togglea (se quita) o se ignora
  // - Cualquiera de los dos comportamientos es válido mientras no se duplique
});

// ═════════════════════════════════════════════════════════════════════════════
// CP-009 — Carga de imagen de evidencia a Cloudinary
// ═════════════════════════════════════════════════════════════════════════════
test('CP-009 — Carga de imagen de evidencia a Cloudinary', async ({ page }) => {
  // 👉 PASO 1: Iniciar sesión
  await login(page, TEMP_EMAIL, TEMP_PASSWORD);

  // 👉 PASO 2: Ir al formulario de nueva tienda
  await page.goto('/tiendas/nueva');
  await page.waitForTimeout(1000);

  // 👉 PASO 3: Llenar nombre de la tienda
  await page.locator('#store-name').fill('Tienda TestRail CP-009');

  // 👉 PASO 4: Subir imagen de evidencia
  // El input file está oculto (display:none), pero setInputFiles igual funciona
  const fileInput = page.locator('input[type="file"]');
  await fileInput.setInputFiles(TEST_IMAGE);
  await page.waitForTimeout(3000);

  // 📸 CAPTURA DE PANTALLA
  await shot(page, 'proceso-2/CP-009-imagen-cloudinary.png');

  // ✅ VERIFICACIÓN MANUAL EN TESTRAIL:
  // - Debe verse la miniatura de la imagen cargada
  // - No debe haber errores visibles
  // - La URL de la imagen se sube a Cloudinary automáticamente
  //
  // ⚠️ Si la imagen no se sube (error 400/401):
  //   Puede que Cloudinary requiera autenticación adicional.
  //   En ese caso, sube la imagen manualmente y toma el pantallazo.
});

// ═════════════════════════════════════════════════════════════════════════════
// CP-010 — Selección de tienda mediante geolocalización
// ═════════════════════════════════════════════════════════════════════════════
test('CP-010 — Selección de tienda mediante geolocalización', async ({ page }) => {
  // 👉 PASO 1: Iniciar sesión
  await login(page, TEMP_EMAIL, TEMP_PASSWORD);

  // 👉 PASO 2: Ir a la página de tiendas cercanas
  await page.goto('/tiendas/cercanas');
  await page.waitForTimeout(3000);

  // 👉 PASO 3: Esperar a que cargue el mapa de Leaflet
  // El mapa renderiza contenedores .leaflet-container
  try {
    await page.locator('.leaflet-container').waitFor({ timeout: 8000 });
    console.log('  ✅ Mapa Leaflet cargado');
  } catch {
    console.log('  ⚠️  El mapa Leaflet no cargó. Puede ser por falta de tile server.');
  }

  // 📸 CAPTURA DE PANTALLA
  await shot(page, 'proceso-2/CP-010-geolocalizacion.png');

  // ✅ VERIFICACIÓN MANUAL EN TESTRAIL:
  // - El mapa debe mostrarse con los tiles de OpenStreetMap
  // - Deben verse marcadores de tiendas cercanas (si hay datos)
  // - Si el navegador pide permiso de ubicación, puedes concederlo manualmente
  //
  // ⚠️ En modo headless, la geolocalización del navegador no funciona.
  //   En el pantallazo se verá el mapa sin ubicación. Es normal.
  //   Para probar la geolocalización real, usa: npm run test:e2e:ui
  //   (modo interactivo con navegador visible)
});
