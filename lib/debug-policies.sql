-- Script para diagnosticar y corregir políticas de la base de datos
-- Ejecutar en el SQL Editor de Supabase

-- 1. Verificar políticas existentes
SELECT 
    schemaname, 
    tablename, 
    policyname, 
    permissive, 
    roles, 
    cmd, 
    qual 
FROM pg_policies 
WHERE tablename IN ('software_keys', 'usage_logs')
ORDER BY tablename, policyname;

-- 2. Verificar si RLS está habilitado
SELECT 
    schemaname,
    tablename,
    rowsecurity
FROM pg_tables 
WHERE tablename IN ('software_keys', 'usage_logs');

-- 3. Eliminar todas las políticas existentes para empezar limpio
DROP POLICY IF EXISTS "Admin can do everything on software_keys" ON software_keys;
DROP POLICY IF EXISTS "Public can read active software_keys" ON software_keys;
DROP POLICY IF EXISTS "Admin can read all usage_logs" ON usage_logs;
DROP POLICY IF EXISTS "Anyone can insert usage_logs" ON usage_logs;
DROP POLICY IF EXISTS "Admin can manage software keys" ON software_keys;
DROP POLICY IF EXISTS "Admin can view usage logs" ON usage_logs;

-- 4. Crear políticas correctas para software_keys
CREATE POLICY "Admin full access to software_keys" ON software_keys
FOR ALL USING (
  auth.jwt() ->> 'email' = 'josuecrx2003@gmail.com'
);

CREATE POLICY "API can read active keys" ON software_keys
FOR SELECT USING (is_active = true);

-- 5. Crear políticas correctas para usage_logs
CREATE POLICY "Admin can read usage_logs" ON usage_logs
FOR SELECT USING (
  auth.jwt() ->> 'email' = 'josuecrx2003@gmail.com'
);

CREATE POLICY "API can insert usage_logs" ON usage_logs
FOR INSERT WITH CHECK (true);

-- 6. Verificar que las nuevas políticas se crearon correctamente
SELECT 
    schemaname, 
    tablename, 
    policyname, 
    permissive, 
    roles, 
    cmd, 
    qual 
FROM pg_policies 
WHERE tablename IN ('software_keys', 'usage_logs')
ORDER BY tablename, policyname;

-- 7. Verificar datos existentes (solo si tienes acceso)
-- SELECT COUNT(*) as total_keys FROM software_keys;
-- SELECT COUNT(*) as total_logs FROM usage_logs;
-- SELECT COUNT(*) as successful_logs FROM usage_logs WHERE success = true;