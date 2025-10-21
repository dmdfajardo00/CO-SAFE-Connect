import { supabase, type User } from '@/lib/supabase'

/**
 * Check if a user exists by email
 */
export async function checkUserExists(email: string): Promise<User | null> {
  try {
    const { data, error } = await supabase
      .from('users')
      .select('*')
      .eq('email', email)
      .single()

    if (error) {
      // User doesn't exist
      if (error.code === 'PGRST116') {
        return null
      }
      throw error
    }

    return data
  } catch (error) {
    console.error('Error checking user:', error)
    throw error
  }
}

/**
 * Create a new user
 */
export async function createUser(email: string, name: string): Promise<User> {
  try {
    const { data, error } = await supabase
      .from('users')
      .insert([
        {
          email,
          name,
        },
      ])
      .select()
      .single()

    if (error) throw error

    return data
  } catch (error) {
    console.error('Error creating user:', error)
    throw error
  }
}

/**
 * Get user by ID
 */
export async function getUserById(id: string): Promise<User | null> {
  try {
    const { data, error } = await supabase
      .from('users')
      .select('*')
      .eq('id', id)
      .single()

    if (error) throw error

    return data
  } catch (error) {
    console.error('Error getting user:', error)
    return null
  }
}

/**
 * Get user sessions
 */
export async function getUserSessions(userId: string) {
  try {
    const { data, error } = await supabase
      .from('sessions')
      .select('*')
      .eq('user_id', userId)
      .order('started_at', { ascending: false })

    if (error) throw error

    return data
  } catch (error) {
    console.error('Error getting user sessions:', error)
    return []
  }
}
