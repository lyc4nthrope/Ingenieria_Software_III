/**
 * logHelpers.js
 *
 * Funciones puras para transformar datos de logs de auditoría en
 * etiquetas legibles para el panel de administración.
 *
 * Reciben opcionalmente un objeto de traducciones (OL/AL) con fallbacks
 * en español, lo que las hace testeables sin dependencias externas.
 */

/**
 * Retorna la etiqueta natural de una acción.
 * @param {string} type - Código de acción (ej: 'crear_publicacion')
 * @param {Object} AL   - Mapa de traducciones (logActionLabels)
 */
export function getActionLabel(type, AL = {}) {
  if (!type) return '—';
  return AL[type] || type;
}

/**
 * Retorna el tipo/categoría del objeto afectado.
 * @param {string} type - Código de acción
 * @param {Object} d    - Detalles/metadata del log
 * @param {Object} OL   - Mapa de traducciones (logObjectLabels)
 */
export function getObjectType(type, d = {}, OL = {}) {
  if (!type) return '—';
  if (
    type === 'registro' || type === 'login_fallido' ||
    type === 'eliminar_cuenta' || type === 'desactivar_cuenta' ||
    type === 'restablecimiento_contrasena'
  ) return OL.account || 'Cuenta';
  if (type === 'login' || type === 'logout' || type.startsWith('login_'))
    return OL.session || 'Sesión';
  if (type === 'actualizar_perfil')
    return OL.profile || 'Perfil';
  if (type === 'crear_publicacion' || type === 'editar_publicacion')
    return OL.publication || 'Publicación';
  if (type === 'crear_tienda' || type === 'editar_tienda')
    return OL.store || 'Tienda';
  if (type === 'reportar')
    return OL[d.targetType] || d.targetType || OL.publication || 'Publicación';
  if (type === 'hide' || type === 'hide_full' || type === 'hide_from_report')
    return OL[d.resource_type] || d.resource_type || '—';
  if (
    type === 'ban_user' || type === 'unban_user' || type === 'baneado' ||
    type === 'change_role' || type === 'eliminar_publicacion' || type === 'descartado'
  ) return OL.user || 'Usuario';
  if (type === 'crear_pedido') return OL.order || 'Pedido';
  if (type === 'crear_alerta' || type === 'eliminar_alerta') return OL.alert || 'Alerta';
  if (type === 'agregar_item_lista' || type === 'eliminar_item_lista') return OL.list || 'Lista';
  return '—';
}

/**
 * Retorna el identificador/nombre específico del objeto afectado.
 * @param {string} type - Código de acción
 * @param {Object} d    - Detalles/metadata del log
 */
export function getObjectInfo(type, d = {}) {
  if (!type) return '—';
  if (type === 'login' || type === 'logout' || type.startsWith('login_'))
    return '—';
  if (type === 'actualizar_perfil')
    return '—';
  if (type === 'crear_publicacion' || type === 'editar_publicacion') {
    const pid = d.publicationId != null ? String(d.publicationId).slice(0, 8) : null;
    return pid ? `#${pid}` : '—';
  }
  if (type === 'crear_tienda' || type === 'editar_tienda')
    return d.storeName || '—';
  if (type === 'reportar')
    return d.targetId ? `#${String(d.targetId).slice(0, 8)}` : '—';
  if (type === 'hide' || type === 'hide_full' || type === 'hide_from_report') {
    return (
      d.storeName || d.brandName || d.productName ||
      (d.resource_id ? `#${String(d.resource_id).slice(0, 8)}` : '—')
    );
  }
  if (
    type === 'ban_user' || type === 'unban_user' || type === 'baneado' ||
    type === 'change_role' || type === 'eliminar_publicacion' || type === 'descartado'
  ) return d.userName || '—';
  if (type === 'crear_pedido') return d.orderId ? `#${String(d.orderId).slice(0, 8)}` : '—';
  if (type === 'crear_alerta' || type === 'eliminar_alerta') return d.productId ? `P#${d.productId}` : '—';
  if (type === 'agregar_item_lista' || type === 'eliminar_item_lista') return d.productName || '—';
  if (
    type === 'registro' || type === 'login_fallido' ||
    type === 'eliminar_cuenta' || type === 'desactivar_cuenta' ||
    type === 'restablecimiento_contrasena'
  ) return '—';
  return '—';
}

/**
 * Retorna una descripción detallada del evento.
 * @param {string} type - Código de acción
 * @param {Object} d    - Detalles/metadata del log
 * @param {string} ip   - Dirección IP (solo para eventos de sesión)
 * @param {string} ua   - User-Agent (solo para eventos de sesión)
 */
