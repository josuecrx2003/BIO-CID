import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'

export async function middleware(req: NextRequest) {
  // Temporalmente deshabilitamos el middleware para permitir que la autenticación
  // se maneje completamente en el lado del cliente con localStorage
  // La validación de admin se hará en cada componente que lo requiera
  
  console.log('Middleware: Allowing access to', req.nextUrl.pathname)
  return NextResponse.next()
}

export const config = {
  matcher: ['/admin/:path*']
}