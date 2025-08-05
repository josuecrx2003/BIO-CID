'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'
import toast from 'react-hot-toast'
import { Eye, EyeOff, Lock, Mail, Key, Shield, ArrowLeft } from 'lucide-react'
import Link from 'next/link'

export default function AdminLogin() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [loading, setLoading] = useState(false)
  const router = useRouter()

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)

    try {
      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password,
      })

      if (error) {
        toast.error('Credenciales incorrectas')
        return
      }

      // Verificar que el usuario sea administrador
      // Nota: Esta validación es temporal en el frontend, la validación real se hace en el backend
      // cuando se accede a funciones administrativas
      const userEmail = data.user?.email
      
      // Por seguridad, no mostramos el email del admin en el código
      // La validación real se hará en cada endpoint administrativo
      if (!userEmail) {
        await supabase.auth.signOut()
        toast.error('Error al obtener información del usuario')
        return
      }

      toast.success('Inicio de sesión exitoso')
      
      // Esperar un momento para que la sesión se establezca completamente
      await new Promise(resolve => setTimeout(resolve, 1500))
      
      // Verificar que la sesión esté realmente establecida
      const { data: sessionData, error: sessionError } = await supabase.auth.getSession()
      
      if (sessionError || !sessionData.session) {
        toast.error('Error al establecer la sesión. Intenta de nuevo.')
        console.error('Session error:', sessionError)
        return
      }
      
      console.log('Session established successfully, redirecting...')
      
      // Usar window.location.href para forzar una navegación completa
      // que permita al middleware detectar las cookies correctamente
      window.location.href = '/admin'
    } catch (error) {
      toast.error('Error al iniciar sesión')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-blue-50 relative">
      {/* Background Pattern */}
      <div className="absolute inset-0 opacity-30">
        <div className="absolute inset-0 bg-gradient-to-br from-blue-50/20 to-purple-50/20"></div>
      </div>
      
      {/* Header */}
      <header className="relative z-10 bg-white/80 backdrop-blur-md border-b border-gray-100">
        <div className="max-w-6xl mx-auto px-6 py-4">
          <div className="flex items-center justify-between">
            <Link href="/" className="flex items-center space-x-3 group">
              <ArrowLeft className="h-5 w-5 text-gray-400 group-hover:text-gray-600 transition-colors" />
              <div className="flex items-center space-x-3">
                <div className="w-10 h-10 bg-gradient-to-br from-blue-600 to-purple-600 rounded-xl flex items-center justify-center shadow-lg">
                  <Key className="h-5 w-5 text-white" />
                </div>
                <div>
                  <h1 className="text-xl font-bold bg-gradient-to-r from-gray-900 to-gray-700 bg-clip-text text-transparent">
                    Biocdkeys
                  </h1>
                  <p className="text-xs text-gray-500">Panel de Administración</p>
                </div>
              </div>
            </Link>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <div className="relative z-10 flex items-center justify-center min-h-[calc(100vh-80px)] px-6 py-16">
        <div className="w-full max-w-md">
          {/* Login Card */}
          <div className="bg-white/70 backdrop-blur-sm rounded-3xl border border-gray-200/50 p-8 shadow-xl shadow-gray-900/5">
            {/* Header */}
            <div className="text-center mb-8">
              <div className="w-20 h-20 bg-gradient-to-br from-blue-600 to-purple-600 rounded-2xl flex items-center justify-center mx-auto mb-6 shadow-lg">
                <Shield className="h-10 w-10 text-white" />
              </div>
              <h2 className="text-3xl font-bold text-gray-900 mb-2">
                Acceso Administrativo
              </h2>
              <p className="text-gray-600 text-lg">
                Panel de control del sistema
              </p>
            </div>

            {/* Form */}
            <form onSubmit={handleLogin} className="space-y-6">
              <div>
                <label htmlFor="email" className="block text-sm font-semibold text-gray-800 mb-3">
                  Correo Electrónico
                </label>
                <div className="relative">
                  <Mail className="absolute left-4 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" />
                  <input
                    id="email"
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="w-full pl-12 pr-4 py-4 bg-gray-50/50 border border-gray-200 rounded-2xl focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all text-gray-900 placeholder-gray-500"
                    placeholder="admin@biocdkeys.com"
                    required
                    disabled={loading}
                  />
                </div>
              </div>

              <div>
                <label htmlFor="password" className="block text-sm font-semibold text-gray-800 mb-3">
                  Contraseña
                </label>
                <div className="relative">
                  <Lock className="absolute left-4 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" />
                  <input
                    id="password"
                    type={showPassword ? 'text' : 'password'}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="w-full pl-12 pr-12 py-4 bg-gray-50/50 border border-gray-200 rounded-2xl focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all text-gray-900 placeholder-gray-500"
                    placeholder="••••••••••••"
                    required
                    disabled={loading}
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-4 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600 transition-colors"
                    disabled={loading}
                  >
                    {showPassword ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
                  </button>
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
                    <span>Verificando acceso...</span>
                  </div>
                ) : (
                  <div className="flex items-center justify-center space-x-2">
                    <Shield className="h-5 w-5" />
                    <span>Acceder al Panel</span>
                  </div>
                )}
              </button>
            </form>

            {/* Footer */}
            <div className="mt-8 pt-6 border-t border-gray-200/50">
              <div className="text-center">
                <p className="text-sm text-gray-600 mb-3">
                  ¿Problemas para acceder?
                </p>
                <button
                  onClick={() => toast('Contacta al administrador del sistema para restablecer tu acceso', {
                    icon: 'ℹ️',
                    duration: 4000,
                  })}
                  className="text-blue-600 hover:text-blue-700 font-medium text-sm transition-colors"
                >
                  Solicitar ayuda técnica
                </button>
              </div>
            </div>
          </div>

          {/* Security Notice */}
          <div className="mt-6 text-center">
            <div className="inline-flex items-center space-x-2 bg-blue-50/80 backdrop-blur-sm text-blue-700 px-4 py-2 rounded-full text-sm border border-blue-200/50">
              <Lock className="h-4 w-4" />
              <span>Conexión segura y encriptada</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}