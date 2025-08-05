import { supabase } from './supabase'

export const checkAdminAuth = async () => {
  try {
    const { data: { user }, error } = await supabase.auth.getUser()
    
    if (error || !user) {
      return { isAuthenticated: false, user: null }
    }

    // El middleware ya se encarga de validar que sea admin
    // Aquí solo verificamos que haya una sesión válida
    return { 
      isAuthenticated: true, 
      user: user 
    }
  } catch (error) {
    console.error('Error in checkAdminAuth:', error)
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