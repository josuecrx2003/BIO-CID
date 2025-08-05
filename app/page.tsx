'use client'

import { useState } from 'react'
import { Key, Shield, CheckCircle, AlertCircle, XCircle, Clock, Ban, Zap, Lock, Download, FileDown, Hash } from 'lucide-react'
import toast from 'react-hot-toast'
import jsPDF from 'jspdf'

export default function HomePage() {
  const [activationKey, setActivationKey] = useState('')
  const [iid, setIid] = useState('')
  const [loading, setLoading] = useState(false)
  const [result, setResult] = useState<{
    success: boolean
    cid?: string
    message: string
    errorCode?: number
  } | null>(null)

  // Función para formatear la clave de activación con guiones cada 5 dígitos
  const formatActivationKey = (value: string) => {
    // Remover todos los caracteres que no sean letras o números
    const cleanValue = value.replace(/[^A-Za-z0-9]/g, '').toUpperCase()
    
    // Limitar a 25 caracteres máximo (5 grupos de 5)
    const limitedValue = cleanValue.substring(0, 25)
    
    // Agregar guiones cada 5 caracteres
    const formatted = limitedValue.replace(/(.{5})/g, '$1-')
    
    // Remover el guión final si existe
    return formatted.replace(/-$/, '')
  }

  // Manejar el cambio en la clave de activación
  const handleActivationKeyChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const inputValue = e.target.value
    const formattedValue = formatActivationKey(inputValue)
    setActivationKey(formattedValue)
  }

  const formatInstallationID = (value: string) => {
    // Limpiar el valor: solo números
    const cleaned = value.replace(/[^0-9]/g, '')
    
    // Limitar a 63 dígitos máximo
    const limited = cleaned.slice(0, 63)
    
    // Agregar guiones cada 7 dígitos
    const formatted = limited.replace(/(.{7})/g, '$1-')
    
    // Remover guión final si existe
    return formatted.replace(/-$/, '')
  }

  const handleInstallationIDChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const formatted = formatInstallationID(e.target.value)
    setIid(formatted)
  }



  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    if (!activationKey.trim() || !iid.trim()) {
      toast.error('Por favor completa todos los campos')
      return
    }

    // Validar que la clave tenga el formato correcto (25 caracteres + 4 guiones = 29 total)
    const cleanKey = activationKey.replace(/-/g, '').trim()
    if (cleanKey.length < 20) {
      toast.error('La clave de activación debe tener al menos 20 caracteres')
      return
    }
    
    // Validar que tenga el formato correcto con guiones
    if (activationKey.trim().length < 24) { // Al menos 20 caracteres + algunos guiones
      toast.error('Por favor ingresa la clave completa con el formato correcto')
      return
    }

    setLoading(true)
    setResult(null)

    try {
      // Enviar la clave con guiones tal como está almacenada en la DB
      const formattedActivationKey = activationKey.trim()
      // Enviar el IID sin guiones al servidor
      const cleanIID = iid.replace(/-/g, '').trim()
      
      const response = await fetch('/api/get-cid', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          activationKey: formattedActivationKey,
          iid: cleanIID,
        }),
      })

      const data = await response.json()

      if (data.success) {
        setResult({
          success: true,
          cid: data.cid,
          message: 'Confirmation ID generado exitosamente'
        })
        toast.success('¡Confirmation ID generado exitosamente!')
      } else {
        const errorMessage = data.message || 'Error al generar el Confirmation ID'
        setResult({
          success: false,
          message: errorMessage,
          errorCode: data.errorCode
        })
        
        // Show different toast types based on error code
        if (data.errorCode === 400) {
          toast.error(errorMessage, { duration: 6000 })
        } else if (data.errorCode === 401 || data.errorCode === 429) {
          toast.error(errorMessage, { duration: 8000 })
        } else if (data.errorCode === 503) {
          toast.error(errorMessage, { duration: 5000 })
        } else {
          toast.error(errorMessage)
        }
      }
    } catch (error) {
      console.error('Error:', error)
      setResult({
        success: false,
        message: 'Error de conexión. Inténtalo de nuevo.'
      })
      toast.error('Error de conexión')
    } finally {
      setLoading(false)
    }
  }

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text)
    toast.success('Confirmation ID copiado al portapapeles')
  }

  const downloadPDF = (iid: string, cid: string) => {
    const doc = new jsPDF()
    
    // Función para dividir el CID en grupos de 6 dígitos
    const formatCIDForTable = (cid: string) => {
      const chunks = []
      for (let i = 0; i < cid.length; i += 6) {
        chunks.push(cid.substring(i, i + 6))
      }
      // Asegurar que tenemos exactamente 8 chunks (4x2)
      while (chunks.length < 8) {
        chunks.push('')
      }
      return chunks.slice(0, 8)
    }

    // Configurar fuente
    doc.setFont('helvetica', 'bold')
    
    // Header con fondo azul
    doc.setFillColor(59, 130, 246)
    doc.rect(0, 0, 210, 35, 'F')
    
    // Logo y título en header
    doc.setTextColor(255, 255, 255)
    doc.setFontSize(22)
    doc.text('BIOCDKEYS', 20, 20)
    doc.setFontSize(10)
    doc.setFont('helvetica', 'normal')
    doc.text('Especialistas en Licencias Digitales', 20, 28)
    
    // Fecha en header
    doc.setTextColor(255, 255, 255)
    doc.setFontSize(9)
    const currentDate = new Date().toLocaleDateString('es-ES', { 
      year: 'numeric', 
      month: 'long', 
      day: 'numeric' 
    })
    doc.text(`Generado: ${currentDate}`, 140, 22)
    
    // Título principal
    doc.setFont('helvetica', 'bold')
    doc.setFontSize(18)
    doc.setTextColor(59, 130, 246)
    doc.text('ACTIVACION DE MICROSOFT OFFICE', 20, 50)
    
    // Subtítulo de éxito
    doc.setFontSize(12)
    doc.setTextColor(34, 197, 94)
    doc.text('Confirmation ID Generado Exitosamente', 20, 62)
    
    // Caja para Installation ID
    doc.setDrawColor(200, 200, 200)
    doc.setLineWidth(0.5)
    doc.rect(20, 70, 170, 20)
    doc.setFillColor(248, 250, 252)
    doc.rect(20, 70, 170, 20, 'F')
    
    doc.setFont('helvetica', 'bold')
    doc.setFontSize(10)
    doc.setTextColor(71, 85, 105)
    doc.text('Installation ID:', 25, 78)
    
    doc.setFont('courier', 'normal')
    doc.setFontSize(9)
    doc.setTextColor(0, 0, 0)
    doc.text(iid, 25, 86)
    
    // Título para Confirmation ID
    doc.setFont('helvetica', 'bold')
    doc.setFontSize(12)
    doc.setTextColor(59, 130, 246)
    doc.text('CONFIRMATION ID', 20, 105)
    
    // Crear tabla 4x2 para el Confirmation ID
    const cidChunks = formatCIDForTable(cid)
    const tableStartX = 20
    const tableStartY = 115
    const cellWidth = 40
    const cellHeight = 18
    
    // Dibujar tabla con bordes y contenido
    for (let row = 0; row < 2; row++) {
      for (let col = 0; col < 4; col++) {
        const x = tableStartX + (col * cellWidth)
        const y = tableStartY + (row * cellHeight)
        const index = row * 4 + col
        
        // Dibujar celda
        doc.setDrawColor(203, 213, 225)
        doc.setLineWidth(1)
        if (row % 2 === 0) {
          doc.setFillColor(249, 250, 251)
        } else {
          doc.setFillColor(255, 255, 255)
        }
        doc.rect(x, y, cellWidth, cellHeight, 'FD')
        
        // Agregar texto
        doc.setFont('courier', 'bold')
        doc.setFontSize(11)
        doc.setTextColor(30, 41, 59)
        const text = cidChunks[index] || ''
        const textWidth = doc.getTextWidth(text)
        const textX = x + (cellWidth - textWidth) / 2
        const textY = y + cellHeight / 2 + 2
        doc.text(text, textX, textY)
      }
    }
    
    // Instrucciones
    doc.setFont('helvetica', 'bold')
    doc.setFontSize(14)
    doc.setTextColor(59, 130, 246)
    doc.text('PASOS PARA ACTIVAR OFFICE', 20, 165)
    
    // Caja para instrucciones
    doc.setDrawColor(200, 200, 200)
    doc.setLineWidth(0.5)
    doc.rect(20, 175, 170, 70)
    doc.setFillColor(248, 250, 252)
    doc.rect(20, 175, 170, 70, 'F')
    
    doc.setFont('helvetica', 'normal')
    doc.setFontSize(9)
    doc.setTextColor(51, 65, 85)
    
    const instructions = [
      '1. Abre cualquier aplicacion de Microsoft Office',
      '2. Ve a Archivo > Cuenta > Cambiar clave de producto',
      '3. Selecciona "Activacion por telefono"',
      '4. Ingresa tu Installation ID cuando se solicite',
      '5. Ingresa el Confirmation ID usando la tabla de arriba',
      '6. Haz clic en "Activar" para completar el proceso',
      '7. Tu Office estara activado y listo para usar'
    ]
    
    let yPos = 185
    instructions.forEach((instruction) => {
      doc.text(instruction, 25, yPos)
      yPos += 8
    })
    
    // Notas importantes
    doc.setFont('helvetica', 'bold')
    doc.setFontSize(11)
    doc.setTextColor(220, 38, 127)
    doc.text('NOTAS IMPORTANTES', 20, 260)
    
    // Caja para notas
    doc.setDrawColor(200, 200, 200)
    doc.setLineWidth(0.5)
    doc.rect(20, 265, 170, 25)
    doc.setFillColor(254, 242, 242)
    doc.rect(20, 265, 170, 25, 'F')
    
    doc.setFont('helvetica', 'normal')
    doc.setFontSize(8)
    doc.setTextColor(127, 29, 29)
    
    const notes = [
      '• Guarda este documento en un lugar seguro',
      '• El Confirmation ID es unico para tu Installation ID',
      '• Si tienes problemas, contacta al soporte tecnico'
    ]
    
    let noteY = 272
    notes.forEach((note) => {
      doc.text(note, 25, noteY)
      noteY += 6
    })
    
    // Descargar el PDF
    doc.save(`Biocdkeys-Activacion-Office-${new Date().toISOString().split('T')[0]}.pdf`)
    toast.success('¡PDF descargado exitosamente!')
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-blue-50">
      {/* Modern Header */}
      <header className="bg-white/80 backdrop-blur-md border-b border-gray-100 sticky top-0 z-50">
        <div className="max-w-6xl mx-auto px-6 py-4">
          <div className="flex items-center">
            <div className="flex items-center space-x-3">
              <div className="w-10 h-10 bg-gradient-to-br from-blue-600 to-purple-600 rounded-xl flex items-center justify-center shadow-lg">
                <Key className="h-5 w-5 text-white" />
              </div>
              <div>
                <h1 className="text-xl font-bold bg-gradient-to-r from-gray-900 to-gray-700 bg-clip-text text-transparent">
                  Biocdkeys
                </h1>
                <p className="text-xs text-gray-500">Licencias Digitales</p>
              </div>
            </div>
          </div>
        </div>
      </header>

      {/* Hero Section */}
      <main className="max-w-6xl mx-auto px-6 py-16">
        <div className="text-center mb-16">
          <div className="inline-flex items-center space-x-2 bg-blue-50 text-blue-700 px-4 py-2 rounded-full text-sm font-medium mb-6">
            <Zap className="h-4 w-4" />
            <span>Activación Instantánea</span>
          </div>
          <h2 className="text-5xl font-bold text-gray-900 mb-6 leading-tight">
            Activa tu licencia de
            <span className="bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent"> Office</span>
          </h2>
          <p className="text-xl text-gray-600 max-w-2xl mx-auto leading-relaxed">
            Genera tu Confirmation ID de forma segura e instantánea con tu licencia digital de Office
          </p>
        </div>

        <div className="max-w-lg mx-auto">
          <div className="bg-white/70 backdrop-blur-sm rounded-3xl border border-gray-200/50 p-8 shadow-xl shadow-gray-900/5">
            <form onSubmit={handleSubmit} className="space-y-8">
              <div className="space-y-6">
                <div>
                  <label htmlFor="activationKey" className="block text-sm font-semibold text-gray-800 mb-3">
                    Clave de Licencia
                  </label>
                  <div className="relative">
                    <Key className="absolute left-4 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" />
                    <input
                      type="text"
                      id="activationKey"
                      value={activationKey}
                      onChange={handleActivationKeyChange}
                      className="w-full pl-12 pr-4 py-4 bg-gray-50/50 border border-gray-200 rounded-2xl focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all text-gray-900 placeholder-gray-500"
                      placeholder="XXXXX-XXXXX-XXXXX-XXXXX-XXXXX"
                      disabled={loading}
                      maxLength={29}
                    />
                  </div>
                </div>

                <div>
                  <label htmlFor="iid" className="block text-sm font-semibold text-gray-800 mb-3">
                    Installation ID
                  </label>
                  <div className="relative">
                    <Hash className="absolute left-4 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" />
                    <input
                      type="text"
                      id="iid"
                      value={iid}
                      onChange={handleInstallationIDChange}
                      className="w-full pl-12 pr-4 py-4 bg-gray-50/50 border border-gray-200 rounded-2xl focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all text-gray-900 placeholder-gray-500"
                      placeholder="1234567-1234567-1234567-1234567"
                      disabled={loading}
                      maxLength={71}
                    />
                  </div>
                </div>
              </div>

              <button
                type="submit"
                disabled={loading}
                className="w-full bg-gradient-to-r from-blue-600 to-purple-600 text-white py-4 px-6 rounded-2xl font-semibold text-lg hover:shadow-lg hover:shadow-blue-500/25 transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:shadow-none"
              >
              {loading ? (
                <div className="flex items-center justify-center space-x-2">
                  <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                  <span>Generando...</span>
                </div>
              ) : (
                <div className="flex items-center justify-center space-x-2">
                  <Zap className="h-5 w-5" />
                  <span>Generar Confirmation ID</span>
                </div>
              )}
              </button>
            </form>

            {/* Result Display */}
            {result && (
              <div className={`mt-8 p-6 rounded-2xl border-2 ${
                result.success 
                  ? 'bg-gradient-to-r from-green-50 to-emerald-50 border-green-200/50' 
                  : result.errorCode === 400 
                    ? 'bg-gradient-to-r from-orange-50 to-amber-50 border-orange-200/50'
                    : result.errorCode === 401 || result.errorCode === 429
                      ? 'bg-gradient-to-r from-red-50 to-rose-50 border-red-200/50'
                      : result.errorCode === 503
                        ? 'bg-gradient-to-r from-yellow-50 to-amber-50 border-yellow-200/50'
                        : 'bg-gradient-to-r from-red-50 to-rose-50 border-red-200/50'
              }`}>
                {result.success ? (
                  <div className="flex flex-col items-center justify-center text-center">
                    <div className="w-10 h-10 rounded-full flex items-center justify-center bg-green-100 text-green-600 mb-6">
                      <CheckCircle className="h-5 w-5" />
                    </div>
                    
                    <div className="w-full max-w-md mx-auto">
                      <div className="mb-6">
                        <h3 className="text-2xl font-bold text-green-800 mb-2">
                          ¡Confirmation ID Generado!
                        </h3>
                        <p className="text-green-700 text-lg">
                          Tu código de activación está listo
                        </p>
                      </div>
                      
                      <div className="bg-white/80 rounded-2xl p-6 mb-6 border border-green-200">
                        <div className="flex items-center justify-center mb-4">
                          <div className="w-16 h-16 bg-gradient-to-br from-blue-500 to-blue-600 rounded-full flex items-center justify-center">
                            <FileDown className="h-8 w-8 text-white" />
                          </div>
                        </div>
                        <h4 className="text-lg font-semibold text-gray-800 mb-2 text-center">
                          Descarga tu Código de Activación
                        </h4>
                        <p className="text-gray-600 text-sm mb-4 leading-relaxed text-center">
                          El PDF contiene tu Installation ID, Confirmation ID organizado en tabla 4x2, 
                          e instrucciones paso a paso para activar Office
                        </p>
                        <div className="flex justify-center">
                          <button
                            onClick={() => downloadPDF(iid, result.cid!)}
                            className="bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 text-white py-4 px-8 rounded-2xl font-semibold transition-all duration-300 flex items-center justify-center space-x-3 shadow-lg hover:shadow-xl transform hover:scale-105"
                          >
                            <FileDown className="h-5 w-5" />
                            <span>Descargar Código PDF</span>
                          </button>
                        </div>
                      </div>
                      
                      <div className="flex items-center justify-center space-x-2 text-green-700">
                        <CheckCircle className="h-5 w-5" />
                        <span className="text-sm font-medium text-center">
                          Guarda el PDF en un lugar seguro para futuras referencias
                        </span>
                      </div>
                    </div>
                  </div>
                ) : (
                  <div className="flex items-start space-x-4">
                    <div className={`w-10 h-10 rounded-full flex items-center justify-center ${
                      result.errorCode === 400 
                        ? 'bg-orange-100 text-orange-600'
                        : result.errorCode === 401 || result.errorCode === 429
                          ? 'bg-red-100 text-red-600'
                          : result.errorCode === 503
                            ? 'bg-yellow-100 text-yellow-600'
                            : 'bg-red-100 text-red-600'
                    }`}>
                      {result.errorCode === 400 ? (
                        <XCircle className="h-5 w-5" />
                      ) : result.errorCode === 401 || result.errorCode === 429 ? (
                        <Ban className="h-5 w-5" />
                      ) : result.errorCode === 503 ? (
                        <Clock className="h-5 w-5" />
                      ) : (
                        <AlertCircle className="h-5 w-5" />
                      )}
                    </div>
                    <div className="flex-1">
                      <p className={`font-semibold mb-2 ${
                        result.errorCode === 400 
                          ? 'text-orange-800'
                          : result.errorCode === 401 || result.errorCode === 429
                            ? 'text-red-800'
                            : result.errorCode === 503
                              ? 'text-yellow-800'
                              : 'text-red-800'
                      }`}>
                        {result.message}
                      </p>
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>

        {/* Info Section */}
        <div className="mt-16">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8 mb-12">
            <div className="text-center p-8 bg-white/60 backdrop-blur-sm rounded-2xl border border-white/20 shadow-lg hover:shadow-xl transition-all duration-300">
              <div className="w-16 h-16 bg-gradient-to-br from-blue-500 to-blue-600 rounded-2xl flex items-center justify-center mx-auto mb-4">
                <Shield className="h-8 w-8 text-white" />
              </div>
              <h3 className="text-lg font-bold text-gray-900 mb-3">Máxima Seguridad</h3>
              <p className="text-gray-600 leading-relaxed">
                Tu licencia está protegida con encriptación de extremo a extremo y conexión directa con Microsoft
              </p>
            </div>
            <div className="text-center p-8 bg-white/60 backdrop-blur-sm rounded-2xl border border-white/20 shadow-lg hover:shadow-xl transition-all duration-300">
              <div className="w-16 h-16 bg-gradient-to-br from-green-500 to-green-600 rounded-2xl flex items-center justify-center mx-auto mb-4">
                <Zap className="h-8 w-8 text-white" />
              </div>
              <h3 className="text-lg font-bold text-gray-900 mb-3">Activación Instantánea</h3>
              <p className="text-gray-600 leading-relaxed">
                Genera tu Confirmation ID en segundos y activa tu Office inmediatamente
              </p>
            </div>
            <div className="text-center p-8 bg-white/60 backdrop-blur-sm rounded-2xl border border-white/20 shadow-lg hover:shadow-xl transition-all duration-300">
              <div className="w-16 h-16 bg-gradient-to-br from-purple-500 to-purple-600 rounded-2xl flex items-center justify-center mx-auto mb-4">
                <CheckCircle className="h-8 w-8 text-white" />
              </div>
              <h3 className="text-lg font-bold text-gray-900 mb-3">100% Confiable</h3>
              <p className="text-gray-600 leading-relaxed">
                Proceso automatizado y verificado para garantizar el éxito de tu activación
              </p>
            </div>
          </div>

          {/* Help Section */}
          <div className="bg-white/40 backdrop-blur-sm rounded-2xl border border-white/20 p-8">
            <div className="flex items-center mb-6">
              <div className="w-10 h-10 bg-gradient-to-br from-blue-500 to-blue-600 rounded-xl flex items-center justify-center mr-4">
                <AlertCircle className="h-5 w-5 text-white" />
              </div>
              <h2 className="text-2xl font-bold text-gray-900">Centro de Ayuda</h2>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
              <div className="space-y-4">
                <h3 className="text-lg font-semibold text-gray-900 mb-3">Problemas Comunes</h3>
                <div className="space-y-3">
                  <div className="flex items-start space-x-3">
                    <div className="w-2 h-2 bg-blue-500 rounded-full mt-2"></div>
                    <p className="text-gray-700">Verifica que la clave de licencia sea correcta y esté activa</p>
                  </div>
                  <div className="flex items-start space-x-3">
                    <div className="w-2 h-2 bg-blue-500 rounded-full mt-2"></div>
                    <p className="text-gray-700">Asegúrate de que el Installation ID tenga el formato correcto</p>
                  </div>
                  <div className="flex items-start space-x-3">
                    <div className="w-2 h-2 bg-blue-500 rounded-full mt-2"></div>
                    <p className="text-gray-700">Verifica tu conexión a internet e intenta nuevamente</p>
                  </div>
                </div>
              </div>
              <div className="space-y-4">
                <h3 className="text-lg font-semibold text-gray-900 mb-3">¿Dónde encontrar el Installation ID?</h3>
                <div className="bg-blue-50 rounded-xl p-4 border border-blue-200">
                  <p className="text-blue-800 font-medium mb-2">En Microsoft Office:</p>
                  <p className="text-blue-700 text-sm">
                    Archivo → Cuenta → Cambiar clave de producto → Activación por teléfono
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer className="mt-20 border-t border-white/20 pt-8">
        <div className="text-center">
          <div className="flex items-center justify-center mb-4">
            <div className="w-8 h-8 bg-gradient-to-br from-blue-600 to-purple-600 rounded-lg flex items-center justify-center mr-3">
              <Key className="h-4 w-4 text-white" />
            </div>
            <span className="text-xl font-bold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
              Biocdkeys
            </span>
          </div>
          <p className="text-gray-600 mb-2">
            &copy; 2024 Biocdkeys. Todos los derechos reservados.
          </p>
          <p className="text-sm text-gray-500">
            Microsoft Office es una marca registrada de Microsoft Corporation.
          </p>
          <p className="text-sm text-gray-500 mt-2">
            Especialistas en licencias digitales de software
          </p>
        </div>
      </footer>
    </div>
  )
}