/**
 * Auth Schemas - Validaciones y tipos
 * 
 * Define contratos de validación para inputs y outputs del feature auth
 * Puede usar Zod, Yup, o TypeScript puro según preferencia
 * 
 * Instalación (cuando sea): npm install zod
 */

// Ejemplo con comentarios (implementar cuando agregues Zod)
/*
import { z } from 'zod';

// ====== INPUT SCHEMAS ======

export const SignUpSchema = z.object({
  email: z.string().email('Email inválido'),
  password: z.string()
    .min(8, 'Mínimo 8 caracteres')
    .regex(/[A-Z]/, 'Debe contener al menos una mayúscula')
    .regex(/[0-9]/, 'Debe contener al menos un número'),
  confirmPassword: z.string(),
  full_name: z.string().min(2, 'Nombre muy corto'),
}).refine(data => data.password === data.confirmPassword, {
  message: "Las contraseñas no coinciden",
  path: ["confirmPassword"],
});

export const SignInSchema = z.object({
  email: z.string().email('Email inválido'),
  password: z.string().min(1, 'Contraseña requerida'),
});

export const ResetPasswordSchema = z.object({
  email: z.string().email('Email inválido'),
});

export const UpdateProfileSchema = z.object({
  full_name: z.string().min(2).optional(),
  avatar_url: z.string().url().optional(),
}).strict();

// ====== OUTPUT SCHEMAS ======

export const AuthUserSchema = z.object({
  id: z.string().uuid(),
  email: z.string().email(),
  full_name: z.string().nullable(),
  role: z.enum(['user', 'admin']),
  created_at: z.string().datetime(),
});

export const SessionSchema = z.object({
  user: AuthUserSchema,
  access_token: z.string(),
  refresh_token: z.string().optional(),
  expires_in: z.number(),
});

// ====== TIPOS DERIVADOS ======
export type SignUpInput = z.infer<typeof SignUpSchema>;
export type SignInInput = z.infer<typeof SignInSchema>;
export type AuthUser = z.infer<typeof AuthUserSchema>;
export type Session = z.infer<typeof SessionSchema>;
*/

// Por ahora, tipos TypeScript simples:

export const SignUpValidation = {
  email: (email) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email),
  password: (pwd) => pwd.length >= 8,
  confirmPassword: (pwd, confirm) => pwd === confirm,
};

export const SignInValidation = {
  email: (email) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email),
  password: (pwd) => pwd.length > 0,
};

/**
 * Tipos globales del feature auth
 * (cuando migres a TypeScript completo, muévelos a src/types/)
 */
export const AuthTypes = {
  SignUpInput: `{
    email: string;
    password: string;
    confirmPassword: string;
    full_name: string;
  }`,
  
  SignInInput: `{
    email: string;
    password: string;
  }`,
  
  AuthUser: `{
    id: string;
    email: string;
    full_name: string | null;
    role: 'user' | 'admin';
    created_at: string;
    updated_at: string;
  }`,

  Session: `{
    user: AuthUser;
    access_token: string;
    refresh_token?: string;
    expires_in: number;
  }`,
};
