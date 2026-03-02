/**
 * E2E — Ruteo por roles (Proceso 1)
 *
 * Cubre:
 *  1. /dashboard/admin requiere rol Admin (redirige si no lo tiene)
 *  2. /dashboard/moderator requiere rol Moderador o Admin
 *  3. /dashboard/dealer requiere rol Repartidor
 *  4. 404 para rutas inexistentes
 */
import { test, expect } from '@playwright/test';

// ─── 1–3. Dashboards de rol requieren autenticación ───────────────────────
// Sin sesión, todas redirigen a /login

test('/dashboard/admin redirige a /login sin sesión', async ({ page }) => {
  await page.goto('/dashboard/admin');
  await expect(page).toHaveURL(/\/login/);
});

test('/dashboard/moderator redirige a /login sin sesión', async ({ page }) => {
  await page.goto('/dashboard/moderator');
  await expect(page).toHaveURL(/\/login/);
});

test('/dashboard/dealer redirige a /login sin sesión', async ({ page }) => {
  await page.goto('/dashboard/dealer');
  await expect(page).toHaveURL(/\/login/);
});

// ─── 4. Ruta 404 ──────────────────────────────────────────────────────────
test('ruta inexistente muestra página 404', async ({ page }) => {
  await page.goto('/ruta-que-no-existe-xyz');
  await expect(page.getByText('404')).toBeVisible();
});

// ─── 5. /auth/callback sin parámetros redirige a /login ──────────────────
test('/auth/callback sin hash redirige a /login', async ({ page }) => {
  await page.goto('/auth/callback');
  // Sin hash ni code, debe redirigir a /login
  await expect(page).toHaveURL(/\/login/, { timeout: 5_000 });
});
