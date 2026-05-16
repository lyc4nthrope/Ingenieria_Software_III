/**
 * Helpers compartidos para pruebas manuales con capturas TestRail
 *
 * USO:
 *   import { shot, login, TEST_EMAIL, TEST_PASSWORD } from './helpers.js';
 *
 *   await login(page);
 *   await shot(page, 'CP-XXX-descripcion.png');
 */
import path from 'path';
import { fileURLToPath } from 'url';
import { expect } from '@playwright/test';

// ─── Rutas de screenshots ──────────────────────────────────────────────────
const __dirname = path.dirname(fileURLToPath(import.meta.url));
const SCREENSHOTS_DIR = path.join(__dirname, 'screenshots');

/**
 * Toma una captura de pantalla y la guarda en screenshots/ (modo fullPage).
 * @param {import('@playwright/test').Page} page
 * @param {string} filename  — ej. "CP-001-registro-exitoso.png"
 */
export async function shot(page, filename) {
  await page.screenshot({
    path: path.join(SCREENSHOTS_DIR, filename),
    fullPage: true,
  });
  console.log(`  📸 Captura guardada: screenshots/${filename}`);
}

// ─── Credenciales existentes ───────────────────────────────────────────────
export const TEST_EMAIL    = process.env.VITE_TEST_EMAIL    ?? 'test@nosee.com';
export const TEST_PASSWORD = process.env.VITE_TEST_PASSWORD ?? 'Test1234!';

// ─── Usuario temporal (cámbialo antes de ejecutar CP-001) ───────────────────
export const TEMP_EMAIL    = 'firavix194@hilostar.com';
export const TEMP_PASSWORD = 'Test1234!';

/**
 * Inicia sesión con el usuario de pruebas.
 * Espera hasta que la URL contenga /dashboard.
 */
export async function login(page, email = TEST_EMAIL, password = TEST_PASSWORD) {
  await page.goto('/login');
  await page.waitForTimeout(500);

  // Limpiar campos por si acaso
  const emailInput = page.locator('#login-email');
  const passInput  = page.locator('#login-password');

  await emailInput.fill(email);
  await passInput.fill(password);
  await page.getByRole('button', { name: /iniciar sesión/i }).click();

  // Espera a que termine el login (redirige a dashboard, home o login con error)
  await page.waitForTimeout(3000);
}
