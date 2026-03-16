/**
 * Unit Tests — logHelpers.js
 *
 * Verifica que las funciones de transformación de logs retornen
 * etiquetas legibles correctas para cada tipo de acción.
 *
 * Ejecutar: npm test -- tests/unit/logHelpers.test.js --run
 */

import { describe, it, expect } from 'vitest';
import {
  getActionLabel,
  getObjectType,
  getObjectInfo,
  getDescription,
  parseBrowser,
  getActionCategory,
} from '@/features/dashboard/admin/logHelpers';

// ─── Traducciones simuladas ────────────────────────────────────────────────
const AL_ES = {
  login:              'Inicio de sesión',
  logout:             'Cierre de sesión',
  login_google:       'Inicio con Google',
  crear_publicacion:  'Creó publicación',
  editar_publicacion: 'Editó publicación',
  crear_tienda:       'Creó tienda',
  editar_tienda:      'Editó tienda',
  reportar:           'Reportó contenido',
  actualizar_perfil:  'Actualizó perfil',
  ban_user:           'Baneó usuario',
  change_role:        'Cambió rol',
};

const OL_ES = {
  session:     'Sesión',
  profile:     'Perfil',
  publication: 'Publicación',
  store:       'Tienda',
  user:        'Usuario',
  product:     'Producto',
  brand:       'Marca',
};

// ─────────────────────────────────────────────────────────────────────────────
describe('getActionLabel', () => {
  it('retorna etiqueta traducida para acción conocida', () => {
    expect(getActionLabel('login', AL_ES)).toBe('Inicio de sesión');
    expect(getActionLabel('crear_publicacion', AL_ES)).toBe('Creó publicación');
    expect(getActionLabel('ban_user', AL_ES)).toBe('Baneó usuario');
  });

  it('retorna el código original si no hay traducción', () => {
    expect(getActionLabel('accion_desconocida', AL_ES)).toBe('accion_desconocida');
  });

  it('retorna "—" si el tipo es nulo o vacío', () => {
    expect(getActionLabel(null)).toBe('—');
    expect(getActionLabel(undefined)).toBe('—');
    expect(getActionLabel('')).toBe('—');
  });

  it('funciona sin objeto de traducciones', () => {
    expect(getActionLabel('crear_tienda')).toBe('crear_tienda');
  });
});

// ─────────────────────────────────────────────────────────────────────────────
describe('getObjectType', () => {
  it('clasifica eventos de sesión correctamente', () => {
    expect(getObjectType('login', {}, OL_ES)).toBe('Sesión');
    expect(getObjectType('logout', {}, OL_ES)).toBe('Sesión');
    expect(getObjectType('login_google', {}, OL_ES)).toBe('Sesión');
  });

  it('clasifica acciones de publicación', () => {
    expect(getObjectType('crear_publicacion', {}, OL_ES)).toBe('Publicación');
    expect(getObjectType('editar_publicacion', {}, OL_ES)).toBe('Publicación');
  });

  it('clasifica acciones de tienda', () => {
    expect(getObjectType('crear_tienda', {}, OL_ES)).toBe('Tienda');
    expect(getObjectType('editar_tienda', {}, OL_ES)).toBe('Tienda');
  });

  it('clasifica perfil', () => {
    expect(getObjectType('actualizar_perfil', {}, OL_ES)).toBe('Perfil');
  });

  it('clasifica reporte según targetType', () => {
    expect(getObjectType('reportar', { targetType: 'store' }, OL_ES)).toBe('Tienda');
    expect(getObjectType('reportar', { targetType: 'product' }, OL_ES)).toBe('Producto');
    expect(getObjectType('reportar', { targetType: 'publication' }, OL_ES)).toBe('Publicación');
  });

  it('clasifica acciones de moderación de recurso', () => {
    expect(getObjectType('hide', { resource_type: 'store' }, OL_ES)).toBe('Tienda');
    expect(getObjectType('hide_full', { resource_type: 'publication' }, OL_ES)).toBe('Publicación');
  });

  it('clasifica ban/role change como Usuario', () => {
    expect(getObjectType('ban_user', {}, OL_ES)).toBe('Usuario');
    expect(getObjectType('change_role', {}, OL_ES)).toBe('Usuario');
    expect(getObjectType('baneado', {}, OL_ES)).toBe('Usuario');
  });

  it('retorna "—" para tipo desconocido', () => {
    expect(getObjectType('accion_rara', {}, OL_ES)).toBe('—');
  });

  it('retorna "—" si type es null', () => {
    expect(getObjectType(null)).toBe('—');
  });

  it('usa fallbacks en español sin OL', () => {
    expect(getObjectType('login', {})).toBe('Sesión');
    expect(getObjectType('crear_publicacion', {})).toBe('Publicación');
  });
});

