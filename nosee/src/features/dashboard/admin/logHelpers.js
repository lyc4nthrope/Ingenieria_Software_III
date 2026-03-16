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
    const pid = d.publicationId?.slice(0, 8);
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
  if (type === 'login' || type === 'logout' || type.startsWith('login_')) return 'session';
  if (type === 'crear_publicacion' || type === 'crear_tienda') return 'create';
  if (type === 'editar_publicacion' || type === 'editar_tienda' || type === 'actualizar_perfil') return 'edit';
  if (
    type === 'hide' || type === 'hide_full' || type === 'ban_user' || type === 'baneado' ||
    type === 'eliminar_publicacion' || type === 'reportar'
  ) return 'delete';
  if (
    type === 'unban_user' || type === 'change_role' || type === 'descartado' ||
    type === 'hide_from_report'
  ) return 'moderate';
  return 'other';
}
