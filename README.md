# GetCID Landing Page

Una aplicación web moderna construida con Next.js y React para consumir el servicio GetCID.info, con gestión de claves de software a través de Supabase.

## Características

- 🔐 **Validación de Claves**: Sistema de autenticación basado en claves de software
- 📊 **Dashboard Admin**: Panel de administración para gestionar claves
- 🚀 **API Integrada**: Consumo directo del servicio GetCID.info
- 📱 **Responsive**: Diseño adaptable para todos los dispositivos
- 🎨 **UI Moderna**: Interfaz elegante con Tailwind CSS
- 📈 **Analytics**: Registro y seguimiento de uso

## Tecnologías

- **Frontend**: Next.js 14, React 18, TypeScript
- **Styling**: Tailwind CSS
- **Base de Datos**: Supabase (PostgreSQL)
- **Autenticación**: Supabase Auth
- **Iconos**: Lucide React
- **Notificaciones**: React Hot Toast

## Configuración

### 1. Instalación de Dependencias

```bash
npm install
```

### 2. Configuración de Supabase

1. Crea un proyecto en [Supabase](https://supabase.com)
2. Ejecuta el script SQL en `lib/database.sql` en el SQL Editor de Supabase
3. Configura las variables de entorno

### 3. Variables de Entorno

Crea un archivo `.env.local` basado en `.env.local.example`:

```env
# Supabase Configuration
NEXT_PUBLIC_SUPABASE_URL=tu_url_de_supabase
NEXT_PUBLIC_SUPABASE_ANON_KEY=tu_clave_anonima_de_supabase
SUPABASE_SERVICE_ROLE_KEY=tu_clave_de_servicio_de_supabase

# GetCID API Configuration
GETCID_API_URL=https://getcid.info/api
GETCID_TOKEN=tu_token_de_produccion

# Admin Configuration
ADMIN_EMAIL=admin@tudominio.com
```

### 4. Configuración de Políticas de Seguridad

Actualiza el email del administrador en el archivo SQL:

```sql
-- Reemplaza 'admin@yourdomain.com' con tu email real
CREATE POLICY "Admin can do everything on software_keys" ON software_keys
  FOR ALL USING (auth.email() = 'tu_email@tudominio.com');
```

## Uso

### Desarrollo

```bash
npm run dev
```

La aplicación estará disponible en `http://localhost:3000`

### Producción

```bash
npm run build
npm start
```

## Estructura del Proyecto

```
├── app/
│   ├── admin/              # Dashboard de administración
│   ├── api/get-cid/        # API endpoint para obtener CID
│   ├── globals.css         # Estilos globales
│   ├── layout.tsx          # Layout principal
│   └── page.tsx            # Página de inicio
├── lib/
│   ├── database.sql        # Schema de la base de datos
│   └── supabase.ts         # Configuración de Supabase
└── ...
```

## Funcionalidades

### Landing Page (`/`)

- Formulario para ingresar clave de activación e IID
- Validación en tiempo real
- Obtención y visualización del CID
- Interfaz responsive y moderna

### Dashboard Admin (`/admin`)

- Gestión completa de claves de software
- Estadísticas de uso en tiempo real
- Registro de actividad detallado
- Control de límites de uso por clave

### API Endpoints

#### `POST /api/get-cid`

Obtiene el CID validando la clave de activación:

```json
{
  "activationKey": "clave_de_activacion",
  "iid": "installation_id"
}
```

**Respuesta exitosa:**
```json
{
  "success": true,
  "cid": "260150672771490322851855366226271886248373443125",
  "message": "CID obtenido exitosamente"
}
```

**Respuestas de error:**
```json
{
  "success": false,
  "message": "El Installation ID (IID) proporcionado es incorrecto...",
  "errorCode": 400
}
```

### Códigos de Error Manejados

| Código | Descripción | Mensaje al Usuario |
|--------|-------------|-------------------|
| 400 | IID Incorrecto | "El Installation ID (IID) proporcionado es incorrecto. Verifica que hayas copiado correctamente el IID completo." |
| 400 | IID Bloqueado | "Este Installation ID (IID) ha sido bloqueado. Contacta al soporte técnico." |
| 401 | Token Inválido | "Error de autenticación del servicio. Contacta al administrador." |
| 429 | Límite Alcanzado | "El servicio ha alcanzado su límite de uso. Contacta al administrador." |
| 503 | Servidor Ocupado | "El servicio está temporalmente ocupado. Inténtalo de nuevo en unos minutos." |

## Base de Datos

### Tablas Principales

#### `software_keys`
- Almacena las claves de activación
- Control de estado activo/inactivo
- Límites de uso configurables
- Contador de uso

#### `usage_logs`
- Registro de todos los intentos de uso
- Tracking de IPs y User Agents
- Almacenamiento de CIDs generados
- Registro de errores

## Seguridad

- **Row Level Security (RLS)** habilitado en todas las tablas
- **Políticas de acceso** basadas en roles
- **Validación de claves** antes de consumir la API
- **Registro de actividad** completo
- **Límites de uso** configurables por clave

## Personalización

### Estilos

Los estilos están centralizados en `app/globals.css` usando Tailwind CSS. Puedes personalizar:

- Colores primarios en `tailwind.config.js`
- Componentes reutilizables en las clases CSS
- Responsive breakpoints

### Funcionalidades

- Agregar nuevos campos a las claves de software
- Implementar notificaciones por email
- Añadir más métricas al dashboard
- Integrar con otros servicios de activación

## Contribución

1. Fork el proyecto
2. Crea una rama para tu feature (`git checkout -b feature/AmazingFeature`)
3. Commit tus cambios (`git commit -m 'Add some AmazingFeature'`)
4. Push a la rama (`git push origin feature/AmazingFeature`)
5. Abre un Pull Request

## Licencia

Este proyecto está bajo la Licencia MIT. Ver el archivo `LICENSE` para más detalles.

## Soporte

Para soporte técnico o preguntas, contacta a [tu_email@tudominio.com](mailto:tu_email@tudominio.com)