/**
 * roleUtils.js
 *
 * Utilidades de enrutamiento por rol.
 * Centraliza el mapeo rol → ruta para no repetirlo en LoginPage y RoleRouter.
 *
 * UBICACIÓN: src/router/roleUtils.js
 */
import { UserRoleEnum } from '@/types';

/**
 * Devuelve la ruta del dashboard según el rol del usuario.
 *
 * @param {string} role - Valor de UserRoleEnum
 * @returns {string} Ruta a la que navegar
 */
export function getRolePath(role) {
  switch (role) {
    case UserRoleEnum.ADMIN:
      return '/dashboard/admin';
    case UserRoleEnum.MODERADOR:
      return '/dashboard/moderator';
    case UserRoleEnum.REPARTIDOR:
      return '/dashboard/dealer';
    case UserRoleEnum.USUARIO:
    default:
      return '/dashboard/user';
  }
}