// ─────────────────────────────────────────────────────────────────────────────
describe('getObjectInfo', () => {
  it('retorna "—" para eventos de sesión y perfil', () => {
    expect(getObjectInfo('login')).toBe('—');
    expect(getObjectInfo('logout')).toBe('—');
    expect(getObjectInfo('login_google')).toBe('—');
    expect(getObjectInfo('actualizar_perfil')).toBe('—');
  });

  it('retorna ID parcial de publicación', () => {
    const d = { publicationId: 'abc12345-def6-7890' };
    expect(getObjectInfo('crear_publicacion', d)).toBe('#abc12345');
    expect(getObjectInfo('editar_publicacion', d)).toBe('#abc12345');
  });

  it('retorna "—" si no hay publicationId', () => {
    expect(getObjectInfo('crear_publicacion', {})).toBe('—');
  });

  it('retorna nombre de tienda', () => {
    expect(getObjectInfo('crear_tienda', { storeName: 'MercaXpress' })).toBe('MercaXpress');
    expect(getObjectInfo('editar_tienda', { storeName: 'El Bodegón' })).toBe('El Bodegón');
  });

  it('retorna ID parcial del target reportado', () => {
    const d = { targetId: 'ffffffff-0000-1111-2222-333333333333' };
    expect(getObjectInfo('reportar', d)).toBe('#ffffffff');
  });

  it('retorna nombre del recurso ocultado (store)', () => {
    expect(getObjectInfo('hide', { storeName: 'Tienda X' })).toBe('Tienda X');
    expect(getObjectInfo('hide_full', { productName: 'Arroz' })).toBe('Arroz');
    expect(getObjectInfo('hide_from_report', { brandName: 'Nike' })).toBe('Nike');
  });

  it('retorna recurso_id como fallback en hide', () => {
    const d = { resource_id: 'abc12345-def6' };
    expect(getObjectInfo('hide', d)).toBe('#abc12345');
  });

  it('retorna nombre de usuario para ban/role', () => {
    expect(getObjectInfo('ban_user', { userName: 'Juan Pérez' })).toBe('Juan Pérez');
    expect(getObjectInfo('change_role', { userName: 'María López' })).toBe('María López');
    expect(getObjectInfo('unban_user', { userName: 'Carlos' })).toBe('Carlos');
  });
});

