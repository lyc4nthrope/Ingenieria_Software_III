/**
 * Integration Tests Example - Auth with Supabase
 * 
 * Para ejecutar (cuando instales vitest):
 * npm test -- tests/integration/auth.test.js --run
 * 
 * Requisitos:
 * - npm install vitest @vitest/ui --save-dev
 * - npm install --save vitest (si no lo hizo el primer comando)
 * 
 * Referencia: https://vitest.dev/
 */

// COMENTADO HASTA QUE INSTALES VITEST
/*
import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { supabase } from '@/services/supabase.client';
import * as authApi from '@/services/api/auth.api';
import * as usersApi from '@/services/api/users.api';
import { parseSupabaseError } from '@/shared/errors';

describe('Auth Integration Tests', () => {
  const testEmail = `test-${Date.now()}@example.com`;
  const testPassword = 'TestPassword123!';
  let userId = null;

  describe('Authentication Flow', () => {
    it('should sign up a new user', async () => {
      const result = await authApi.signUp(testEmail, testPassword);

      expect(result.success).toBe(true);
      expect(result.data.user).toBeDefined();
      expect(result.data.user.email).toBe(testEmail);
      userId = result.data.user.id;
    });

    it('should not allow duplicate sign up', async () => {
      const result = await authApi.signUp(testEmail, testPassword);

      expect(result.success).toBe(false);
      expect(result.error).toContain('already registered');
    });

    it('should sign in with correct credentials', async () => {
      const result = await authApi.signIn(testEmail, testPassword);

      expect(result.success).toBe(true);
      expect(result.data.session).toBeDefined();
      expect(result.data.session.access_token).toBeDefined();
    });

    it('should fail sign in with wrong password', async () => {
      const result = await authApi.signIn(testEmail, 'WrongPassword123!');

      expect(result.success).toBe(false);
      expect(result.error).toContain('credentials');
    });
  });

  describe('User Profile Management', () => {
    it('should create user profile in database', async () => {
      const result = await usersApi.createUserProfile(userId, {
        email: testEmail,
        full_name: 'Test User',
      });

      expect(result.success).toBe(true);
      expect(result.data[0].id).toBe(userId);
    });

    it('should retrieve user profile', async () => {
      const result = await usersApi.getUserProfile(userId);

      expect(result.success).toBe(true);
      expect(result.data.email).toBe(testEmail);
      expect(result.data.full_name).toBe('Test User');
    });

    it('should update user profile', async () => {
      const result = await usersApi.updateUserProfile(userId, {
        full_name: 'Updated Name',
      });

      expect(result.success).toBe(true);
      expect(result.data[0].full_name).toBe('Updated Name');
    });
  });

  describe('Row Level Security (RLS)', () => {
    it('should not allow user to see other users profile', async () => {
      // Este test requiere múltiples sesiones
      // Se implementaría creando otro usuario y verificando acceso restringido
      expect(true).toBe(true); // Placeholder
    });
  });

  afterAll(async () => {
    // Limpiar datos de test
    if (userId) {
      await usersApi.deleteUserProfile(userId);
      // Eliminar auth user también (si es posible)
    }
  });
});
*/

export const authIntegrationTestsDummy = true;
