/** @type {import('next').NextConfig} */
const nextConfig = {
  // Configuración optimizada para RSC y navegación
  swcMinify: true,
  
  // Headers para mejorar la navegación
  async headers() {
    return [
      {
        source: '/(.*)',
        headers: [
          {
            key: 'X-Frame-Options',
            value: 'DENY',
          },
          {
            key: 'X-Content-Type-Options',
            value: 'nosniff',
          },
        ],
      },
    ]
  },
}

module.exports = nextConfig