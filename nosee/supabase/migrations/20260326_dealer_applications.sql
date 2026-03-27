-- Migration: dealer_applications — solicitudes para ser repartidor
-- Date: 2026-03-26
--
-- Un usuario puede solicitar el rol de Repartidor desde su perfil.
-- El Admin revisa la solicitud en su dashboard y la aprueba o rechaza.
-- Al aprobar, el código del cliente llama a changeUserRole(userId, 4).
--
-- FLUJO:
--   Usuario envía solicitud (status='pending')
--   → Admin la ve en AdminDashboard
--   → Admin aprueba (status='approved') o rechaza (status='rejected', rejection_reason)
--   → Usuario ve el resultado en ProfilePage

CREATE TABLE IF NOT EXISTS public.dealer_applications (
  id               UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id          UUID        NOT NULL UNIQUE REFERENCES auth.users(id) ON DELETE CASCADE,
  full_name        TEXT        NOT NULL,
  phone            TEXT        NOT NULL,
  motivation       TEXT,
  status           TEXT        NOT NULL DEFAULT 'pending'
                               CHECK (status IN ('pending', 'approved', 'rejected')),
  rejection_reason TEXT,
  reviewed_by      UUID        REFERENCES auth.users(id) ON DELETE SET NULL,
  reviewed_at      TIMESTAMPTZ,
  created_at       TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at       TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- updated_at automático
CREATE TRIGGER tr_dealer_applications_updated_at
  BEFORE UPDATE ON public.dealer_applications
  FOR EACH ROW EXECUTE FUNCTION fn_set_updated_at();

-- Índice: el admin filtra por status='pending' para ver la cola
CREATE INDEX IF NOT EXISTS idx_dealer_applications_status
  ON public.dealer_applications(status, created_at DESC);

-- ── Row Level Security ────────────────────────────────────────────────────────
ALTER TABLE public.dealer_applications ENABLE ROW LEVEL SECURITY;

-- El usuario puede insertar su propia solicitud (UNIQUE en user_id previene duplicados)
CREATE POLICY "dealer_applications_insert_own" ON public.dealer_applications
  FOR INSERT TO authenticated
  WITH CHECK (user_id = auth.uid());

-- El usuario puede leer solo su propia solicitud
CREATE POLICY "dealer_applications_select_own" ON public.dealer_applications
  FOR SELECT TO authenticated
  USING (user_id = auth.uid());

-- El Admin puede leer TODAS las solicitudes (role_id = 3)
CREATE POLICY "dealer_applications_select_admin" ON public.dealer_applications
  FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.users u WHERE u.id = auth.uid() AND u.role_id = 3
    )
  );

-- El Admin puede actualizar (aprobar/rechazar) cualquier solicitud
CREATE POLICY "dealer_applications_update_admin" ON public.dealer_applications
  FOR UPDATE TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.users u WHERE u.id = auth.uid() AND u.role_id = 3
    )
  );
