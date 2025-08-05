'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { Plus, Edit2, Trash2, Key, BarChart3, Users, Activity, LogOut, Search, Filter, Download, Eye, EyeOff, X, ChevronLeft, ChevronRight } from 'lucide-react'
import { supabase } from '@/lib/supabase'
import { checkAdminAuth, signOut } from '@/lib/auth'
import toast from 'react-hot-toast'

interface SoftwareKey {
  id: string
  key_value: string
  description: string
  is_active: boolean
  usage_count: number
  max_usage: number | null
  created_at: string
}

interface UsageLog {
  id: string
  iid: string
  cid: string | null
  success: boolean
  error_message: string | null
  created_at: string
  software_keys: {
    key_value: string
  }
}

interface Stats {
  totalKeys: number
  activeKeys: number
  inactiveKeys: number
  failedRequests: number
  successfulRequests: number
}

export default function AdminPage() {
  const router = useRouter()
  const [isAuthenticated, setIsAuthenticated] = useState(false)
  const [authLoading, setAuthLoading] = useState(true)
  const [keys, setKeys] = useState<SoftwareKey[]>([])
  const [logs, setLogs] = useState<UsageLog[]>([])
  const [stats, setStats] = useState<Stats>({
    totalKeys: 0,
    activeKeys: 0,
    inactiveKeys: 0,
    failedRequests: 0,
    successfulRequests: 0
  })
  const [loading, setLoading] = useState(true)
  const [showAddModal, setShowAddModal] = useState(false)
  const [editingKey, setEditingKey] = useState<SoftwareKey | null>(null)
  const [activeTab, setActiveTab] = useState<'keys' | 'logs' | 'stats'>('keys')
  const [searchTerm, setSearchTerm] = useState('')
  const [showInactiveKeys, setShowInactiveKeys] = useState(true)
  const [isBulkMode, setIsBulkMode] = useState(false)
  const [bulkKeys, setBulkKeys] = useState('')
  const [currentPage, setCurrentPage] = useState(1)
  const keysPerPage = 9

  // Form state
  const [formData, setFormData] = useState({
    key_value: '',
    description: '',
    max_usage: '',
    is_active: true
  })

  useEffect(() => {
    checkAuth()
  }, [])

  useEffect(() => {
    if (isAuthenticated) {
      loadData()
    }
  }, [isAuthenticated])

  const checkAuth = async () => {
    try {
      // Verificar si hay una sesión activa en Supabase
      const { data: { session }, error } = await supabase.auth.getSession()
      
      if (error || !session) {
        console.log('No active session found, redirecting to login')
        router.push('/admin/login')
        return
      }
      
      // Verificar que el usuario sea admin (validación básica en frontend)
      const userEmail = session.user?.email
      if (!userEmail) {
        console.log('No user email found, redirecting to login')
        await supabase.auth.signOut()
        router.push('/admin/login')
        return
      }
      
      console.log('Authentication successful for user:', userEmail)
      setIsAuthenticated(true)
    } catch (error) {
      console.error('Error checking auth:', error)
      router.push('/admin/login')
    } finally {
      setAuthLoading(false)
    }
  }

  const handleLogout = async () => {
    try {
      await signOut()
      router.push('/admin/login')
    } catch (error) {
      console.error('Error signing out:', error)
      toast.error('Error al cerrar sesión')
    }
  }

  const loadData = async () => {
    setLoading(true)
    try {
      // Load keys
      const { data: keysData, error: keysError } = await supabase
        .from('software_keys')
        .select('*')
        .order('created_at', { ascending: false })

      if (keysError) {
        console.error('Error loading keys:', keysError)
        toast.error(`Error al cargar claves: ${keysError.message}`)
        throw keysError
      }
      setKeys(keysData || [])

      // Load recent logs (más logs para mejor análisis)
      const { data: logsData, error: logsError } = await supabase
        .from('usage_logs')
        .select(`
          *,
          software_keys (key_value)
        `)
        .order('created_at', { ascending: false })
        .limit(100)

      if (logsError) {
        console.error('Error loading logs:', logsError)
        toast.error(`Error al cargar logs: ${logsError.message}`)
        // No lanzar error aquí para que las claves se puedan cargar
      }
      setLogs(logsData || [])

      // Calculate comprehensive stats
      const totalKeys = keysData?.length || 0
      const activeKeys = keysData?.filter(k => k.is_active).length || 0
      const inactiveKeys = keysData?.filter(k => !k.is_active).length || 0
      
      // Obtener estadísticas de todos los logs, no solo los recientes
      const { data: allLogsStats, error: statsError } = await supabase
        .from('usage_logs')
        .select('success')
      
      if (statsError) {
        console.error('Error loading stats:', statsError)
        toast.error(`Error al cargar estadísticas: ${statsError.message}`)
      }
      
      const successfulRequests = allLogsStats?.filter(l => l.success).length || 0
      const failedRequests = allLogsStats?.filter(l => !l.success).length || 0

      setStats({
        totalKeys,
        activeKeys,
        inactiveKeys,
        failedRequests,
        successfulRequests
      })

      // Debug info
      console.log('Debug Info:', {
        keysCount: keysData?.length,
        logsCount: logsData?.length,
        allLogsCount: allLogsStats?.length,
        successfulRequests,
        failedRequests,
        keysError,
        logsError,
        statsError
      })

    } catch (error) {
      console.error('Error loading data:', error)
      toast.error('Error al cargar los datos')
    } finally {
      setLoading(false)
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    if (isBulkMode) {
      // Modo masivo
      if (!bulkKeys.trim()) {
        toast.error('Ingresa al menos una clave')
        return
      }

      const keys = bulkKeys
        .split('\n')
        .map(key => key.trim())
        .filter(key => key.length > 0)

      if (keys.length === 0) {
        toast.error('No se encontraron claves válidas')
        return
      }

      try {
        const keyDataArray = keys.map(key => ({
          key_value: key,
          description: formData.description.trim() || null,
          max_usage: formData.max_usage ? parseInt(formData.max_usage) : null,
          is_active: formData.is_active
        }))

        const { error } = await supabase
          .from('software_keys')
          .insert(keyDataArray)

        if (error) throw error
        
        toast.success(`${keys.length} claves creadas exitosamente`)
        closeModal()
        loadData()

      } catch (error: any) {
        console.error('Error saving bulk keys:', error)
        if (error.code === '23505') {
          toast.error('Una o más claves ya existen')
        } else {
          toast.error('Error al guardar las claves')
        }
      }
    } else {
      // Modo individual
      if (!formData.key_value.trim()) {
        toast.error('La clave es requerida')
        return
      }

      try {
        const keyData = {
          key_value: formData.key_value.trim(),
          description: formData.description.trim() || null,
          max_usage: formData.max_usage ? parseInt(formData.max_usage) : null,
          is_active: formData.is_active
        }

        if (editingKey) {
          // Update existing key
          const { error } = await supabase
            .from('software_keys')
            .update(keyData)
            .eq('id', editingKey.id)

          if (error) throw error
          toast.success('Clave actualizada exitosamente')
        } else {
          // Create new key
          const { error } = await supabase
            .from('software_keys')
            .insert(keyData)

          if (error) throw error
          toast.success('Clave creada exitosamente')
        }

        closeModal()
        loadData()

      } catch (error: any) {
        console.error('Error saving key:', error)
        if (error.code === '23505') {
          toast.error('Esta clave ya existe')
        } else {
          toast.error('Error al guardar la clave')
        }
      }
    }
  }

  const toggleKeyStatus = async (key: SoftwareKey) => {
    try {
      const { error } = await supabase
        .from('software_keys')
        .update({ is_active: !key.is_active })
        .eq('id', key.id)

      if (error) throw error
      toast.success(`Clave ${!key.is_active ? 'activada' : 'desactivada'}`)
      loadData()
    } catch (error) {
      console.error('Error toggling key status:', error)
      toast.error('Error al cambiar el estado de la clave')
    }
  }

  const deleteKey = async (key: SoftwareKey) => {
    if (!confirm('¿Estás seguro de que quieres eliminar esta clave?')) return

    try {
      const { error } = await supabase
        .from('software_keys')
        .delete()
        .eq('id', key.id)

      if (error) throw error
      toast.success('Clave eliminada exitosamente')
      loadData()
    } catch (error) {
      console.error('Error deleting key:', error)
      toast.error('Error al eliminar la clave')
    }
  }

  const openEditModal = (key: SoftwareKey) => {
    setEditingKey(key)
    setFormData({
      key_value: key.key_value,
      description: key.description || '',
      max_usage: key.max_usage?.toString() || '',
      is_active: key.is_active
    })
    setShowAddModal(true)
  }

  const closeModal = () => {
    setShowAddModal(false)
    setEditingKey(null)
    setIsBulkMode(false)
    setBulkKeys('')
    setFormData({
      key_value: '',
      description: '',
      max_usage: '',
      is_active: true
    })
  }

  // Filtrar claves
  const filteredKeys = keys.filter(key => {
    const matchesSearch = key.key_value.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         (key.description && key.description.toLowerCase().includes(searchTerm.toLowerCase()))
    const matchesStatus = showInactiveKeys || key.is_active
    return matchesSearch && matchesStatus
  })

  // Paginación para claves
  const totalPages = Math.ceil(filteredKeys.length / keysPerPage)
  const startIndex = (currentPage - 1) * keysPerPage
  const endIndex = startIndex + keysPerPage
  const paginatedKeys = filteredKeys.slice(startIndex, endIndex)

  // Resetear página cuando cambie el filtro
  useEffect(() => {
    setCurrentPage(1)
  }, [searchTerm, showInactiveKeys])

  // Filtrar logs
  const filteredLogs = logs.filter(log => 
    log.iid.toLowerCase().includes(searchTerm.toLowerCase()) ||
    (log.software_keys?.key_value && log.software_keys.key_value.toLowerCase().includes(searchTerm.toLowerCase()))
  )



  if (authLoading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Verificando autenticación...</p>
        </div>
      </div>
    )
  }

  if (!isAuthenticated) {
    return null // El router ya redirigirá a login
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Cargando...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50/30">
      {/* Modern Header */}
      <header className="bg-white/80 backdrop-blur-md border-b border-gray-200/50 sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-6 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-4">
              <div className="w-8 h-8 bg-gradient-to-br from-blue-500 to-purple-600 rounded-lg flex items-center justify-center">
                <Key className="h-4 w-4 text-white" />
              </div>
              <div>
                <h1 className="text-xl font-semibold text-gray-900">Admin Dashboard</h1>
                <p className="text-sm text-gray-500">Gestión de claves y monitoreo</p>
              </div>
            </div>
            <div className="flex items-center space-x-3">
              <a
                href="/"
                className="px-3 py-2 text-sm text-gray-600 hover:text-gray-900 transition-colors"
              >
                ← Inicio
              </a>
              <button
                onClick={handleLogout}
                className="flex items-center space-x-2 px-3 py-2 text-sm text-red-600 hover:text-red-700 hover:bg-red-50 rounded-lg transition-all"
              >
                <LogOut className="h-4 w-4" />
                <span>Salir</span>
              </button>
            </div>
          </div>
        </div>
      </header>

      <div className="max-w-7xl mx-auto px-6 py-8">
        {/* Modern Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-5 gap-6 mb-8">
          <div className="bg-white/70 backdrop-blur-sm rounded-2xl border border-gray-200/50 p-6 hover:shadow-lg transition-all duration-300">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-500 mb-1">Total Claves</p>
                <p className="text-3xl font-bold text-gray-900">{stats.totalKeys}</p>
              </div>
              <div className="w-12 h-12 bg-blue-100 rounded-xl flex items-center justify-center">
                <Key className="h-6 w-6 text-blue-600" />
              </div>
            </div>
          </div>
          
          <div className="bg-white/70 backdrop-blur-sm rounded-2xl border border-gray-200/50 p-6 hover:shadow-lg transition-all duration-300">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-500 mb-1">Activas</p>
                <p className="text-3xl font-bold text-green-600">{stats.activeKeys}</p>
              </div>
              <div className="w-12 h-12 bg-green-100 rounded-xl flex items-center justify-center">
                <Activity className="h-6 w-6 text-green-600" />
              </div>
            </div>
          </div>
          
          <div className="bg-white/70 backdrop-blur-sm rounded-2xl border border-gray-200/50 p-6 hover:shadow-lg transition-all duration-300">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-500 mb-1">Inactivas</p>
                <p className="text-3xl font-bold text-gray-600">{stats.inactiveKeys}</p>
              </div>
              <div className="w-12 h-12 bg-gray-100 rounded-xl flex items-center justify-center">
                <EyeOff className="h-6 w-6 text-gray-600" />
              </div>
            </div>
          </div>
          
          <div className="bg-white/70 backdrop-blur-sm rounded-2xl border border-gray-200/50 p-6 hover:shadow-lg transition-all duration-300">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-500 mb-1">Fallidos</p>
                <p className="text-3xl font-bold text-red-600">{stats.failedRequests}</p>
              </div>
              <div className="w-12 h-12 bg-red-100 rounded-xl flex items-center justify-center">
                <X className="h-6 w-6 text-red-600" />
              </div>
            </div>
          </div>
          
          <div className="bg-white/70 backdrop-blur-sm rounded-2xl border border-gray-200/50 p-6 hover:shadow-lg transition-all duration-300">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-500 mb-1">Exitosos</p>
                <p className="text-3xl font-bold text-green-600">{stats.successfulRequests}</p>
              </div>
              <div className="w-12 h-12 bg-green-100 rounded-xl flex items-center justify-center">
                <Users className="h-6 w-6 text-green-600" />
              </div>
            </div>
          </div>
        </div>

        {/* Modern Tabs */}
        <div className="bg-white/70 backdrop-blur-sm rounded-2xl border border-gray-200/50 overflow-hidden">
          <div className="p-6 border-b border-gray-200/50">
            <div className="flex items-center justify-between">
              <nav className="flex space-x-1 bg-gray-100/50 rounded-xl p-1">
                <button
                  onClick={() => setActiveTab('keys')}
                  className={`px-6 py-2 rounded-lg font-medium text-sm transition-all ${
                    activeTab === 'keys'
                      ? 'bg-white text-gray-900 shadow-sm'
                      : 'text-gray-600 hover:text-gray-900'
                  }`}
                >
                  Claves
                </button>
                <button
                  onClick={() => setActiveTab('logs')}
                  className={`px-6 py-2 rounded-lg font-medium text-sm transition-all ${
                    activeTab === 'logs'
                      ? 'bg-white text-gray-900 shadow-sm'
                      : 'text-gray-600 hover:text-gray-900'
                  }`}
                >
                  Logs
                </button>
              </nav>
              
              {/* Search and Filters */}
              <div className="flex items-center space-x-3">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                  <input
                    type="text"
                    placeholder="Buscar..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="pl-10 pr-4 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
                  />
                </div>
                {activeTab === 'keys' && (
                  <button
                    onClick={() => setShowInactiveKeys(!showInactiveKeys)}
                    className={`flex items-center space-x-2 px-3 py-2 rounded-lg text-sm transition-all ${
                      showInactiveKeys 
                        ? 'bg-gray-100 text-gray-700' 
                        : 'bg-blue-100 text-blue-700'
                    }`}
                  >
                    {showInactiveKeys ? <Eye className="h-4 w-4" /> : <EyeOff className="h-4 w-4" />}
                    <span>{showInactiveKeys ? 'Todas' : 'Solo activas'}</span>
                  </button>
                )}
              </div>
            </div>
          </div>

          <div className="p-6">
            {activeTab === 'keys' && (
              <div>
                <div className="flex justify-between items-center mb-6">
                  <div>
                    <h2 className="text-lg font-semibold text-gray-900">Claves de Software</h2>
                    <p className="text-sm text-gray-500 mt-1">
                      {filteredKeys.length} claves encontradas
                      {totalPages > 1 && (
                        <span className="ml-2">
                          (Página {currentPage} de {totalPages})
                        </span>
                      )}
                    </p>
                  </div>
                  <button
                    onClick={() => setShowAddModal(true)}
                    className="bg-gradient-to-r from-blue-500 to-purple-600 text-white px-4 py-2 rounded-xl flex items-center space-x-2 hover:shadow-lg transition-all duration-300"
                  >
                    <Plus className="h-4 w-4" />
                    <span>Nueva Clave</span>
                  </button>
                </div>

                {filteredKeys.length === 0 ? (
                  <div className="text-center py-12">
                    <Key className="h-12 w-12 text-gray-300 mx-auto mb-4" />
                    <p className="text-gray-500">No se encontraron claves</p>
                  </div>
                ) : (
                  <>
                    <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
                      {paginatedKeys.map((key) => (
                      <div key={key.id} className={`bg-white/50 rounded-xl border-2 transition-all duration-300 hover:shadow-lg hover:scale-[1.02] ${
                        key.is_active 
                          ? 'border-green-200/50 hover:border-green-300' 
                          : 'border-gray-200/50 hover:border-gray-300'
                      }`}>
                        {/* Header con estado */}
                        <div className={`px-5 py-4 rounded-t-xl ${
                          key.is_active 
                            ? 'bg-gradient-to-r from-green-50 to-emerald-50 border-b border-green-100' 
                            : 'bg-gradient-to-r from-gray-50 to-slate-50 border-b border-gray-100'
                        }`}>
                          <div className="flex items-center justify-between">
                            <div className="flex items-center space-x-3">
                              <div className={`w-3 h-3 rounded-full ${
                                key.is_active ? 'bg-green-400 shadow-lg shadow-green-200' : 'bg-gray-400'
                              }`}></div>
                              <span className={`inline-flex px-3 py-1 text-sm font-semibold rounded-full ${
                                key.is_active
                                  ? 'bg-green-100 text-green-700'
                                  : 'bg-gray-100 text-gray-600'
                              }`}>
                                {key.is_active ? 'Activa' : 'Inactiva'}
                              </span>
                            </div>
                            <div className="flex items-center space-x-1">
                              <button
                                onClick={() => openEditModal(key)}
                                className="p-2 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-all"
                                title="Editar"
                              >
                                <Edit2 className="h-4 w-4" />
                              </button>
                              <button
                                onClick={() => toggleKeyStatus(key)}
                                className={`p-2 rounded-lg transition-all ${
                                  key.is_active 
                                    ? 'text-gray-400 hover:text-red-600 hover:bg-red-50' 
                                    : 'text-gray-400 hover:text-green-600 hover:bg-green-50'
                                }`}
                                title={key.is_active ? 'Desactivar' : 'Activar'}
                              >
                                {key.is_active ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                              </button>
                              <button
                                onClick={() => deleteKey(key)}
                                className="p-2 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-all"
                                title="Eliminar"
                              >
                                <Trash2 className="h-4 w-4" />
                              </button>
                            </div>
                          </div>
                        </div>

                        {/* Contenido del card */}
                        <div className="p-5 space-y-4">
                          {/* Clave de Software */}
                          <div>
                            <label className="text-xs font-medium text-gray-500 uppercase tracking-wide mb-2 block">
                              Clave de Software
                            </label>
                            <code className="block text-sm font-mono bg-gray-100 px-3 py-2 rounded-lg break-all text-gray-800 border">
                              {key.key_value}
                            </code>
                          </div>

                          {/* Descripción */}
                          <div>
                            <label className="text-xs font-medium text-gray-500 uppercase tracking-wide mb-2 block">
                              Descripción
                            </label>
                            <p className="text-sm text-gray-700 bg-gray-50 px-3 py-2 rounded-lg min-h-[2.5rem] flex items-center">
                              {key.description || 'Sin descripción'}
                            </p>
                          </div>

                          {/* Estadísticas de uso */}
                          <div className="grid grid-cols-2 gap-3">
                            <div className="bg-blue-50 px-3 py-2 rounded-lg">
                              <label className="text-xs font-medium text-blue-600 uppercase tracking-wide block">
                                Uso Actual
                              </label>
                              <span className="text-lg font-bold text-blue-800">
                                {key.usage_count}
                              </span>
                              {key.max_usage && (
                                <span className="text-sm text-blue-600">
                                  /{key.max_usage}
                                </span>
                              )}
                            </div>
                            <div className="bg-purple-50 px-3 py-2 rounded-lg">
                              <label className="text-xs font-medium text-purple-600 uppercase tracking-wide block">
                                Límite
                              </label>
                              <span className="text-lg font-bold text-purple-800">
                                {key.max_usage || '∞'}
                              </span>
                            </div>
                          </div>

                          {/* Barra de progreso (solo si hay límite) */}
                          {key.max_usage && (
                            <div>
                              <div className="flex justify-between text-xs text-gray-500 mb-1">
                                <span>Progreso de uso</span>
                                <span>{Math.round((key.usage_count / key.max_usage) * 100)}%</span>
                              </div>
                              <div className="w-full bg-gray-200 rounded-full h-2">
                                <div 
                                  className={`h-2 rounded-full transition-all duration-300 ${
                                    (key.usage_count / key.max_usage) >= 0.9 
                                      ? 'bg-red-400' 
                                      : (key.usage_count / key.max_usage) >= 0.7 
                                        ? 'bg-yellow-400' 
                                        : 'bg-green-400'
                                  }`}
                                  style={{ width: `${Math.min((key.usage_count / key.max_usage) * 100, 100)}%` }}
                                ></div>
                              </div>
                            </div>
                          )}

                          {/* Fecha de creación */}
                          <div className="pt-3 border-t border-gray-100">
                            <span className="text-xs text-gray-500">
                              Creada el {new Date(key.created_at).toLocaleDateString('es-ES', {
                                year: 'numeric',
                                month: 'long',
                                day: 'numeric'
                              })}
                            </span>
                          </div>
                        </div>
                      </div>
                    ))}
                    </div>

                    {/* Controles de Paginación */}
                    {totalPages > 1 && (
                      <div className="flex items-center justify-between mt-8 pt-6 border-t border-gray-200/50">
                        <div className="text-sm text-gray-500">
                          Mostrando {startIndex + 1} a {Math.min(endIndex, filteredKeys.length)} de {filteredKeys.length} claves
                        </div>
                        
                        <div className="flex items-center space-x-2">
                          <button
                            onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))}
                            disabled={currentPage === 1}
                            className={`flex items-center space-x-1 px-3 py-2 rounded-lg text-sm transition-all ${
                              currentPage === 1
                                ? 'text-gray-400 cursor-not-allowed'
                                : 'text-gray-600 hover:text-gray-900 hover:bg-gray-100'
                            }`}
                          >
                            <ChevronLeft className="h-4 w-4" />
                            <span>Anterior</span>
                          </button>
                          
                          <div className="flex items-center space-x-1">
                            {Array.from({ length: totalPages }, (_, i) => i + 1).map((page) => (
                              <button
                                key={page}
                                onClick={() => setCurrentPage(page)}
                                className={`w-8 h-8 rounded-lg text-sm font-medium transition-all ${
                                  currentPage === page
                                    ? 'bg-blue-500 text-white shadow-sm'
                                    : 'text-gray-600 hover:text-gray-900 hover:bg-gray-100'
                                }`}
                              >
                                {page}
                              </button>
                            ))}
                          </div>
                          
                          <button
                            onClick={() => setCurrentPage(prev => Math.min(prev + 1, totalPages))}
                            disabled={currentPage === totalPages}
                            className={`flex items-center space-x-1 px-3 py-2 rounded-lg text-sm transition-all ${
                              currentPage === totalPages
                                ? 'text-gray-400 cursor-not-allowed'
                                : 'text-gray-600 hover:text-gray-900 hover:bg-gray-100'
                            }`}
                          >
                            <span>Siguiente</span>
                            <ChevronRight className="h-4 w-4" />
                          </button>
                        </div>
                      </div>
                    )}
                  </>
                )}
              </div>
            )}

            {activeTab === 'logs' && (
              <div>
                <div className="mb-6">
                  <h2 className="text-lg font-semibold text-gray-900">Registro de Actividad</h2>
                  <p className="text-sm text-gray-500 mt-1">{filteredLogs.length} eventos registrados</p>
                </div>
                
                {filteredLogs.length === 0 ? (
                  <div className="text-center py-12">
                    <Activity className="h-12 w-12 text-gray-300 mx-auto mb-4" />
                    <p className="text-gray-500">No se encontraron registros</p>
                  </div>
                ) : (
                  <div className="space-y-4">
                    {filteredLogs.map((log) => (
                      <div key={log.id} className="bg-white/50 rounded-xl border border-gray-200/50 p-5 hover:shadow-md transition-all duration-300">
                        <div className="space-y-4">
                          {/* Header con estado y fecha */}
                          <div className="flex items-center justify-between">
                            <div className="flex items-center space-x-3">
                              <div className={`w-3 h-3 rounded-full ${
                                log.success ? 'bg-green-400' : 'bg-red-400'
                              }`}></div>
                              <span className={`inline-flex px-3 py-1 text-sm font-medium rounded-full ${
                                log.success
                                  ? 'bg-green-100 text-green-700'
                                  : 'bg-red-100 text-red-700'
                              }`}>
                                {log.success ? 'Exitoso' : 'Error'}
                              </span>
                            </div>
                            <span className="text-sm text-gray-500">
                              {new Date(log.created_at).toLocaleString()}
                            </span>
                          </div>

                          {/* Software Key */}
                          <div>
                            <label className="text-xs font-medium text-gray-500 uppercase tracking-wide">
                              Clave de Software
                            </label>
                            <code className="block text-sm font-mono bg-gray-100 px-3 py-2 rounded-lg mt-1 break-all">
                              {log.software_keys?.key_value || 'N/A'}
                            </code>
                          </div>

                          {/* IID */}
                          <div>
                            <label className="text-xs font-medium text-gray-500 uppercase tracking-wide">
                              Installation ID (IID)
                            </label>
                            <code className="block text-sm font-mono bg-blue-50 px-3 py-2 rounded-lg mt-1 break-all text-blue-800">
                              {log.iid}
                            </code>
                          </div>

                          {/* CID - Solo si es exitoso */}
                          {log.success && log.cid && (
                            <div>
                              <label className="text-xs font-medium text-gray-500 uppercase tracking-wide">
                                Customer ID (CID)
                              </label>
                              <code className="block text-sm font-mono bg-green-50 px-3 py-2 rounded-lg mt-1 break-all text-green-800">
                                {log.cid}
                              </code>
                            </div>
                          )}

                          {/* Error Message - Solo si hay error */}
                          {!log.success && log.error_message && (
                            <div>
                              <label className="text-xs font-medium text-red-500 uppercase tracking-wide">
                                Mensaje de Error
                              </label>
                              <div className="bg-red-50 px-3 py-2 rounded-lg mt-1">
                                <span className="text-sm text-red-700">
                                  {log.error_message}
                                </span>
                              </div>
                            </div>
                          )}

                          {/* Additional Info */}
                          <div className="flex items-center space-x-4 pt-2 border-t border-gray-100">
                            <span className="text-xs text-gray-500">
                              ID: <code className="bg-gray-100 px-2 py-1 rounded">{log.id}</code>
                            </span>
                            <span className="text-xs text-gray-500">
                              IID: <code className="bg-gray-100 px-2 py-1 rounded">{log.iid}</code>
                            </span>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Add/Edit Modal */}
      {showAddModal && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl p-6 w-full max-w-lg shadow-2xl">
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-xl font-semibold text-gray-900">
                {editingKey ? 'Editar Clave' : 'Nueva Clave'}
              </h3>
              <button
                onClick={closeModal}
                className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg transition-all"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            {/* Selector de modo (solo para nuevas claves) */}
            {!editingKey && (
              <div className="mb-6">
                <div className="flex items-center space-x-1 bg-gray-100 rounded-lg p-1">
                  <button
                    type="button"
                    onClick={() => setIsBulkMode(false)}
                    className={`flex-1 px-3 py-2 text-sm font-medium rounded-md transition-all ${
                      !isBulkMode 
                        ? 'bg-white text-gray-900 shadow-sm' 
                        : 'text-gray-600 hover:text-gray-900'
                    }`}
                  >
                    Clave Individual
                  </button>
                  <button
                    type="button"
                    onClick={() => setIsBulkMode(true)}
                    className={`flex-1 px-3 py-2 text-sm font-medium rounded-md transition-all ${
                      isBulkMode 
                        ? 'bg-white text-gray-900 shadow-sm' 
                        : 'text-gray-600 hover:text-gray-900'
                    }`}
                  >
                    Claves Masivas
                  </button>
                </div>
              </div>
            )}
            
            <form onSubmit={handleSubmit} className="space-y-5">
              {/* Campo de claves (individual o masivo) */}
              {isBulkMode && !editingKey ? (
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <label className="block text-sm font-medium text-gray-700">
                      Claves de Software
                    </label>
                    <div className="flex items-center space-x-2">
                      {bulkKeys.trim() && (
                        <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                          bulkKeys.split('\n').filter(key => key.trim()).length > 0
                            ? 'bg-blue-100 text-blue-800'
                            : 'bg-gray-100 text-gray-800'
                        }`}>
                          {bulkKeys.split('\n').filter(key => key.trim()).length} clave{bulkKeys.split('\n').filter(key => key.trim()).length !== 1 ? 's' : ''} detectada{bulkKeys.split('\n').filter(key => key.trim()).length !== 1 ? 's' : ''}
                        </span>
                      )}
                    </div>
                  </div>
                  <textarea
                    value={bulkKeys}
                    onChange={(e) => setBulkKeys(e.target.value)}
                    className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all resize-none font-mono text-sm"
                    rows={8}
                    placeholder="Ingresa una clave por línea:&#10;CLAVE-001&#10;CLAVE-002&#10;CLAVE-003"
                    required
                  />
                  <div className="flex items-center justify-between mt-2">
                    <p className="text-xs text-gray-500">
                      Ingresa una clave por línea. Las líneas vacías serán ignoradas.
                    </p>
                    {bulkKeys.trim() && (
                      <p className="text-xs text-gray-400">
                        {bulkKeys.split('\n').length} línea{bulkKeys.split('\n').length !== 1 ? 's' : ''} total
                      </p>
                    )}
                  </div>
                </div>
              ) : (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Clave de Software
                  </label>
                  <input
                    type="text"
                    value={formData.key_value}
                    onChange={(e) => setFormData({ ...formData, key_value: e.target.value })}
                    className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
                    placeholder="Ingresa la clave..."
                    required
                  />
                </div>
              )}
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Descripción {isBulkMode && !editingKey && <span className="text-xs text-gray-500">(aplicará a todas las claves)</span>}
                </label>
                <textarea
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all resize-none"
                  rows={3}
                  placeholder="Descripción opcional..."
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Límite de Uso {isBulkMode && !editingKey && <span className="text-xs text-gray-500">(aplicará a todas las claves)</span>}
                </label>
                <input
                  type="number"
                  value={formData.max_usage}
                  onChange={(e) => setFormData({ ...formData, max_usage: e.target.value })}
                  className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
                  placeholder="Sin límite"
                  min="1"
                />
              </div>
              
              <div className="flex items-center justify-between p-4 bg-gray-50 rounded-xl">
                <div>
                  <label htmlFor="is_active" className="text-sm font-medium text-gray-900">
                    Estado de la Clave{isBulkMode && !editingKey ? 's' : ''}
                  </label>
                  <p className="text-xs text-gray-500">
                    {isBulkMode && !editingKey ? 'Activar o desactivar todas las claves' : 'Activar o desactivar la clave'}
                  </p>
                </div>
                <label className="relative inline-flex items-center cursor-pointer">
                  <input
                    type="checkbox"
                    id="is_active"
                    checked={formData.is_active}
                    onChange={(e) => setFormData({...formData, is_active: e.target.checked})}
                    className="sr-only peer"
                  />
                  <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
                </label>
              </div>
              
              <div className="flex space-x-3 pt-4">
                <button
                  type="button"
                  onClick={closeModal}
                  className="flex-1 px-4 py-3 text-sm font-medium text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-xl transition-all"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="flex-1 bg-gradient-to-r from-blue-500 to-purple-600 text-white px-4 py-3 rounded-xl font-medium hover:shadow-lg transition-all duration-300"
                >
                  {editingKey ? 'Actualizar' : (isBulkMode ? 'Crear Claves' : 'Crear')}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}