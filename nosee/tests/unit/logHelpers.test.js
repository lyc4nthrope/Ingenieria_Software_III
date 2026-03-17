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
  crear_pedido:       'Confirmó pedido',
  crear_alerta:       'Creó alerta de precio',
  eliminar_alerta:    'Eliminó alerta',
  agregar_item_lista: 'Agregó ítem a lista',
  eliminar_item_lista:'Eliminó ítem de lista',
};

const OL_ES = {
  session:     'Sesión',
  profile:     'Perfil',
  publication: 'Publicación',
  store:       'Tienda',
  user:        'Usuario',
  product:     'Producto',
  brand:       'Marca',
  order:       'Pedido',
  alert:       'Alerta',
  list:        'Lista',
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

// ─────────────────────────────────────────────────────────────────────────────
// Tests para el fix del campo "objeto afectado" en logs de admin
// (admin_content_audit_log tiene resource_id y resource_type separados)
// ─────────────────────────────────────────────────────────────────────────────
describe('getObjectInfo — logs de admin (resource_id + resource_type)', () => {
  it('usa resource_id como fallback para hide cuando no hay nombre', () => {
    // Así llegan los datos del admin log: resource_id en la raíz del objeto
    const d = { resource_id: 'abc12345-xyz', resource_type: 'store' };
    expect(getObjectInfo('hide', d)).toBe('#abc12345');
  });

  it('prefiere storeName sobre resource_id en hide', () => {
    const d = { resource_id: 'abc12345-xyz', resource_type: 'store', storeName: 'MercaXpress' };
    expect(getObjectInfo('hide', d)).toBe('MercaXpress');
  });

  it('usa brandName cuando no hay storeName', () => {
    const d = { resource_id: 'abc12345', resource_type: 'brand', brandName: 'Nike' };
    expect(getObjectInfo('hide', d)).toBe('Nike');
  });

  it('usa productName cuando no hay store ni brand', () => {
    const d = { resource_id: 'abc12345', resource_type: 'product', productName: 'Arroz Diana' };
    expect(getObjectInfo('hide_full', d)).toBe('Arroz Diana');
  });

  it('getObjectType usa resource_type para hide', () => {
    const d = { resource_type: 'store' };
    expect(getObjectType('hide', d, OL_ES)).toBe('Tienda');
    expect(getObjectType('hide_full', { resource_type: 'product' }, OL_ES)).toBe('Producto');
    expect(getObjectType('hide_from_report', { resource_type: 'brand' }, OL_ES)).toBe('Marca');
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// Tests para datos de tiempo real (misma transformación, datos llegados vía
// Supabase Realtime INSERT payload)
// ─────────────────────────────────────────────────────────────────────────────
describe('transformación de payload de tiempo real', () => {
  it('login payload se transforma igual que un log normal', () => {
    const payload = {
      id: 'log-1',
      user_id: 'user-uuid',
      event_type: 'login',
      ip_address: '192.168.0.1',
      user_agent: 'Mozilla/5.0 Chrome/120',
      created_at: new Date().toISOString(),
    };
    expect(getActionLabel(payload.event_type, AL_ES)).toBe('Inicio de sesión');
    expect(getObjectType(payload.event_type, {}, OL_ES)).toBe('Sesión');
    expect(getObjectInfo(payload.event_type, {})).toBe('—');
    const desc = getDescription(payload.event_type, {}, payload.ip_address, payload.user_agent);
    expect(desc).toContain('IP: 192.168.0.1');
    expect(desc).toContain('Chrome');
  });

  it('user_activity_logs payload de crear_publicacion se transforma correctamente', () => {
    const payload = {
      id: 'act-1',
      user_id: 'user-uuid',
      action: 'crear_publicacion',
      details: { publicationId: 'pub-abc12345-xyz', productId: 99, storeId: 'str-uuid' },
      created_at: new Date().toISOString(),
    };
    expect(getActionLabel(payload.action, AL_ES)).toBe('Creó publicación');
    expect(getObjectType(payload.action, payload.details, OL_ES)).toBe('Publicación');
    expect(getObjectInfo(payload.action, payload.details)).toBe('#pub-abc1');
    const desc = getDescription(payload.action, payload.details);
    expect(desc).toContain('Producto: 99');
  });

  it('admin_content_audit_log payload de ban_user se transforma correctamente', () => {
    const payload = {
      id: 'adm-1',
      actor_user_id: 'admin-uuid',
      action_type: 'ban_user',
      resource_type: 'user',
      resource_id: 'target-user-id',
      metadata: { userName: 'Usuario Malo' },
      reason: 'Spam repetitivo',
      created_at: new Date().toISOString(),
    };
    // Así se construye details en adminRows:
    const details = { resource_id: payload.resource_id, resource_type: payload.resource_type, ...payload.metadata };
    expect(getActionLabel(payload.action_type, AL_ES)).toBe('Baneó usuario');
    expect(getObjectType(payload.action_type, details, OL_ES)).toBe('Usuario');
    expect(getObjectInfo(payload.action_type, details)).toBe('Usuario Malo');
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// Tests para nuevas acciones: pedidos, alertas y lista de compras
// ─────────────────────────────────────────────────────────────────────────────
describe('getObjectType — nuevos tipos (pedido, alerta, lista)', () => {
  it('clasifica crear_pedido como Pedido', () => {
    expect(getObjectType('crear_pedido', {}, OL_ES)).toBe('Pedido');
  });

  it('clasifica alertas', () => {
    expect(getObjectType('crear_alerta', {}, OL_ES)).toBe('Alerta');
    expect(getObjectType('eliminar_alerta', {}, OL_ES)).toBe('Alerta');
  });

  it('clasifica ítems de lista', () => {
    expect(getObjectType('agregar_item_lista', {}, OL_ES)).toBe('Lista');
    expect(getObjectType('eliminar_item_lista', {}, OL_ES)).toBe('Lista');
  });
});

describe('getObjectInfo — nuevos tipos', () => {
  it('retorna ID parcial del pedido', () => {
    expect(getObjectInfo('crear_pedido', { orderId: 'NSE-ABC12345' })).toBe('#NSE-ABC1');
  });

  it('retorna "—" si no hay orderId', () => {
    expect(getObjectInfo('crear_pedido', {})).toBe('—');
  });

  it('retorna productId en alertas', () => {
    expect(getObjectInfo('crear_alerta', { productId: 42 })).toBe('P#42');
    expect(getObjectInfo('eliminar_alerta', { productId: 7 })).toBe('P#7');
  });

  it('retorna "—" si no hay productId en alerta', () => {
    expect(getObjectInfo('crear_alerta', {})).toBe('—');
  });

  it('retorna productName para ítems de lista', () => {
    expect(getObjectInfo('agregar_item_lista', { productName: 'Arroz' })).toBe('Arroz');
    expect(getObjectInfo('eliminar_item_lista', { productName: 'Leche' })).toBe('Leche');
  });

  it('retorna "—" si no hay productName en lista', () => {
    expect(getObjectInfo('agregar_item_lista', {})).toBe('—');
  });
});

describe('getDescription — nuevos tipos', () => {
  it('describe pedido con estrategia e ítems', () => {
    const d = { strategy: 'price', itemCount: 3, deliveryMode: false };
    const result = getDescription('crear_pedido', d);
    expect(result).toContain('price');
    expect(result).toContain('3 ítem(s)');
    expect(result).toContain('Recojo yo');
  });

  it('describe pedido con domicilio', () => {
    const d = { strategy: 'balanced', itemCount: 5, deliveryMode: true };
    expect(getDescription('crear_pedido', d)).toContain('Domicilio');
  });

  it('describe alerta con precio máximo', () => {
    expect(getDescription('crear_alerta', { targetPrice: 5000 })).toBe('Precio máx: $5000');
  });

  it('retorna "—" para alerta sin precio', () => {
    expect(getDescription('crear_alerta', {})).toBe('—');
  });

  it('retorna "—" para eliminar_alerta', () => {
    expect(getDescription('eliminar_alerta', {})).toBe('—');
  });

  it('describe ítem agregado con cantidad', () => {
    expect(getDescription('agregar_item_lista', { quantity: 2 })).toBe('Cantidad: 2');
  });

  it('retorna "—" para eliminar_item_lista', () => {
    expect(getDescription('eliminar_item_lista', { productName: 'Arroz' })).toBe('—');
  });
});

describe('getActionCategory — nuevos tipos', () => {
  it('clasifica crear_pedido y crear_alerta como create', () => {
    expect(getActionCategory('crear_pedido')).toBe('create');
    expect(getActionCategory('crear_alerta')).toBe('create');
    expect(getActionCategory('agregar_item_lista')).toBe('create');
  });

  it('clasifica eliminar_alerta y eliminar_item_lista como delete', () => {
    expect(getActionCategory('eliminar_alerta')).toBe('delete');
    expect(getActionCategory('eliminar_item_lista')).toBe('delete');
  });
});

describe('getActionLabel — nuevos tipos', () => {
  it('retorna etiqueta traducida para cada nueva acción', () => {
    expect(getActionLabel('crear_pedido', AL_ES)).toBe('Confirmó pedido');
    expect(getActionLabel('crear_alerta', AL_ES)).toBe('Creó alerta de precio');
    expect(getActionLabel('eliminar_alerta', AL_ES)).toBe('Eliminó alerta');
    expect(getActionLabel('agregar_item_lista', AL_ES)).toBe('Agregó ítem a lista');
    expect(getActionLabel('eliminar_item_lista', AL_ES)).toBe('Eliminó ítem de lista');
  });
});

// ─── Nuevos tipos de ciclo de vida y seguridad ────────────────────────────────
describe('getActionCategory — nuevos tipos de seguridad y cuenta', () => {
  it('registro → create', () => expect(getActionCategory('registro')).toBe('create'));
  it('login_fallido → security', () => expect(getActionCategory('login_fallido')).toBe('security'));
  it('eliminar_cuenta → delete', () => expect(getActionCategory('eliminar_cuenta')).toBe('delete'));
  it('desactivar_cuenta → delete', () => expect(getActionCategory('desactivar_cuenta')).toBe('delete'));
  it('restablecimiento_contrasena → session', () => expect(getActionCategory('restablecimiento_contrasena')).toBe('session'));
});

describe('getObjectType — nuevos tipos de cuenta', () => {
  const OL = { account: 'Cuenta', session: 'Sesión' };
  it('registro → Cuenta', () => expect(getObjectType('registro', {}, OL)).toBe('Cuenta'));
  it('login_fallido → Cuenta', () => expect(getObjectType('login_fallido', {}, OL)).toBe('Cuenta'));
  it('eliminar_cuenta → Cuenta', () => expect(getObjectType('eliminar_cuenta', {}, OL)).toBe('Cuenta'));
  it('desactivar_cuenta → Cuenta', () => expect(getObjectType('desactivar_cuenta', {}, OL)).toBe('Cuenta'));
  it('restablecimiento_contrasena → Cuenta', () => expect(getObjectType('restablecimiento_contrasena', {}, OL)).toBe('Cuenta'));
  it('fallback sin OL → Cuenta literal', () => expect(getObjectType('registro', {})).toBe('Cuenta'));
});

describe('getDescription — login_fallido muestra email intentado', () => {
  it('login_fallido con email → lo muestra', () =>
    expect(getDescription('login_fallido', { attemptedEmail: 'hacker@evil.com' })).toBe('Email: hacker@evil.com'));
  it('login_fallido sin email → —', () =>
    expect(getDescription('login_fallido', {})).toBe('—'));
  it('eliminar_cuenta → Eliminación permanente', () =>
    expect(getDescription('eliminar_cuenta', {})).toBe('Eliminación permanente'));
  it('desactivar_cuenta → Cuenta desactivada', () =>
    expect(getDescription('desactivar_cuenta', {})).toBe('Cuenta desactivada'));
  it('registro → —', () =>
    expect(getDescription('registro', {})).toBe('—'));
  it('restablecimiento_contrasena → —', () =>
    expect(getDescription('restablecimiento_contrasena', {})).toBe('—'));
});
