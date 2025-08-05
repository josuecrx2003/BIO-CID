import { NextRequest, NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase'
import { createClient } from '@supabase/supabase-js'

export async function POST(request: NextRequest) {
  try {
    console.log('🚀 API get-cid iniciado')
    console.log('🔑 Service Role Key disponible:', !!process.env.SUPABASE_SERVICE_ROLE_KEY)
    
    // Crear cliente de servicio para logs (bypass RLS)
    const serviceClient = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!,
      {
        auth: {
          autoRefreshToken: false,
          persistSession: false
        }
      }
    )
    
    console.log('✅ Service client creado')

    // Función para obtener la IP del cliente
    const getClientIP = () => {
      // Intentar obtener IP de varios headers
      const forwarded = request.headers.get('x-forwarded-for')
      const realIP = request.headers.get('x-real-ip')
      const cfConnectingIP = request.headers.get('cf-connecting-ip')
      
      let ip = null
      
      if (forwarded) {
        // x-forwarded-for puede contener múltiples IPs, tomar la primera
        ip = forwarded.split(',')[0].trim()
      } else if (realIP) {
        ip = realIP
      } else if (cfConnectingIP) {
        ip = cfConnectingIP
      } else if (request.ip) {
        ip = request.ip
      }
      
      // Normalizar direcciones IPv6 localhost a IPv4
      if (ip === '::1' || ip === '::ffff:127.0.0.1') {
        ip = '127.0.0.1'
      }
      
      // Si no hay IP o es inválida, usar localhost
      return ip || '127.0.0.1'
    }

    const clientIP = getClientIP()
    console.log('🌐 IP del cliente:', clientIP)

    const { activationKey, iid } = await request.json()

    if (!activationKey || !iid) {
      return NextResponse.json(
        { success: false, message: 'Clave de activación e IID son requeridos' },
        { status: 400 }
      )
    }

    // Verify activation key exists and is active
    const { data: keyData, error: keyError } = await supabase
      .from('software_keys')
      .select('*')
      .eq('key_value', activationKey)
      .eq('is_active', true)
      .single()

    if (keyError || !keyData) {
      // Log failed attempt
      await serviceClient.from('usage_logs').insert({
        software_key_id: null,
        iid,
        success: false,
        error_message: 'Clave de activación inválida o inactiva',
        ip_address: clientIP,
        user_agent: request.headers.get('user-agent') || null
      })

      return NextResponse.json(
        { success: false, message: 'Clave de activación inválida o inactiva' },
        { status: 401 }
      )
    }

    // Check usage limits
    if (keyData.max_usage && keyData.usage_count >= keyData.max_usage) {
      await serviceClient.from('usage_logs').insert({
        software_key_id: keyData.id,
        iid,
        success: false,
        error_message: 'Límite de uso excedido',
        ip_address: clientIP,
        user_agent: request.headers.get('user-agent') || null
      })

      return NextResponse.json(
        { success: false, message: 'Límite de uso excedido para esta clave' },
        { status: 429 }
      )
    }

    // Call GetCID API
    const getcidUrl = `${process.env.GETCID_API_URL}/${iid}/${process.env.GETCID_TOKEN}`
    
    const getcidResponse = await fetch(getcidUrl, {
      method: 'GET',
      headers: {
        'User-Agent': 'GetCID-Landing/1.0'
      }
    })

    const cidResult = await getcidResponse.text()

    // Check if the response content indicates an error (even with 200 status)
    const isErrorResponse = cidResult.includes('Wrong IID') || 
                           cidResult.includes('Blocked IID') || 
                           cidResult.includes('Error') ||
                           cidResult.includes('Invalid') ||
                           cidResult.length < 10 // CID should be much longer

    // Handle different response codes from GetCID API or error content
    if (!getcidResponse.ok || isErrorResponse) {
      let errorMessage = 'Error desconocido al obtener el CID'
      let userMessage = 'Error al obtener el CID. Inténtalo de nuevo.'

      if (isErrorResponse) {
        // Handle error content in successful HTTP responses
        if (cidResult.includes('Wrong IID')) {
          errorMessage = 'IID incorrecto'
          userMessage = 'El Installation ID (IID) proporcionado es incorrecto. Verifica que hayas copiado correctamente el IID completo.'
        } else if (cidResult.includes('Blocked IID')) {
          errorMessage = 'IID bloqueado'
          userMessage = 'Este Installation ID (IID) ha sido bloqueado. Contacta al soporte técnico.'
        } else {
          errorMessage = `Respuesta de error: ${cidResult}`
          userMessage = 'Error en la respuesta del servicio. Verifica los datos ingresados.'
        }
      } else {
        // Handle HTTP error codes
        switch (getcidResponse.status) {
          case 400:
            if (cidResult.includes('Wrong IID')) {
              errorMessage = 'IID incorrecto'
              userMessage = 'El Installation ID (IID) proporcionado es incorrecto. Verifica que hayas copiado correctamente el IID completo.'
            } else if (cidResult.includes('Blocked IID')) {
              errorMessage = 'IID bloqueado'
              userMessage = 'Este Installation ID (IID) ha sido bloqueado. Contacta al soporte técnico.'
            } else {
              errorMessage = `Error 400: ${cidResult}`
              userMessage = 'Error en la solicitud. Verifica los datos ingresados.'
            }
            break
          case 401:
            errorMessage = 'Token de API no válido'
            userMessage = 'Error de autenticación del servicio. Contacta al administrador.'
            break
          case 429:
            errorMessage = 'Límite de token alcanzado'
            userMessage = 'El servicio ha alcanzado su límite de uso. Contacta al administrador.'
            break
          case 503:
            errorMessage = 'Servidor ocupado'
            userMessage = 'El servicio está temporalmente ocupado. Inténtalo de nuevo en unos minutos.'
            break
          default:
            errorMessage = `Error HTTP ${getcidResponse.status}: ${cidResult}`
            userMessage = 'Error del servicio. Inténtalo de nuevo más tarde.'
        }
      }

      await serviceClient.from('usage_logs').insert({
        software_key_id: keyData.id,
        iid,
        success: false,
        error_message: errorMessage,
        ip_address: clientIP,
        user_agent: request.headers.get('user-agent') || null
      })

      return NextResponse.json(
        { success: false, message: userMessage, errorCode: getcidResponse.status },
        { status: getcidResponse.status === 401 || getcidResponse.status === 429 ? 503 : 400 }
      )
    }

    // Update usage count
    await supabase
      .from('software_keys')
      .update({ usage_count: keyData.usage_count + 1 })
      .eq('id', keyData.id)

    // Log successful usage
    console.log('📝 Intentando insertar log exitoso para:', { keyId: keyData.id, iid, cid: cidResult, ip: clientIP })
    const logResult = await serviceClient.from('usage_logs').insert({
      software_key_id: keyData.id,
      iid,
      cid: cidResult,
      success: true,
      ip_address: clientIP,
      user_agent: request.headers.get('user-agent') || null
    })
    
    if (logResult.error) {
      console.error('❌ Error insertando log exitoso:', logResult.error)
    } else {
      console.log('✅ Log exitoso insertado correctamente')
    }

    return NextResponse.json({
      success: true,
      cid: cidResult,
      message: 'CID obtenido exitosamente'
    })

  } catch (error) {
    console.error('Error in get-cid API:', error)
    return NextResponse.json(
      { success: false, message: 'Error interno del servidor' },
      { status: 500 }
    )
  }
}