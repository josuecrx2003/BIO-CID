-- Script para corregir políticas de inserción en usage_logs
-- Ejecutar en el SQL Editor de Supabase

-- 1. Verificar políticas actuales
SELECT 
    tablename, 
    policyname, 
    cmd, 
    qual,
    with_check
FROM pg_policies 
WHERE tablename = 'usage_logs'
ORDER BY policyname;

-- 2. Eliminar TODAS las políticas existentes de usage_logs
DROP POLICY IF EXISTS "Admin can read all usage_logs" ON usage_logs;
DROP POLICY IF EXISTS "Anyone can insert usage_logs" ON usage_logs;
DROP POLICY IF EXISTS "Admin can view usage logs" ON usage_logs;
DROP POLICY IF EXISTS "API can insert usage_logs" ON usage_logs;
DROP POLICY IF EXISTS "Admin can read usage_logs" ON usage_logs;
DROP POLICY IF EXISTS "admin_read_usage_logs" ON usage_logs;
DROP POLICY IF EXISTS "api_insert_usage_logs" ON usage_logs;

-- 3. Crear política de lectura para admin
CREATE POLICY "admin_read_usage_logs" ON usage_logs
FOR SELECT USING (
  auth.jwt() ->> 'email' = 'josuecrx2003@gmail.com'
);

-- 4. Crear política de inserción MUY permisiva para la API
CREATE POLICY "api_insert_usage_logs" ON usage_logs
FOR INSERT WITH CHECK (true);

-- 4b. Crear política adicional para permitir inserción desde cualquier contexto
CREATE POLICY "allow_all_inserts" ON usage_logs
FOR INSERT TO public WITH CHECK (true);

-- 5. Verificar que RLS está habilitado
ALTER TABLE usage_logs ENABLE ROW LEVEL SECURITY;

-- 6. Verificar políticas finales
SELECT 
    tablename, 
    policyname, 
    cmd, 
    qual,
    with_check
FROM pg_policies 
WHERE tablename = 'usage_logs'
ORDER BY policyname;

-- 7. Test de inserción (comentado por seguridad)
-- INSERT INTO usage_logs (software_key_id, iid, cid, success, ip_address, user_agent) 
-- VALUES ('test-key-id', 'test-iid', 'test-cid', true, '127.0.0.1', 'Test Agent');