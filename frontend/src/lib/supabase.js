import { createClient } from '@supabase/supabase-js'

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error(
    'Missing VITE_SUPABASE_URL or VITE_SUPABASE_ANON_KEY environment variables'
  )
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey)

/**
 * Sign up new user with Supabase Auth
 * @param {string} email
 * @param {string} password
 * @returns {Promise<{user, session, error}>}
 */
export async function signUp(email, password) {
  const { data, error } = await supabase.auth.signUp({
    email,
    password,
  })
  return { user: data.user, session: data.session, error }
}

/**
 * Sign in with email and password
 * @param {string} email
 * @param {string} password
 * @returns {Promise<{user, session, error}>}
 */
export async function signIn(email, password) {
  const { data, error } = await supabase.auth.signInWithPassword({
    email,
    password,
  })
  return { user: data.user, session: data.session, error }
}

/**
 * Sign out current user
 * @returns {Promise<{error}>}
 */
export async function signOut() {
  const { error } = await supabase.auth.signOut()
  return { error }
}

/**
 * Get current user
 * @returns {Promise<{user, error}>}
 */
export async function getCurrentUser() {
  const { data, error } = await supabase.auth.getUser()
  return { user: data.user, error }
}

/**
 * Listen to auth state changes
 * @param {function} callback - Called with {event, session}
 * @returns {function} Unsubscribe function
 */
export function onAuthStateChange(callback) {
  const { data } = supabase.auth.onAuthStateChange((event, session) => {
    callback({ event, session })
  })
  return data.subscription.unsubscribe
}

/**
 * Upload file to Supabase Storage
 * @param {File} file - File object from input
 * @param {string} bucketName - 'documents' or 'media'
 * @param {string} path - Path in bucket (e.g., 'doc-123/file.pdf')
 * @returns {Promise<{url, error}>}
 */
export async function uploadFile(file, bucketName, path) {
  const { data, error } = await supabase.storage
    .from(bucketName)
    .upload(path, file)

  if (error) {
    return { url: null, error }
  }

  // Get public URL
  const { data: urlData } = supabase.storage
    .from(bucketName)
    .getPublicUrl(data.path)

  return { url: urlData.publicUrl, error: null }
}

/**
 * Delete file from Supabase Storage
 * @param {string} bucketName - 'documents' or 'media'
 * @param {string} path - Path in bucket
 * @returns {Promise<{error}>}
 */
export async function deleteFile(bucketName, path) {
  const { error } = await supabase.storage
    .from(bucketName)
    .remove([path])
  return { error }
}
