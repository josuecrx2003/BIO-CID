import { NextRequest, NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase'
import { createClient } from '@supabase/supabase-js'

export async function POST(request: NextRequest) {
  try {
    console.log('🧪 Iniciando creación de logs de prueba...')
    
    // Crear cliente de servicio para bypass RLS
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
    
    // Obtener la primera clave disponible
    const { data: keys, error: keysError } = await supabase
      .from('software_keys')
      .select('*')
      .limit(1)

    if (keysError || !keys || keys.length === 0) {
      return NextResponse.json(
        { success: false, message: 'No hay claves disponibles para testing' },
        { status: 400 }
      )
    }

    const testKey = keys[0]
    console.log('🔑 Usando clave para test:', testKey.id)

    // Crear logs de prueba
    const testLogs = [
      {
        software_key_id: testKey.id,
        iid: 'TEST-IID-001',
        cid: 'TEST-CID-12345',
        success: true,
        ip_address: '192.168.1.100',
        user_agent: 'Test User Agent 1.0'
      },
      {
        software_key_id: testKey.id,
        iid: 'TEST-IID-002',
        cid: 'TEST-CID-67890',
        success: true,
        ip_address: '192.168.1.101',
        user_agent: 'Test User Agent 2.0'
      },
      {
        software_key_id: testKey.id,
        iid: 'TEST-IID-003',
        success: false,
        error_message: 'Test error - IID inválido',
        ip_address: '192.168.1.102',
        user_agent: 'Test User Agent 3.0'
      },
      {
        software_key_id: testKey.id,
        iid: 'TEST-IID-004',
        cid: 'TEST-CID-11111',
        success: true,
        ip_address: '192.168.1.103',
        user_agent: 'Test User Agent 4.0'
      },
      {
        software_key_id: testKey.id,
        iid: 'TEST-IID-005',
        success: false,
        error_message: 'Test error - Límite excedido',
        ip_address: '192.168.1.104',
        user_agent: 'Test User Agent 5.0'
      }
    ]

    // Insertar logs de prueba usando cliente de servicio (bypass RLS)
    const { data: insertedLogs, error: insertError } = await serviceClient
      .from('usage_logs')
      .insert(testLogs)
      .select()

    if (insertError) {
      console.error('Error inserting test logs:', insertError)
      return NextResponse.json(
        { success: false, message: `Error al insertar logs: ${insertError.message}` },
        { status: 500 }
      )
    }

    // Actualizar el contador de uso de la clave usando serviceClient
    await serviceClient
      .from('software_keys')
      .update({ usage_count: (testKey.usage_count || 0) + 3 }) // 3 logs exitosos
      .eq('id', testKey.id)

    return NextResponse.json({
      success: true,
      message: 'Logs de prueba creados exitosamente',
      data: {
        logsCreated: insertedLogs?.length || 0,
        keyUsed: testKey.key_value,
        successfulLogs: 3,
        failedLogs: 2
      }
    })

  } catch (error) {
    console.error('Error in test-logs API:', error)
    return NextResponse.json(
      { success: false, message: 'Error interno del servidor' },
      { status: 500 }
    )
  }
}