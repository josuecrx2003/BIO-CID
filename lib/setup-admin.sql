-- Script para configurar políticas de seguridad del administrador
-- Ejecutar DESPUÉS de crear el usuario admin en la interfaz de Supabase

-- Eliminar políticas existentes si existen
DROP POLICY IF EXISTS "Admin can manage software keys" ON software_keys;
DROP POLICY IF EXISTS "Admin can view usage logs" ON usage_logs;

-- Crear políticas para software_keys
CREATE POLICY "Admin can manage software keys" ON software_keys
FOR ALL USING (
  auth.jwt() ->> 'email' = 'josuecrx2003@gmail.com'
);

-- Crear políticas para usage_logs  
CREATE POLICY "Admin can view usage logs" ON usage_logs
FOR SELECT USING (
  auth.jwt() ->> 'email' = 'josuecrx2003@gmail.com'
);

-- Verificar que las políticas se crearon correctamente
SELECT schemaname, tablename, policyname, permissive, roles, cmd, qual 
FROM pg_policies 
WHERE tablename IN ('software_keys', 'usage_logs');