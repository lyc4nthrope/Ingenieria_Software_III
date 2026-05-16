/**
 * TestRail — Proceso 1: Gestión de Usuario y Autenticación
 *
 * CP-001: Registro de usuario exitoso
 * CP-002: Inicio de sesión con credenciales válidas
 * CP-003: Rechazo de credenciales inválidas
 * CP-004: Recuperación de contraseña
 * CP-005: Protección de rutas con ProtectedRoute
 *
 * Cómo ejecutar:
 *   npx playwright test tests/e2e/testrail/proceso-1-auth.spec.js
 *
 * Para un CP específico:
 *   npx playwright test tests/e2e/testrail/proceso-1-auth.spec.js --grep "CP-001"
 *
 * Las capturas se guardan en tests/e2e/testrail/screenshots/proceso-1/
 */

import { test, expect } from '@playwright/test';
import { shot, login, TEMP_EMAIL, TEMP_PASSWORD } from './helpers.js';

// ═════════════════════════════════════════════════════════════════════════════
// CP-001 — Registro de usuario exitoso
// ═════════════════════════════════════════════════════════════════════════════
test('CP-001 — Registro de usuario exitoso', async ({ page }) => {
  // 👉 PASO 1: Ir al formulario de registro
  await page.goto('/registro');
  await page.waitForTimeout(500);

  // 👉 PASO 2: Llenar datos del formulario
  await page.locator('#reg-fullname').fill('Usuario Prueba TestRail');
  await page.locator('#reg-email').fill(TEMP_EMAIL);
  await page.locator('#reg-password').fill(TEMP_PASSWORD);
  await page.locator('#reg-confirm').fill(TEMP_PASSWORD);

  // 👉 PASO 3: Aceptar términos
  await page.getByRole('checkbox').check();

  // 👉 PASO 4: Click en "Crear cuenta"
  await page.getByRole('button', { name: /crear cuenta/i }).click();

  // 👉 PASO 5: Esperar a que aparezca la pantalla de verificación
  // Después del registro exitoso, Supabase redirige a la vista de verificación
  await page.waitForTimeout(3000);

  // 📸 CAPTURA DE PANTALLA
  await shot(page, 'proceso-1/CP-001-registro-exitoso.png');

  // ✅ VERIFICACIÓN MANUAL EN TESTRAIL:
  // 1. Marcar como Superado si ves la pantalla de verificación de email
  // 2. Ir a https://www.mailinator.com y buscar TEMP_EMAIL
  //    para verificar que el email de confirmación llegó
});

// ═════════════════════════════════════════════════════════════════════════════
// CP-002 — Inicio de sesión con credenciales válidas
// ═════════════════════════════════════════════════════════════════════════════
test('CP-002 — Inicio de sesión con credenciales válidas', async ({ page }) => {
  // 👉 PASO 1: Ir al login
  await page.goto('/login');
  await page.waitForTimeout(500);

  // 👉 PASO 2: Llenar credenciales del usuario de pruebas
  await page.locator('#login-email').fill(TEMP_EMAIL);
  await page.locator('#login-password').fill(TEMP_PASSWORD);

  // 👉 PASO 3: Click en "Iniciar sesión"
  await page.getByRole('button', { name: /iniciar sesión/i }).click();

  // 👉 PASO 4: Esperar a que termine el login (redirige a /dashboard o a /)
  await page.waitForURL(/\/dashboard|\/$/, { timeout: 15_000 });

  // 📸 CAPTURA DE PANTALLA
  await shot(page, 'proceso-1/CP-002-login-exitoso.png');

  // ✅ VERIFICACIÓN MANUAL EN TESTRAIL:
  // - Si ves el dashboard (icono de usuario, menú): login exitoso ✅
  // - Si ves la home sin sesión (botón "Iniciar sesión"): login falló ❌
  //   → El email puede no estar verificado. Revisa hilostar.com
  //   → O usa el usuario test@nosee.com / Test1234!
});

