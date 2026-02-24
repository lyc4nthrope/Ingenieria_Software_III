/**
 * Unit Tests Example - Mappers
 * 
 * Para ejecutar (cuando instales vitest):
 * npm test -- tests/unit/auth.mappers.test.js --run
 */

// COMENTADO HASTA QUE INSTALES VITEST
/*
import { describe, it, expect } from 'vitest';
import {
  mapSupabaseUserToUI,
  mapAuthErrorToUI,
  mapDBUserToUI,
  mapProfileFormToAPI,
} from '@/features/auth/mappers';

describe('Auth Mappers', () => {
  describe('mapSupabaseUserToUI', () => {
    it('should map null to null', () => {
      const result = mapSupabaseUserToUI(null);
      expect(result).toBeNull();
    });

    it('should map Supabase user correctly', () => {
      const supabaseUser = {
        id: '123-456',
        email: 'test@example.com',
      };

      const result = mapSupabaseUserToUI(supabaseUser);

      expect(result).toEqual({
        id: '123-456',
        email: 'test@example.com',
      });
    });
  });

  describe('mapAuthErrorToUI', () => {
    it('should map invalid_credentials error', () => {
      const error = { code: 'invalid_credentials' };
      const result = mapAuthErrorToUI(error);

      expect(result).toBe('Email o contraseña incorrectos');
    });

    it('should map user_already_exists error', () => {
      const error = { code: 'user_already_exists' };
      const result = mapAuthErrorToUI(error);

      expect(result).toBe('Este email ya está registrado');
    });

    it('should return custom message for unknown error', () => {
      const error = { message: 'Custom error' };
      const result = mapAuthErrorToUI(error);

      expect(result).toBe('Custom error');
    });
  });

  describe('mapDBUserToUI', () => {
    it('should map database user to UI format', () => {
      const dbUser = {
        id: '123',
        email: 'test@example.com',
        full_name: 'Test User',
        role: 'user',
        avatar_url: 'https://example.com/avatar.jpg',
        created_at: '2024-01-01T00:00:00Z',
        updated_at: '2024-01-02T00:00:00Z',
      };

      const result = mapDBUserToUI(dbUser);

      expect(result.id).toBe('123');
      expect(result.fullName).toBe('Test User');
      expect(result.role).toBe('user');
      expect(result.createdAt).toBeInstanceOf(Date);
    });
  });

  describe('mapProfileFormToAPI', () => {
    it('should only include changed fields', () => {
      const profileData = {
        fullName: 'New Name',
        avatarUrl: 'https://example.com/new.jpg',
      };

      const result = mapProfileFormToAPI(profileData);

      expect(result).toEqual({
        full_name: 'New Name',
        avatar_url: 'https://example.com/new.jpg',
      });
    });

    it('should exclude undefined fields', () => {
      const profileData = {
        fullName: 'New Name',
        avatarUrl: undefined,
      };

      const result = mapProfileFormToAPI(profileData);

      expect(result).toEqual({
        full_name: 'New Name',
      });
    });
  });
});
*/

export const authMappersTestsDummy = true;
