/**
 * E2E — Autenticación (Proceso 1)
 *
 * Cubre:
 *  1. Rutas protegidas redirigen a /login sin sesión
 *  2. Login con credenciales inválidas muestra error
 *  3. Login con credenciales válidas redirige al dashboard
 *  4. Logout limpia la sesión y redirige a /login
 *  5. Flujo de recuperación de contraseña (ForgotPassword)
 *
 * Variables de entorno requeridas (archivo .env.test):
 *   VITE_TEST_EMAIL    — email de un usuario de prueba activo
 *   VITE_TEST_PASSWORD — contraseña de ese usuario
 */
import { test, expect } from '@playwright/test';

const TEST_EMAIL    = process.env.VITE_TEST_EMAIL    ?? 'test@nosee.com';
const TEST_PASSWORD = process.env.VITE_TEST_PASSWORD ?? 'Test1234!';

// ─── 1. Redirección de rutas protegidas ────────────────────────────────────
test('ruta protegida /perfil redirige a /login sin sesión', async ({ page }) => {
  await page.goto('/perfil');
  await expect(page).toHaveURL(/\/login/);
});

test('ruta protegida /dashboard redirige a /login sin sesión', async ({ page }) => {
  await page.goto('/dashboard');
  await expect(page).toHaveURL(/\/login/);
});

test('ruta protegida /publicaciones redirige a /login sin sesión', async ({ page }) => {
  await page.goto('/publicaciones');
  await expect(page).toHaveURL(/\/login/);
});

// ─── 2. Login con credenciales inválidas ───────────────────────────────────
test('login con contraseña incorrecta muestra mensaje de error', async ({ page }) => {
  await page.goto('/login');
  await page.getByLabel(/email/i).fill('usuario@incorrecto.com');
  await page.getByLabel(/contraseña/i).fill('wrongpassword');
  await page.getByRole('button', { name: /iniciar sesión/i }).click();
  await expect(page.getByRole('alert')).toBeVisible({ timeout: 8_000 });
});

// ─── 3. Login exitoso ─────────────────────────────────────────────────────
test('login exitoso redirige al dashboard', async ({ page }) => {
  await page.goto('/login');
  await page.getByLabel(/email/i).fill(TEST_EMAIL);
  await page.getByLabel(/contraseña/i).fill(TEST_PASSWORD);
  await page.getByRole('button', { name: /iniciar sesión/i }).click();
  // Después del login exitoso la app redirige a /dashboard
  await expect(page).toHaveURL(/\/dashboard/, { timeout: 10_000 });
});

// ─── 4. Logout ────────────────────────────────────────────────────────────
test('logout limpia sesión y redirige a /login', async ({ page }) => {
  // Primero autenticarse
  await page.goto('/login');
  await page.getByLabel(/email/i).fill(TEST_EMAIL);
  await page.getByLabel(/contraseña/i).fill(TEST_PASSWORD);
  await page.getByRole('button', { name: /iniciar sesión/i }).click();
  await expect(page).toHaveURL(/\/dashboard/, { timeout: 10_000 });

  // Cerrar sesión desde el dashboard
  await page.getByRole('button', { name: /salir|cerrar sesión/i }).click();
  await expect(page).toHaveURL(/\/login/, { timeout: 8_000 });

  // Verificar que ya no puede acceder a rutas protegidas
  await page.goto('/perfil');
  await expect(page).toHaveURL(/\/login/);
});

// ─── 5. Recuperación de contraseña ────────────────────────────────────────
test('formulario de recuperación acepta email y muestra confirmación', async ({ page }) => {
  await page.goto('/recuperar-contrasena');
  await expect(page.getByRole('heading', { name: /recupera/i })).toBeVisible();
  await page.getByLabel(/email/i).fill('usuario@nosee.com');
  await page.getByRole('button', { name: /enviar/i }).click();
  // Debe mostrar un mensaje de confirmación (no un error)
  await expect(
    page.getByText(/enlace|correo|email|enviado/i)
  ).toBeVisible({ timeout: 8_000 });
});