// ═════════════════════════════════════════════════════════════════════════════
// CP-003 — Rechazo de credenciales inválidas
// ═════════════════════════════════════════════════════════════════════════════
test('CP-003 — Rechazo de credenciales inválidas', async ({ page }) => {
  // 👉 PASO 1: Ir al login
  await page.goto('/login');
  await page.waitForTimeout(500);

  // 👉 PASO 2: Llenar con credenciales falsas
  await page.locator('#login-email').fill('usuario-inexistente@correo-falso.com');
  await page.locator('#login-password').fill('ClaveIncorrecta999');

  // 👉 PASO 3: Click en "Iniciar sesión"
  await page.getByRole('button', { name: /iniciar sesión/i }).click();

  // 👉 PASO 4: Esperar mensaje de error (role="alert")
  await expect(page.getByRole('alert')).toBeVisible({ timeout: 10_000 });

  // 📸 CAPTURA DE PANTALLA
  await shot(page, 'proceso-1/CP-003-credenciales-invalidas.png');

  // ✅ VERIFICACIÓN MANUAL EN TESTRAIL:
  // - Debe mostrarse un mensaje de error visible (ej. "Credenciales inválidas")
  // - No debe redirigir a otra página
});

// ═════════════════════════════════════════════════════════════════════════════
// CP-004 — Recuperación de contraseña
// ═════════════════════════════════════════════════════════════════════════════
test('CP-004 — Recuperación de contraseña', async ({ page }) => {
  // 👉 PASO 1: Ir a "¿Olvidaste tu contraseña?" → /recuperar-contrasena
  await page.goto('/recuperar-contrasena');
  await page.waitForTimeout(500);

  // 👉 PASO 2: Escribir el email del usuario de pruebas
  await page.locator('#forgot-email').fill(TEMP_EMAIL);

  // 👉 PASO 3: Click en "Enviar enlace de recuperación"
  await page.getByRole('button', { name: /enviar enlace/i }).click();

  // 👉 PASO 4: Esperar vista de éxito (el texto cambia después de enviar)
  // Antes del envío se ve "Te enviaremos un enlace..."
  // Después del envío exitoso se ve "Enviamos un enlace de recuperación a:"
  await page.waitForTimeout(3000);
  await expect(
    page.getByText(/enviamos un enlace/i)
  ).toBeVisible({ timeout: 10_000 });

  // 📸 CAPTURA DE PANTALLA
  await shot(page, 'proceso-1/CP-004-recuperacion-enviada.png');

  // ✅ VERIFICACIÓN MANUAL EN TESTRAIL:
  // - Debe mostrar mensaje tipo "Enviamos un enlace de recuperación a: test@..."
  // - El enlace llega al correo del usuario
});

// ═════════════════════════════════════════════════════════════════════════════
// CP-005 — Protección de rutas con ProtectedRoute
// ═════════════════════════════════════════════════════════════════════════════
test('CP-005 — Protección de rutas con ProtectedRoute', async ({ page }) => {
  // 👉 PASO 1: Limpiar sesión (contexto nuevo = sin sesión)
  await page.goto('/logout');            // por si acaso había sesión
  await page.waitForTimeout(500);
  await page.context().clearCookies();
  await page.evaluate(() => localStorage.clear());

  // 👉 PASO 2: Intentar acceder a /perfil sin sesión
  await page.goto('/perfil');
  await page.waitForTimeout(2000);

  // 📸 CAPTURA 1: URL después de redirigir
  await shot(page, 'proceso-1/CP-005-ruta-protegida.png');

  // Verificar que NO estamos en /perfil sino en /login
  const url = page.url();
  expect(url).toContain('/login');

  // ✅ VERIFICACIÓN MANUAL EN TESTRAIL:
  // - La URL debe contener /login (redirección automática)
  // - No se debe ver el contenido de /perfil
  // - (Opcional) Repetir con /dashboard y /publicaciones/nueva
});

// ═════════════════════════════════════════════════════════════════════════════
// ⚠️  ACCIONES MANUALES REQUERIDAS — LÉEME:
// ═════════════════════════════════════════════════════════════════════════════
//
// DESPUÉS DE CP-001:
//   Ve a https://www.mailinator.com y busca el email:
//     testrail-cp001-{TIMESTAMP}@mailinator.com
//   Ahí debe estar el email de verificación de Supabase.
//   Si no aparece, revisa la carpeta SPAM en mailinator.
//
// PARA CP-002:
//   Si el usuario recién creado (TEMP_EMAIL) no puede hacer login
//   porque el email no está verificado, USA el usuario de siempre:
//   - Email: test@nosee.com
//   - Pass:  Test1234!
//   Para eso, modifica TEMP_EMAIL en helpers.js o crea una variable
//   de entorno VITE_TEST_EMAIL y VITE_TEST_PASSWORD