// ─────────────────────────────────────────────────────────────────────────────
describe('getDescription', () => {
  it('incluye IP y navegador en login', () => {
    const result = getDescription('login', {}, '192.168.1.1', 'Mozilla/5.0 (Chrome)');
    expect(result).toContain('IP: 192.168.1.1');
    expect(result).toContain('Chrome');
  });

  it('retorna "—" para login sin IP ni UA', () => {
    expect(getDescription('login', {}, null, null)).toBe('—');
  });

  it('muestra IP en logout', () => {
    expect(getDescription('logout', {}, '10.0.0.1')).toBe('IP: 10.0.0.1');
  });

  it('muestra provider para login OAuth', () => {
    const result = getDescription('login_google', {}, '1.2.3.4');
    expect(result).toContain('google');
    expect(result).toContain('IP: 1.2.3.4');
  });

  it('describe creación de publicación con producto y tienda', () => {
    const d = { productId: 42, storeId: 'abc12345-xyz' };
    const result = getDescription('crear_publicacion', d);
    expect(result).toContain('Producto: 42');
    expect(result).toContain('Tienda: abc12345');
  });

  it('describe edición de publicación con ID', () => {
    const d = { publicationId: 'pub-uuid-here' };
    expect(getDescription('editar_publicacion', d)).toContain('pub-uuid-here');
  });

  it('describe creación de tienda con nombre', () => {
    expect(getDescription('crear_tienda', { storeName: 'La Canasta' })).toBe('"La Canasta"');
  });

  it('describe reporte con tipo e ID', () => {
    const d = { targetType: 'store', targetId: 'abc12345-xyz' };
    const result = getDescription('reportar', d);
    expect(result).toContain('store');
    expect(result).toContain('abc12345');
  });

  it('describe ban con nombre de usuario', () => {
    expect(getDescription('ban_user', { userName: 'Usuario Malo' })).toBe('"Usuario Malo"');
  });

  it('describe cambio de rol con flecha', () => {
    const d = { prevRole: 'Usuario', newRole: 'Moderador' };
    expect(getDescription('change_role', d)).toBe('Usuario → Moderador');
  });

  it('retorna "—" para actualizar_perfil', () => {
    expect(getDescription('actualizar_perfil')).toBe('—');
  });
});

// ─────────────────────────────────────────────────────────────────────────────
describe('parseBrowser', () => {
  it('detecta Chrome correctamente (excluye Edge)', () => {
    expect(parseBrowser('Mozilla/5.0 Chrome/120 Safari/537')).toBe('Chrome');
  });

  it('detecta Firefox', () => {
    expect(parseBrowser('Mozilla/5.0 Firefox/120')).toBe('Firefox');
  });

  it('detecta Edge (Edg en UA)', () => {
    expect(parseBrowser('Mozilla/5.0 Chrome/120 Edg/120')).toBe('Edge');
  });

  it('detecta Safari', () => {
    expect(parseBrowser('Mozilla/5.0 Safari/605')).toBe('Safari');
  });

  it('retorna "—" para UA vacío o nulo', () => {
    expect(parseBrowser('')).toBe('—');
    expect(parseBrowser(undefined)).toBe('—');
  });

  it('trunca UAs desconocidos a 25 chars', () => {
    const longUA = 'UnknownBrowser/99 Platform/X Extra text here';
    expect(parseBrowser(longUA).length).toBeLessThanOrEqual(25);
  });
});

// ─────────────────────────────────────────────────────────────────────────────
describe('getActionCategory', () => {
  it('clasifica sesiones', () => {
    expect(getActionCategory('login')).toBe('session');
    expect(getActionCategory('logout')).toBe('session');
    expect(getActionCategory('login_google')).toBe('session');
  });

  it('clasifica creaciones', () => {
    expect(getActionCategory('crear_publicacion')).toBe('create');
    expect(getActionCategory('crear_tienda')).toBe('create');
  });

  it('clasifica ediciones', () => {
    expect(getActionCategory('editar_publicacion')).toBe('edit');
    expect(getActionCategory('editar_tienda')).toBe('edit');
    expect(getActionCategory('actualizar_perfil')).toBe('edit');
  });

  it('clasifica eliminaciones/reportes', () => {
    expect(getActionCategory('hide')).toBe('delete');
    expect(getActionCategory('ban_user')).toBe('delete');
    expect(getActionCategory('reportar')).toBe('delete');
  });

  it('clasifica acciones de moderación', () => {
    expect(getActionCategory('unban_user')).toBe('moderate');
    expect(getActionCategory('change_role')).toBe('moderate');
    expect(getActionCategory('descartado')).toBe('moderate');
  });

  it('retorna "other" para acciones desconocidas', () => {
    expect(getActionCategory('accion_rara')).toBe('other');
    expect(getActionCategory(null)).toBe('other');
  });
});
