/**
 * TestRail — Proceso 3: Pedido y Optimización de Compra
 *
 * CP-011: Creación de lista de compras
 * CP-012: Ejecución del motor de optimización
 * CP-013: Visualización de resultados de la Cesta Óptima
 * CP-014: Confirmación de pedido
 * CP-015: Dashboard con pedidos según el rol
 *
 * Cómo ejecutar:
 *   npx playwright test tests/e2e/testrail/proceso-3-orders.spec.js
 *
 * ⚠️  REQUISITOS:
 *   - Debe haber al menos 2-3 publicaciones en el sistema para CP-011
 *   - Debe haber tiendas con ubicación para que la optimización funcione
 *   - Se necesita al menos 1 pedido confirmado para CP-015
 */

import { test, expect } from '@playwright/test';
import { shot, login, TEMP_EMAIL, TEMP_PASSWORD } from './helpers.js';

// ═════════════════════════════════════════════════════════════════════════════
// CP-011 — Creación de lista de compras
// ═════════════════════════════════════════════════════════════════════════════
test('CP-011 — Creación de lista de compras', async ({ page }) => {
  // 👉 PASO 1: Iniciar sesión
  await login(page, TEMP_EMAIL, TEMP_PASSWORD);

  // 👉 PASO 2: Ir a la HomePage para ver publicaciones
  await page.goto('/');
  await page.waitForTimeout(2000);

  // 👉 PASO 3: Agregar publicaciones a la lista
  // El "+ Lista" está dentro de un menú que se abre con el botón ⋮
  // 1. Abrir el menú de la primera publicación
  // 2. Click en "+ Lista"
  let addedCount = 0;
  const TOTAL_ITEMS = 3;

  for (let i = 0; i < TOTAL_ITEMS; i++) {
    try {
      // Click en el botón ⋮ de la tarjeta i-ésima (aria-label="Más opciones para ...")
      const dotsBtn = page.getByRole('button', { name: /más opciones/i }).nth(i);
      await dotsBtn.waitFor({ timeout: 3000 });
      await dotsBtn.click();
      await page.waitForTimeout(500);

      // Click en "Agregar a lista" dentro del menú desplegado
      const listaBtn = page.getByRole('menuitem', { name: /agregar a lista/i });
      await listaBtn.waitFor({ timeout: 2000 });
      if (await listaBtn.isVisible()) {
        await listaBtn.click();
        addedCount++;
        console.log(`  ✅ Item ${i + 1} agregado a la lista`);
        await page.waitForTimeout(1000);
      }
    } catch {
      console.log(`  ℹ️  Tarjeta ${i + 1}: no se pudo agregar. Total: ${addedCount}`);
      break;
    }
  }

  if (addedCount === 0) {
    console.log('  ⚠️  No se encontraron botones "+ Lista". No hay publicaciones en el sistema.');
    await shot(page, 'proceso-3/CP-011-sin-publicaciones.png');
    test.skip();
    return;
  }

  // 👉 PASO 4: Ir a la página de la lista de compras
  await page.goto('/lista');
  await page.waitForTimeout(2000);

  // 📸 CAPTURA DE PANTALLA
  await shot(page, 'proceso-3/CP-011-lista-compra.png');

  // ✅ VERIFICACIÓN MANUAL EN TESTRAIL:
  // - En la pestaña "Mi Lista" deben aparecer los productos agregados
  // - Cada producto debe tener checkbox y botón "Quitar"
  // - Debe mostrar la cantidad de productos (ej. "3 productos en lista")
});

