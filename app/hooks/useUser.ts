import { create } from 'zustand'
import { getSupabase } from '../auth/supabase'
import { User } from '@supabase/supabase-js'

interface Profile {
  user_id: string
  display_name: string | null
  role: 'customer' | 'agent' | 'admin'
}

interface UserState {
  user: (User & Profile) | null
  loading: boolean
  error: Error | null
  fetchUser: () => Promise<void>
  signOut: () => Promise<void>
}

export const useUser = create<UserState>((set) => ({
  user: null,
  loading: true,
  error: null,
  fetchUser: async () => {
    try {
      const supabase = getSupabase()
      const { data: { user }, error } = await supabase.auth.getUser()
      
      if (error) throw error
      
      if (user) {
        // Fetch additional user data from profiles table
        const { data: profile, error: profileError } = await supabase
          .from('profiles')
          .select('*')
          .eq('user_id', user.id)
          .single()
          
        if (profileError) throw profileError
        
        set({ user: { ...user, ...profile }, loading: false, error: null })
      } else {
        set({ user: null, loading: false, error: null })
      }
    } catch (error) {
      set({ error: error as Error, loading: false })
    }
  },
  signOut: async () => {
    const supabase = getSupabase()
    await supabase.auth.signOut()
    set({ user: null })
  }
})) 