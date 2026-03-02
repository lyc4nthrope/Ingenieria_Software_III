// @ts-check
import { defineConfig, devices } from '@playwright/test';

/**
 * Configuración de Playwright para NØSEE
 * Cubre: login, registro, recuperación de contraseña, rutas protegidas, publicaciones
 *
 * Para correr las pruebas:
 *   npx playwright install          (solo la primera vez)
 *   npm run test:e2e                (modo headless)
 *   npm run test:e2e:ui             (modo visual interactivo)
 */
export default defineConfig({
  testDir: './tests/e2e',
  testMatch: '**/*.spec.js',

  // Tiempo máximo por prueba
  timeout: 30_000,
  expect: { timeout: 5_000 },

  // Reintentos en CI (0 en local para ver fallos rápido)
  retries: process.env.CI ? 2 : 0,
  workers: process.env.CI ? 1 : undefined,

  reporter: [
    ['list'],
    ['html', { outputFolder: 'playwright-report', open: 'never' }],
  ],

  use: {
    baseURL: 'http://localhost:5173',
    trace: 'on-first-retry',
    screenshot: 'only-on-failure',
    video: 'off',
  },

  projects: [
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'] },
    },
  ],

  // Levanta el servidor de dev antes de correr los tests
  webServer: {
    command: 'npm run dev',
    url: 'http://localhost:5173',
    reuseExistingServer: !process.env.CI,
    timeout: 30_000,
  },
});
