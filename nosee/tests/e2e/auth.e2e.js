/**
 * E2E Tests Example
 * 
 * Para ejecutar (cuando instales Playwright o Cypress):
 * npm test:e2e
 * 
 * Instalación:
 * npm install --save-dev @playwright/test
 * o
 * npm install --save-dev cypress
 */

// COMENTADO HASTA QUE INSTALES PLAYWRIGHT O CYPRESS
/*
import { test, expect } from '@playwright/test';

test.describe('E2E - Auth Flow', () => {
  test('should complete sign up and login flow', async ({ page }) => {
    const testEmail = `test-${Date.now()}@example.com`;
    const testPassword = 'TestPassword123!';

    // Navegar a página de registro
    await page.goto('/auth/register');

    // Llenar formulario de registro
    await page.fill('[data-testid="email-input"]', testEmail);
    await page.fill('[data-testid="password-input"]', testPassword);
    await page.fill('[data-testid="confirm-password-input"]', testPassword);
    await page.fill('[data-testid="fullname-input"]', 'Test User');

    // Enviar formulario
    await page.click('[data-testid="signup-button"]');

    // Esperar redirección
    await page.waitForURL('/auth/verify-email');
    expect(page.url()).toContain('/verify-email');
  });

  test('should show error on invalid credentials', async ({ page }) => {
    await page.goto('/auth/login');

    await page.fill('[data-testid="email-input"]', 'invalid@example.com');
    await page.fill('[data-testid="password-input"]', 'WrongPassword');

    await page.click('[data-testid="login-button"]');

    const errorMessage = page.locator('[data-testid="error-message"]');
    await expect(errorMessage).toContainText('Email o contraseña');
  });
});
*/

export const e2eTestsDummy = true;
