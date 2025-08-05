import { supabase } from './supabase'

export const checkAdminAuth = async () => {
  try {
    const { data: { user }, error } = await supabase.auth.getUser()
    
    if (error || !user) {
      return { isAuthenticated: false, user: null }
    }

    // Verificar que el usuario sea el administrador
    const isAdmin = user.email === process.env.NEXT_PUBLIC_ADMIN_EMAIL
    
    return { 
      isAuthenticated: isAdmin, 
      user: isAdmin ? user : null 
    }
  } catch (error) {
    return { isAuthenticated: false, user: null }
  }
}

export const signOut = async () => {
  try {
    await supabase.auth.signOut()
    return { success: true }
  } catch (error) {
    return { success: false, error }
  }
}