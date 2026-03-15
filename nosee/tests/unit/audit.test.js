/**
 * tests/unit/audit.test.js
 *
 * Tests unitarios del servicio de auditoría (audit.api.js).
 *
 * Cubre:
 *  1. insertActionLog — inserción correcta, sin actorId, fallo silencioso
 *  2. getActionLogs   — consulta sin filtro, filtro por actorId, paginación
 *  3. getLoginLogs    — consulta básica, paginación
 *
 * Ejecutar: npm test -- audit.test.js
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';

// ─── Mock de Supabase (vi.hoisted para evitar TDZ al ser hoisted por vi.mock) ─
const { fromMock, mockSelect, mockInsert, mockOrder, mockRange, mockEq } = vi.hoisted(() => {
  const mockRange  = vi.fn();
  const mockEq     = vi.fn();
  const mockOrder  = vi.fn();
  const mockSelect = vi.fn();
  const mockInsert = vi.fn();

  const chainMock = {
    select: mockSelect,
    insert: mockInsert,
    order:  mockOrder,
    range:  mockRange,
    eq:     mockEq,
  };

  mockSelect.mockReturnValue(chainMock);
  mockInsert.mockReturnValue(chainMock);
  mockOrder.mockReturnValue(chainMock);
  mockEq.mockReturnValue(chainMock);
  // range es el método terminal — resuelve la promesa
  mockRange.mockResolvedValue({ data: [], error: null });

  const fromMock = vi.fn().mockReturnValue(chainMock);

  return { fromMock, mockSelect, mockInsert, mockOrder, mockRange, mockEq };
});

vi.mock('@/services/supabase.client', () => ({
  supabase: {
    from: fromMock,
  },
}));

// Importar DESPUÉS del mock
import { insertActionLog, getActionLogs, getLoginLogs } from '../../src/services/api/audit.api.js';

// ─── Reset entre tests ────────────────────────────────────────────────────────
function resetMocks() {
  fromMock.mockClear();
  mockSelect.mockClear();
  mockInsert.mockClear();
  mockOrder.mockClear();
  mockRange.mockClear();
  mockEq.mockClear();

  // Restaurar returns por defecto
  mockRange.mockResolvedValue({ data: [], error: null });
  mockInsert.mockResolvedValue({ data: null, error: null });
}

// ─── insertActionLog ──────────────────────────────────────────────────────────
describe('insertActionLog', () => {
  beforeEach(resetMocks);

  it('llama a supabase.from("admin_content_audit_log").insert con los campos correctos', async () => {
    await insertActionLog('actor-123', 'publication', 42, 'hide', 'spam', { extra: true });

    expect(fromMock).toHaveBeenCalledWith('admin_content_audit_log');
    expect(mockInsert).toHaveBeenCalledWith({
      actor_user_id: 'actor-123',
      resource_type: 'publication',
      resource_id:   '42',
      action_type:   'hide',
      reason:        'spam',
      metadata:      { extra: true },
    });
  });

  it('convierte resource_id numérico a string', async () => {
    await insertActionLog('actor-123', 'store', 999, 'hide');

    expect(mockInsert).toHaveBeenCalledWith(
      expect.objectContaining({ resource_id: '999' })
    );
  });

  it('no llama a from() si actorId es null', async () => {
    await insertActionLog(null, 'publication', 1, 'hide');

    expect(fromMock).not.toHaveBeenCalled();
  });

  it('no llama a from() si actorId es undefined', async () => {
    await insertActionLog(undefined, 'user', 'uuid-abc', 'ban_user');

    expect(fromMock).not.toHaveBeenCalled();
  });

  it('usa reason: null si no se pasa razón', async () => {
    await insertActionLog('actor-1', 'brand', 7, 'hide');

    expect(mockInsert).toHaveBeenCalledWith(
      expect.objectContaining({ reason: null })
    );
  });

  it('usa metadata: {} si no se pasa metadata', async () => {
    await insertActionLog('actor-1', 'brand', 7, 'hide');

    expect(mockInsert).toHaveBeenCalledWith(
      expect.objectContaining({ metadata: {} })
    );
  });

  it('no lanza excepción si supabase.insert lanza (fallo silencioso)', async () => {
    mockInsert.mockRejectedValueOnce(new Error('connection refused'));

    await expect(
      insertActionLog('actor-1', 'publication', 1, 'hide')
    ).resolves.not.toThrow();
  });

  it('no lanza excepción si supabase devuelve error RLS', async () => {
    mockInsert.mockResolvedValueOnce({ data: null, error: { message: 'RLS denied' } });

    await expect(
      insertActionLog('actor-1', 'publication', 1, 'hide')
    ).resolves.not.toThrow();
  });

  it('convierte resource_id null a string vacío', async () => {
    await insertActionLog('actor-1', 'report', null, 'descartado');

    expect(mockInsert).toHaveBeenCalledWith(
      expect.objectContaining({ resource_id: '' })
    );
  });

  it('soporta action_types de moderador (baneado, eliminar_publicacion, descartado)', async () => {
    for (const actionType of ['baneado', 'eliminar_publicacion', 'descartado']) {
      resetMocks();
      await insertActionLog('mod-1', 'report', 'r-1', actionType);
      expect(mockInsert).toHaveBeenCalledWith(
        expect.objectContaining({ action_type: actionType })
      );
    }
  });
});

// ─── getActionLogs ────────────────────────────────────────────────────────────
describe('getActionLogs', () => {
  beforeEach(resetMocks);

  it('consulta la tabla admin_content_audit_log', async () => {
    await getActionLogs();
    expect(fromMock).toHaveBeenCalledWith('admin_content_audit_log');
  });

  it('ordena por created_at descendente', async () => {
    await getActionLogs();
    expect(mockOrder).toHaveBeenCalledWith('created_at', { ascending: false });
  });

  it('usa range(0, 99) por defecto (limit=100)', async () => {
    await getActionLogs();
    expect(mockRange).toHaveBeenCalledWith(0, 99);
  });

  it('calcula range correctamente con offset y limit personalizados', async () => {
    await getActionLogs({ limit: 20, offset: 40 });
    expect(mockRange).toHaveBeenCalledWith(40, 59);
  });

  it('filtra por actorId cuando se pasa (vista moderador)', async () => {
    await getActionLogs({ actorId: 'mod-uuid-abc' });
    expect(mockEq).toHaveBeenCalledWith('actor_user_id', 'mod-uuid-abc');
  });

  it('NO filtra por actorId cuando es null (admin ve todo)', async () => {
    await getActionLogs({ actorId: null });
    expect(mockEq).not.toHaveBeenCalled();
  });

  it('devuelve { data: [], error: null } cuando no hay registros', async () => {
    mockRange.mockResolvedValueOnce({ data: [], error: null });
    const result = await getActionLogs();
    expect(result).toEqual({ data: [], error: null });
  });

  it('devuelve los logs tal como vienen de supabase', async () => {
    const fakeLogs = [
      { id: '1', action_type: 'hide', resource_type: 'publication', resource_id: '42', created_at: '2026-01-01T00:00:00Z' },
      { id: '2', action_type: 'ban_user', resource_type: 'user', resource_id: 'uuid-x', created_at: '2026-01-02T00:00:00Z' },
    ];
    mockRange.mockResolvedValueOnce({ data: fakeLogs, error: null });

    const result = await getActionLogs();
    expect(result.data).toEqual(fakeLogs);
    expect(result.error).toBeNull();
  });

  it('devuelve data:[] cuando supabase devuelve data: null', async () => {
    mockRange.mockResolvedValueOnce({ data: null, error: null });
    const result = await getActionLogs();
    expect(result.data).toEqual([]);
  });

  it('propaga el error cuando supabase falla', async () => {
    const fakeError = { message: 'permission denied' };
    mockRange.mockResolvedValueOnce({ data: null, error: fakeError });

    const result = await getActionLogs();
    expect(result.error).toEqual(fakeError);
  });

  it('sin parámetros usa valores por defecto (actorId null, limit 100, offset 0)', async () => {
    await getActionLogs();
    expect(mockEq).not.toHaveBeenCalled();
    expect(mockRange).toHaveBeenCalledWith(0, 99);
  });
});

// ─── getLoginLogs ─────────────────────────────────────────────────────────────
describe('getLoginLogs', () => {
  beforeEach(resetMocks);

  it('consulta la tabla login_audit_logs', async () => {
    await getLoginLogs();
    expect(fromMock).toHaveBeenCalledWith('login_audit_logs');
  });

  it('selecciona los campos correctos', async () => {
    await getLoginLogs();
    expect(mockSelect).toHaveBeenCalledWith(
      'id, user_id, event_type, ip_address, user_agent, created_at'
    );
  });

  it('ordena por created_at descendente', async () => {
    await getLoginLogs();
    expect(mockOrder).toHaveBeenCalledWith('created_at', { ascending: false });
  });

  it('usa range(0, 99) por defecto (limit=100)', async () => {
    await getLoginLogs();
    expect(mockRange).toHaveBeenCalledWith(0, 99);
  });

  it('calcula range correctamente con parámetros personalizados', async () => {
    await getLoginLogs({ limit: 10, offset: 30 });
    expect(mockRange).toHaveBeenCalledWith(30, 39);
  });

  it('devuelve los logs tal como vienen de supabase', async () => {
    const fakeLogs = [
      { id: 'a', user_id: 'u1', event_type: 'login', ip_address: '1.2.3.4', user_agent: 'Chrome', created_at: '2026-03-01T10:00:00Z' },
    ];
    mockRange.mockResolvedValueOnce({ data: fakeLogs, error: null });

    const result = await getLoginLogs();
    expect(result.data).toEqual(fakeLogs);
    expect(result.error).toBeNull();
  });

  it('devuelve data:[] cuando supabase devuelve data: null', async () => {
    mockRange.mockResolvedValueOnce({ data: null, error: null });
    const result = await getLoginLogs();
    expect(result.data).toEqual([]);
  });

  it('propaga el error cuando supabase falla (RLS admin)', async () => {
    const fakeError = { message: 'RLS policy violation' };
    mockRange.mockResolvedValueOnce({ data: null, error: fakeError });

    const result = await getLoginLogs();
    expect(result.error).toEqual(fakeError);
  });

  it('sin parámetros usa valores por defecto (limit 100, offset 0)', async () => {
    await getLoginLogs();
    expect(mockRange).toHaveBeenCalledWith(0, 99);
  });
});