// ═════════════════════════════════════════════════════════════════════════════
// CP-012 — Ejecución del motor de optimización
// ═════════════════════════════════════════════════════════════════════════════
test('CP-012 — Ejecución del motor de optimización', async ({ page }) => {
  // 👉 PASO 1: Iniciar sesión
  await login(page, TEMP_EMAIL, TEMP_PASSWORD);

  // 👉 PASO 2: Agregar items a la lista (cada test empieza limpio)
  await page.goto('/');
  await page.waitForTimeout(2000);
  for (let i = 0; i < 3; i++) {
    try {
      const dotsBtn = page.getByRole('button', { name: /más opciones/i }).nth(i);
      await dotsBtn.waitFor({ timeout: 3000 });
      await dotsBtn.click();
      await page.waitForTimeout(500);
      const listaBtn = page.getByRole('menuitem', { name: /agregar a lista/i });
      await listaBtn.waitFor({ timeout: 2000 });
      if (await listaBtn.isVisible()) {
        await listaBtn.click();
        await page.waitForTimeout(800);
      }
    } catch { break; }
  }

  // 👉 PASO 3: Ir a la lista de compras
  await page.goto('/lista');
  await page.waitForTimeout(2000);

  // Verificar que hay items
  const pageText = await page.textContent('body');
  if (pageText.includes('vacía') || pageText.includes('empty')) {
    console.log('  ⚠️  No se pudieron agregar items a la lista.');
    await shot(page, 'proceso-3/CP-012-lista-vacia.png');
    test.skip();
    return;
  }

  // 👉 PASO 4: Click en "✦ Optimizar lista"
  const optimBtn = page.getByRole('button', { name: /optimizar/i });
  await optimBtn.click();
  await page.waitForTimeout(2000);

  // 👉 PASO 5: Seleccionar estrategia de optimización
  // Elegir "Precio más bajo" (primera opción)
  const estrategias = page.getByRole('button', { name: /precio más bajo|menos tiendas|equilibrado/i });
  const primeraEstrategia = estrategias.first();
  if (await primeraEstrategia.isVisible()) {
    await primeraEstrategia.click();
    await page.waitForTimeout(500);
  }

  // 👉 PASO 5: Click en "Calcular Lista óptima" o "Calcular Pedido óptimo"
  const calcularBtn = page.getByRole('button', { name: /calcular/i }).first();
  if (await calcularBtn.isVisible()) {
    await calcularBtn.click();
  } else {
    console.log('  ⚠️  No se encontró botón de calcular.');
  }

  // 👉 PASO 6: Esperar a que el motor calcule
  await page.waitForTimeout(5000);

  // 📸 CAPTURA DE PANTALLA (haya funcionado o no)
  await shot(page, 'proceso-3/CP-012-optimizacion-calculada.png');

  // ✅ VERIFICACIÓN MANUAL EN TESTRAIL:
  // - Debe mostrar estado "Calculando..." y luego los resultados
  // - Resultados esperados: lista de tiendas con productos a comprar en cada una
  // - Debe mostrar el precio total optimizado
  //
  // ⚠️ POSIBLES PROBLEMAS:
  // - Si no hay tiendas con ubicación, el motor no puede optimizar
  // - Si hay errores de red, se muestra mensaje de error
  // - En cualquier caso, se tomó el pantallazo del resultado obtenido
});

// ═════════════════════════════════════════════════════════════════════════════
// CP-013 — Visualización de resultados de la Cesta Óptima
// ═════════════════════════════════════════════════════════════════════════════
test('CP-013 — Visualización de resultados de la Cesta Óptima', async ({ page }) => {
  // 👉 PASO 1: Iniciar sesión
  await login(page, TEMP_EMAIL, TEMP_PASSWORD);

  // 👉 PASO 2: Agregar items a la lista
  await page.goto('/');
  await page.waitForTimeout(2000);
  for (let i = 0; i < 3; i++) {
    try {
      const dotsBtn = page.getByRole('button', { name: /más opciones/i }).nth(i);
      await dotsBtn.waitFor({ timeout: 3000 });
      await dotsBtn.click();
      await page.waitForTimeout(500);
      const listaBtn = page.getByRole('menuitem', { name: /agregar a lista/i });
      await listaBtn.waitFor({ timeout: 2000 });
      if (await listaBtn.isVisible()) { await listaBtn.click(); await page.waitForTimeout(800); }
    } catch { break; }
  }

  // 👉 PASO 3: Ir a la lista e ir a optimización
  await page.goto('/lista');
  await page.waitForTimeout(2000);

  const pageText = await page.textContent('body');
  if (pageText.includes('vacía') || pageText.includes('empty')) {
    console.log('  ⚠️  Lista vacía.');
    await shot(page, 'proceso-3/CP-013-sin-datos.png');
    test.skip();
    return;
  }

  const optimBtn = page.getByRole('button', { name: /optimizar/i });
  if (await optimBtn.isVisible()) {
    await optimBtn.click();
    await page.waitForTimeout(2000);
  }

  // La optimización es inline (se calcula en la misma página al hacer click en "Optimizar")
  await page.waitForTimeout(5000);

  // 📸 CAPTURA: los resultados de la cesta optimizada
  await shot(page, 'proceso-3/CP-013-cesta-optimizada.png');

  // ✅ VERIFICACIÓN MANUAL EN TESTRAIL:
  // - Debe mostrar desglose por tienda: qué comprar en cada una
  // - Precio total y precio por tienda
  // - Mapa o direcciones de las tiendas seleccionadas
  // - Botón para confirmar: "Confirmar Lista óptima" o "Confirmar Pedido"
});

