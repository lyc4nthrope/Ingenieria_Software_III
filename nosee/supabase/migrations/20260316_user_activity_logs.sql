-- Tabla de actividad de usuarios (acciones en la plataforma)
CREATE TABLE IF NOT EXISTS user_activity_logs (
  id          uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id     uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  action      text NOT NULL,
  details     jsonb DEFAULT '{}',
  created_at  timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_user_activity_user_id    ON user_activity_logs(user_id);
CREATE INDEX IF NOT EXISTS idx_user_activity_created_at ON user_activity_logs(created_at DESC);

ALTER TABLE user_activity_logs ENABLE ROW LEVEL SECURITY;

-- Usuarios autenticados pueden insertar sus propios registros
CREATE POLICY "users_insert_own_activity" ON user_activity_logs
  FOR INSERT TO authenticated
  WITH CHECK (user_id = auth.uid());

-- Solo admin/moderador puede leer todos los registros
CREATE POLICY "admins_select_activity" ON user_activity_logs
  FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM users u
      JOIN roles r ON r.id = u.role_id
      WHERE u.id = auth.uid() AND r.name IN ('Admin', 'Moderador')
    )
  );
