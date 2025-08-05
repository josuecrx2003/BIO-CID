# 🔐 Configuración del Usuario Administrador

## Paso 1: Crear Usuario en Supabase

1. Ve a tu **Dashboard de Supabase**: https://supabase.com/dashboard
2. Selecciona tu proyecto
3. Navega a **Authentication > Users**
4. Haz clic en **"Add User"**
5. Completa el formulario:
   - **Email**: `josuecrx2003@gmail.com`
   - **Password**: [Elige una contraseña segura]
   - **Email Confirm**: ✅ Marcado
6. Haz clic en **"Create User"**

## Paso 2: Ejecutar Script SQL (Opcional)

Si quieres configurar políticas de seguridad adicionales:

1. Ve a **SQL Editor** en tu dashboard de Supabase
2. Copia y pega el contenido de `lib/setup-admin.sql`
3. Haz clic en **"Run"**

## Paso 3: Probar la Autenticación

1. Ve a: http://localhost:3000/admin
2. Serás redirigido al login
3. Ingresa las credenciales creadas
4. Deberías acceder al panel de administración

## ⚠️ Importante

- **Guarda la contraseña** en un lugar seguro
- **No compartas** las credenciales de administrador
- El email `josuecrx2003@gmail.com` está configurado como administrador único

## 🔧 Solución de Problemas

Si tienes problemas:
1. Verifica que el email sea exactamente: `josuecrx2003@gmail.com`
2. Asegúrate de que "Email Confirm" esté marcado
3. Revisa la consola del navegador para errores
4. Verifica que las variables de entorno estén correctas en `.env.local`