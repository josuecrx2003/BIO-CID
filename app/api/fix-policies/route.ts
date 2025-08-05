import { NextRequest, NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase'

export async function POST(request: NextRequest) {
  try {
    console.log('🔧 Iniciando diagnóstico de políticas...')

    // 1. Verificar autenticación del admin
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    
    if (authError || !user || user.email !== 'josuecrx2003@gmail.com') {
      return NextResponse.json(
        { success: false, message: `No autorizado. Usuario: ${user?.email || 'No autenticado'}` },
        { status: 401 }
      )
    }

    console.log('✅ Usuario autorizado:', user.email)

    // 2. Test directo de inserción para diagnosticar el problema
    const testLog = {
      software_key_id: 'test-policy-diagnosis',
      iid: 'TEST-DIAGNOSIS-IID',
      cid: 'TEST-DIAGNOSIS-CID',
      success: true,
      ip_address: '127.0.0.1',
      user_agent: 'Policy Diagnosis Test'
    }

    console.log('🧪 Probando inserción directa...')
    const { data: insertTest, error: insertError } = await supabase
      .from('usage_logs')
      .insert(testLog)
      .select()

    if (insertError) {
      console.error('❌ Error de inserción:', insertError)
      
      // Analizar el tipo de error
      let diagnosis = 'Error desconocido'
      let solution = 'Revisar configuración de Supabase'
      
      if (insertError.message.includes('row-level security')) {
        diagnosis = 'Políticas de RLS bloqueando inserción'
        solution = 'Ejecutar fix-insert-policies.sql en Supabase SQL Editor'
      } else if (insertError.message.includes('foreign key')) {
        diagnosis = 'Clave foránea inválida (software_key_id)'
        solution = 'Usar un software_key_id válido'
      } else if (insertError.message.includes('permission')) {
        diagnosis = 'Permisos insuficientes'
        solution = 'Verificar configuración de usuario en Supabase'
      }

      return NextResponse.json({
        success: false,
        message: `Diagnóstico completado: ${diagnosis}`,
        data: {
          errorType: insertError.code,
          errorMessage: insertError.message,
          diagnosis,
          solution,
          userEmail: user.email,
          suggestedAction: 'Ejecutar el script SQL manualmente en Supabase'
        }
      })
    }

    console.log('✅ Test de inserción exitoso')

    // 3. Limpiar el log de prueba
    await supabase
      .from('usage_logs')
      .delete()
      .eq('software_key_id', 'test-policy-diagnosis')

    // 4. Verificar que podemos leer logs
    const { data: logsTest, error: readError } = await supabase
      .from('usage_logs')
      .select('count')
      .limit(1)

    return NextResponse.json({
      success: true,
      message: 'Diagnóstico exitoso: Las políticas están funcionando correctamente',
      data: {
        insertTest: true,
        readTest: !readError,
        userEmail: user.email,
        message: 'El problema original puede haber sido temporal o ya está resuelto'
      }
    })

  } catch (error) {
    console.error('Error in fix-policies API:', error)
    return NextResponse.json(
      { success: false, message: `Error interno: ${error.message}` },
      { status: 500 }
    )
  }
}