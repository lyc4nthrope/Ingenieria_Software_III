/**
 * E2E — Publicaciones (Proceso 2)
 *
 * Cubre:
 *  1. Homepage muestra publicaciones sin estar autenticado
 *  2. Botones de votar/reportar deshabilitados sin sesión
 *  3. Usuario autenticado puede ver el formulario de crear publicación
 *  4. Filtros de búsqueda funcionan (expandir/colapsar)
 *  5. Usuario no autenticado NO puede acceder a /publicaciones/nueva
 */
import { test, expect } from '@playwright/test';

const TEST_EMAIL    = process.env.VITE_TEST_EMAIL    ?? 'test@nosee.com';
const TEST_PASSWORD = process.env.VITE_TEST_PASSWORD ?? 'Test1234!';

// Helper: autenticar en cada test que lo necesite
async function login(page) {
  await page.goto('/login');
  await page.getByLabel(/email/i).fill(TEST_EMAIL);
  await page.getByLabel(/contraseña/i).fill(TEST_PASSWORD);
  await page.getByRole('button', { name: /iniciar sesión/i }).click();
  await expect(page).toHaveURL(/\/dashboard/, { timeout: 10_000 });
}

// ─── 1. Homepage pública ───────────────────────────────────────────────────
test('homepage carga sin autenticación', async ({ page }) => {
  await page.goto('/');
  await expect(page).toHaveURL('/');
  await expect(page.getByText(/NØSEE|bienvenidos/i)).toBeVisible();
});

// ─── 2. Acciones deshabilitadas sin sesión ────────────────────────────────
test('botón Validar está deshabilitado sin sesión', async ({ page }) => {
  await page.goto('/');
  // Esperar a que carguen las publicaciones (si las hay)
  const validateBtn = page.getByRole('button', { name: /validar/i }).first();
  // Si existe, debe estar disabled
  if (await validateBtn.count() > 0) {
    await expect(validateBtn).toBeDisabled();
  }
});

// ─── 3. Formulario de crear publicación requiere auth ─────────────────────
test('ruta /publicaciones/nueva redirige a /login sin sesión', async ({ page }) => {
  await page.goto('/publicaciones/nueva');
  await expect(page).toHaveURL(/\/login/);
});

test('usuario autenticado accede a /publicaciones/nueva', async ({ page }) => {
  await login(page);
  await page.goto('/publicaciones/nueva');
  await expect(page).toHaveURL(/\/publicaciones\/nueva/);
  // Debe mostrar el formulario
  await expect(
    page.getByRole('heading', { name: /publicación|publica|nueva/i })
  ).toBeVisible({ timeout: 8_000 });
});

// ─── 4. Filtros de búsqueda ────────────────────────────────────────────────
test('filtros se expanden y colapsan en la homepage', async ({ page }) => {
  await page.goto('/');
  // El panel de filtros debe estar visible
  const filterToggle = page.getByRole('button', { name: /▶|▼/ }).first();
  if (await filterToggle.count() > 0) {
    // Expandir
    await filterToggle.click();
    await expect(page.getByLabel(/producto/i)).toBeVisible();
    // Colapsar
    await filterToggle.click();
    await expect(page.getByLabel(/producto/i)).not.toBeVisible();
  }
});

// ─── 5. Acceso a /tiendas/nueva requiere auth ─────────────────────────────
test('ruta /tiendas/nueva redirige a /login sin sesión', async ({ page }) => {
  await page.goto('/tiendas/nueva');
  await expect(page).toHaveURL(/\/login/);
});