// ═════════════════════════════════════════════════════════════════════════════
// CP-014 — Confirmación de pedido
// ═════════════════════════════════════════════════════════════════════════════
test('CP-014 — Confirmación de pedido', async ({ page }) => {
  test.slow();

  // 👉 PASO 1: Iniciar sesión
  await login(page, TEMP_EMAIL, TEMP_PASSWORD);

  // 👉 PASO 2: Agregar items a la lista
  await page.goto('/');
  await page.waitForTimeout(2000);
  for (let i = 0; i < 3; i++) {
    try {
      const dotsBtn = page.getByRole('button', { name: /más opciones/i }).nth(i);
      await dotsBtn.waitFor({ timeout: 3000 });
      await dotsBtn.click();
      await page.waitForTimeout(500);
      const listaBtn = page.getByRole('menuitem', { name: /agregar a lista/i });
      await listaBtn.waitFor({ timeout: 2000 });
      if (await listaBtn.isVisible()) { await listaBtn.click(); await page.waitForTimeout(800); }
    } catch { break; }
  }

  // 👉 PASO 3: Ir a la lista y optimizar
  await page.goto('/lista');
  await page.waitForTimeout(2000);

  const pageText = await page.textContent('body');
  if (pageText.includes('vacía') || pageText.includes('empty')) {
    console.log('  ⚠️  Lista vacía.');
    await shot(page, 'proceso-3/CP-014-sin-lista.png');
    test.skip();
    return;
  }

  // Click en "✦ Optimizar lista"
  const optimBtn = page.getByRole('button', { name: /optimizar/i });
  if (await optimBtn.isVisible()) {
    await optimBtn.click();
    await page.waitForTimeout(5000);
  }

  // 👉 PASO 4: Click en "✦ Elegir cómo recibir mi pedido"
  const elegirBtn = page.getByRole('button', { name: /elegir cómo recibir/i });
  if (await elegirBtn.isVisible()) {
    await elegirBtn.click();
    await page.waitForTimeout(1000);
  }

  // 👉 PASO 5: Seleccionar modo "Domicilio"
  const domicilioOpt = page.getByRole('button', { name: /domicilio/i });
  if (await domicilioOpt.isVisible()) {
    await domicilioOpt.click();
    await page.waitForTimeout(500);
  }

  // 👉 PASO 6: Click en "Continuar con domicilio"
  const continuarBtn = page.getByRole('button', { name: /continuar con domicilio/i });
  if (await continuarBtn.isVisible()) {
    await continuarBtn.click();
    await page.waitForTimeout(1000);
  }

  // 👉 PASO 7: Llenar formulario de domicilio
  // Dirección de entrega
  const dirInput = page.locator('#delivery-address, input[placeholder*="dirección"], input[placeholder*="Dirección"]').first();
  if (await dirInput.isVisible().catch(() => false)) {
    await dirInput.fill('Calle 10 #25-30, Bogotá');
    await page.waitForTimeout(500);
  }

  // Nombre de quien recibe
  const nameInput = page.locator('#delivery-name, input[placeholder*="nombre"], input[placeholder*="Nombre"]').first();
  if (await nameInput.isVisible().catch(() => false)) {
    await nameInput.fill('Usuario TestRail');
    await page.waitForTimeout(500);
  }

  // 👉 PASO 8: Seleccionar pago en efectivo (default)
  const efectivoBtn = page.getByRole('button', { name: /efectivo/i });
  if (await efectivoBtn.isVisible().catch(() => false)) {
    await efectivoBtn.click();
    await page.waitForTimeout(500);
  }

  // 👉 PASO 9: Confirmar pedido
  const confirmarBtn = page.getByRole('button', { name: /confirmar pedido/i });
  if (await confirmarBtn.isVisible().catch(() => false)) {
    await confirmarBtn.click();
    await page.waitForTimeout(5000);
  }

  // 📸 CAPTURA: resultado final (pedido creado o formulario)
  await shot(page, 'proceso-3/CP-014-pedido-confirmado.png');

  // ✅ VERIFICACIÓN MANUAL EN TESTRAIL:
  // La captura debe mostrar el pedido creado (URL /pedido/:id)
  // o el formulario con los datos llenos listo para enviar.
  // Si ves el formulario aún, haz click en confirmar manualmente.
});