export function getDescription(type, d = {}, ip, ua) {
  if (!type) return '—';
  if (type === 'login' || type === 'login_email') {
    const parts = [];
    if (ip) parts.push(`IP: ${ip}`);
    const br = parseBrowser(ua);
    if (br !== '—') parts.push(br);
    return parts.join(' · ') || '—';
  }
  if (type === 'logout')
    return ip ? `IP: ${ip}` : '—';
  if (type === 'login_fallido')
    return d.attemptedEmail ? `Email: ${d.attemptedEmail}` : '—';
  if (type.startsWith('login_')) {
    const provider = type.replace('login_', '');
    const parts = [];
    if (ip) parts.push(`IP: ${ip}`);
    parts.push(provider);
    return parts.join(' · ');
  }
  if (type === 'actualizar_perfil') return '—';
  if (type === 'crear_publicacion')
    return [
      d.productId  && `Producto: ${d.productId}`,
      d.storeId    && `Tienda: ${String(d.storeId).slice(0, 8)}`,
    ].filter(Boolean).join(' · ') || '—';
  if (type === 'editar_publicacion')
    return d.publicationId ? `ID: ${d.publicationId}` : '—';
  if (type === 'crear_tienda' || type === 'editar_tienda')
    return d.storeName ? `"${d.storeName}"` : '—';
  if (type === 'reportar')
    return d.targetType && d.targetId
      ? `${d.targetType} #${String(d.targetId).slice(0, 8)}`
      : '—';
  if (type === 'hide' || type === 'hide_full') {
    const n = d.storeName || d.brandName || d.productName;
    return n ? `"${n}"` : '—';
  }
  if (type === 'ban_user' || type === 'baneado')
    return d.userName ? `"${d.userName}"` : '—';
  if (type === 'unban_user')
    return d.userName ? `"${d.userName}"` : '—';
  if (type === 'change_role')
    return d.prevRole && d.newRole ? `${d.prevRole} → ${d.newRole}` : '—';
  if (type === 'eliminar_publicacion' || type === 'hide_from_report')
    return d.reportId ? `Reporte: ${String(d.reportId).slice(0, 8)}` : '—';
  if (type === 'descartado') return '—';
  if (type === 'crear_pedido')
    return [
      d.strategy && `Estrategia: ${d.strategy}`,
      d.itemCount != null && `${d.itemCount} ítem(s)`,
      d.deliveryMode ? 'Domicilio' : 'Recojo yo',
    ].filter(Boolean).join(' · ') || '—';
  if (type === 'crear_alerta')
    return d.targetPrice != null ? `Precio máx: $${d.targetPrice}` : '—';
  if (type === 'eliminar_alerta') return '—';
  if (type === 'agregar_item_lista')
    return d.quantity != null ? `Cantidad: ${d.quantity}` : '—';
  if (type === 'eliminar_item_lista') return '—';
  if (type === 'registro') return '—';
  if (type === 'login_fallido')
    return d.attemptedEmail ? `Email: ${d.attemptedEmail}` : '—';
  if (type === 'eliminar_cuenta') return 'Eliminación permanente';
  if (type === 'desactivar_cuenta') return 'Cuenta desactivada';
  if (type === 'restablecimiento_contrasena') return '—';
  return '—';
}

/**
 * Detecta el navegador desde el user-agent.
 * @param {string} ua
 */
export function parseBrowser(ua = '') {
  if (!ua) return '—';
  if (ua.includes('Chrome') && !ua.includes('Edg')) return 'Chrome';
  if (ua.includes('Firefox')) return 'Firefox';
  if (ua.includes('Edg')) return 'Edge';
  if (ua.includes('Safari')) return 'Safari';
  return ua.slice(0, 25);
}

/**
 * Categoría visual de una acción para color-coding.
 * Retorna: 'create' | 'edit' | 'delete' | 'moderate' | 'session' | 'other'
 */
export function getActionCategory(type) {
  if (!type) return 'other';
  if (type === 'login_fallido') return 'security';
  if (type === 'login' || type === 'logout' || type.startsWith('login_') || type === 'restablecimiento_contrasena') return 'session';
  if (
    type === 'crear_publicacion' || type === 'crear_tienda' ||
    type === 'crear_pedido' || type === 'crear_alerta' || type === 'agregar_item_lista' ||
    type === 'registro'
  ) return 'create';
  if (type === 'editar_publicacion' || type === 'editar_tienda' || type === 'actualizar_perfil') return 'edit';
  if (
    type === 'hide' || type === 'hide_full' || type === 'ban_user' || type === 'baneado' ||
    type === 'eliminar_publicacion' || type === 'reportar' ||
    type === 'eliminar_alerta' || type === 'eliminar_item_lista' ||
    type === 'eliminar_cuenta' || type === 'desactivar_cuenta'
  ) return 'delete';
  if (
    type === 'unban_user' || type === 'change_role' || type === 'descartado' ||
    type === 'hide_from_report'
  ) return 'moderate';
  return 'other';
}
