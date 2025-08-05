import { NextRequest, NextResponse } from 'next/server'
import { createRouteHandlerClient } from '@supabase/auth-helpers-nextjs'
import { cookies } from 'next/headers'

export async function GET(request: NextRequest) {
  try {
    const supabase = createRouteHandlerClient({ cookies })
    
    // Verificar autenticación con manejo mejorado de errores
    let user = null
    let authError = null
    
    try {
      const result = await supabase.auth.getUser()
      user = result.data.user
      authError = result.error
    } catch (err) {
      console.error('Error getting user:', err)
      return NextResponse.json({ 
        isAdmin: false, 
        error: 'Error al obtener usuario' 
      }, { status: 500 })
    }
    
    if (authError) {
      console.log('Auth error (expected during login):', authError.message)
      return NextResponse.json({ 
        isAdmin: false, 
        error: 'Sesión no válida' 
      }, { status: 401 })
    }
    
    if (!user) {
      console.log('No user found in session')
      return NextResponse.json({ 
        isAdmin: false, 
        error: 'No hay usuario autenticado' 
      }, { status: 401 })
    }

    // Verificar si es admin usando la variable de entorno del servidor (segura)
    const adminEmail = process.env.ADMIN_EMAIL
    const isAdmin = user.email === adminEmail
    
    console.log('Admin validation successful - Is admin:', isAdmin)

    return NextResponse.json({ 
      isAdmin,
      message: isAdmin ? 'Usuario administrador válido' : 'Usuario no es administrador'
    })

  } catch (error) {
    console.error('Unexpected error validating admin:', error)
    return NextResponse.json({ 
      isAdmin: false, 
      error: 'Error interno del servidor'
    }, { status: 500 })
  }
}