// ═════════════════════════════════════════════════════════════════════════════
// CP-015 — Dashboard con pedidos según el rol
// ═════════════════════════════════════════════════════════════════════════════
//
// REQUISITO: Variables de entorno ADMIN_EMAIL y ADMIN_PASSWORD
//   Ejecutar:  ADMIN_EMAIL="admin@email.com" ADMIN_PASSWORD="pass" npx playwright test ...
//
// AUTOSUFICIENTE: Este test crea SU PROPIO pedido para garantizar que
// "Mis Pedidos" tenga datos y que el admin vea logs reales.
//
test('CP-015 — Dashboard con pedidos según el rol', async ({ page, context }) => {
  test.slow();

  const ADMIN_EMAIL    = process.env.ADMIN_EMAIL;
  const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD;

  if (!ADMIN_EMAIL || !ADMIN_PASSWORD) {
    console.log('  ⚠️  Faltan ADMIN_EMAIL y ADMIN_PASSWORD en variables de entorno.');
    console.log('  Se tomará solo captura del usuario normal.');
  }

  // ─── PARTE 1: Usuario normal — CREAR pedido + capturar "Mis Pedidos" ────
  await login(page, TEMP_EMAIL, TEMP_PASSWORD);

  // 1a. Agregar items a la lista
  await page.goto('/');
  await page.waitForTimeout(2000);
  let added = 0;
  for (let i = 0; i < 3; i++) {
    try {
      const dotsBtn = page.getByRole('button', { name: /más opciones/i }).nth(i);
      await dotsBtn.waitFor({ timeout: 3000 });
      await dotsBtn.click();
      await page.waitForTimeout(500);
      const listaBtn = page.getByRole('menuitem', { name: /agregar a lista/i });
      await listaBtn.waitFor({ timeout: 2000 });
      if (await listaBtn.isVisible()) { await listaBtn.click(); added++; await page.waitForTimeout(800); }
    } catch { break; }
  }

  if (added === 0) {
    console.log('  ⚠️  No hay publicaciones para crear pedido. Tomando captura de lista vacía.');
    await page.goto('/lista');
    await page.waitForTimeout(2000);
    const pedidosTab = page.getByRole('button', { name: /mis pedidos/i });
    if (await pedidosTab.isVisible().catch(() => false)) { await pedidosTab.click(); await page.waitForTimeout(2000); }
    await shot(page, 'proceso-3/CP-015-pedidos-usuario.png');
    test.skip();
    return;
  }

  // 1b. Ir a la lista y optimizar
  await page.goto('/lista');
  await page.waitForTimeout(2000);

  const optimBtn = page.getByRole('button', { name: /optimizar/i });
  if (await optimBtn.isVisible()) {
    await optimBtn.click();
    await page.waitForTimeout(5000);
  }

  // 1c. Elegir cómo recibir → Domicilio
  const elegirBtn = page.getByRole('button', { name: /elegir cómo recibir/i });
  if (await elegirBtn.isVisible()) {
    await elegirBtn.click();
    await page.waitForTimeout(1000);
  }

  const domicilioOpt = page.getByRole('button', { name: /domicilio/i });
  if (await domicilioOpt.isVisible()) {
    await domicilioOpt.click();
    await page.waitForTimeout(500);
  }

  const continuarBtn = page.getByRole('button', { name: /continuar con domicilio/i });
  if (await continuarBtn.isVisible()) {
    await continuarBtn.click();
    await page.waitForTimeout(1000);
  }

  // 1d. Llenar formulario de domicilio
  const dirInput = page.locator('#delivery-address, input[placeholder*="dirección"], input[placeholder*="Dirección"]').first();
  if (await dirInput.isVisible().catch(() => false)) {
    await dirInput.fill('Calle 10 #25-30, Bogotá');
    await page.waitForTimeout(500);
  }

  const nameInput = page.locator('#delivery-name, input[placeholder*="nombre"], input[placeholder*="Nombre"]').first();
  if (await nameInput.isVisible().catch(() => false)) {
    await nameInput.fill('Usuario TestRail');
    await page.waitForTimeout(500);
  }

  // 1e. Confirmar pedido
  const confirmarBtn = page.getByRole('button', { name: /confirmar pedido/i });
  if (await confirmarBtn.isVisible().catch(() => false)) {
    await confirmarBtn.click();
    await page.waitForTimeout(5000);
  }

  // 1f. Ir a "Mis Pedidos" para ver el pedido creado
  await page.goto('/lista');
  await page.waitForTimeout(3000);

  // Click en la pestaña "Mis Pedidos" (las tabs son <button>, no role="tab")
  const pedidosTab = page.getByRole('button', { name: /mis pedidos/i });
  if (await pedidosTab.isVisible().catch(() => false)) {
    await pedidosTab.click();
    await page.waitForTimeout(3000);
    console.log('  ✅ Navegó a pestaña Mis Pedidos');
  }

  // 📸 CAPTURA 1: Pedidos del usuario normal (DEBE mostrar el pedido creado)
  await shot(page, 'proceso-3/CP-015-pedidos-usuario.png');

  // ─── PARTE 2: Admin — ver LOGS de auditoría ──────────────────────────
  if (ADMIN_EMAIL && ADMIN_PASSWORD) {
    // Limpiar sesión anterior
    await page.goto('/logout');
    await page.waitForTimeout(500);
    await context.clearCookies();
    await page.evaluate(() => localStorage.clear());

    // Login como admin
    await login(page, ADMIN_EMAIL, ADMIN_PASSWORD);

    // El admin redirige a /dashboard/admin
    await page.goto('/dashboard/admin');
    await page.waitForTimeout(3000);

    // Click en "Logs" en el sidebar del admin (accesible como "◎ Logs")
    const logsNav = page.getByRole('button', { name: /logs/i });
    if (await logsNav.isVisible().catch(() => false)) {
      await logsNav.click();
      await page.waitForTimeout(3000);
      console.log('  ✅ Navegó a sección de Logs');
    }

    // 📸 CAPTURA 2: Logs de auditoría del admin
    await shot(page, 'proceso-3/CP-015-dashboard-admin.png');
  } else {
    console.log('  ℹ️  Sin credenciales admin — solo captura de usuario normal.');
  }

  // ✅ VERIFICACIÓN MANUAL EN TESTRAIL:
  // Captura 1 (usuario normal - "Mis Pedidos" en /lista):
  //   - DEBE mostrar al menos 1 pedido de domicilio recién creado
  //   - Debe verse estado, tiendas, total del pedido
  //
  // Captura 2 (admin - sección Logs en /dashboard/admin):
  //   - DEBE mostrar los logs de auditoría del sistema
  //   - Debe incluir actividad del usuario (creación de pedido, login, etc.)
  //   - La tabla de logs debe tener entradas recientes
  //
  // Las credenciales de admin se pasan por variable de entorno (NO se guardan en código):
  //   ADMIN_EMAIL="correo" ADMIN_PASSWORD="contraseña" npx playwright test ...
});

// ═════════════════════════════════════════════════════════════════════════════
// ⚠️  ACCIONES MANUALES REQUERIDAS — LÉEME:
// ═════════════════════════════════════════════════════════════════════════════
//
// PARA CP-012 y CP-013:
//   Si la optimización falla, puede ser porque faltan:
//   - Tiendas con ubicación (latitud/longitud) en la BD
//   - Publicaciones con tiendas asignadas
//   Ve a /tiendas y verifica que existan tiendas con ubicación.
//
// PARA CP-014:
//   Después del click en "Confirmar", si aparecen campos de
//   dirección y método de pago, LLENA LOS DATOS MANUALMENTE
//   y luego vuelve a hacer click en confirmar.
//   Toma un pantallazo adicional del pedido creado en /pedido/:id
//
// PARA CP-015:
//   Si el usuario de pruebas no tiene pedidos, el dashboard
//   se verá vacío. El test sigue siendo válido — muestra
//   "No hay pedidos" que es el comportamiento esperado.
