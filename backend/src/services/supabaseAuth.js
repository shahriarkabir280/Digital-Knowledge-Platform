/**
 * Supabase Authentication Service
 * Handles user authentication with Supabase Auth (optional)
 * Can work alongside or replace JWT-based auth
 * 
 * Optional integration - keep existing JWT for backward compatibility
 */

const { createClient } = require("@supabase/supabase-js");
const ws = require("ws");

let supabaseAuth;

/**
 * Initialize Supabase Auth client
 * Uses service role key for admin operations
 */
function initSupabaseAuth() {
  const supabaseUrl = process.env.SUPABASE_URL;
  const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!supabaseUrl || !supabaseKey) {
    throw new Error("Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY environment variables");
  }

  supabaseAuth = createClient(supabaseUrl, supabaseKey, {
    auth: {
      persistSession: false
    },
    realtime: {
      transport: ws
    }
  });
  console.log("✅ Supabase Auth client initialized");
  return supabaseAuth;
}

/**
 * Get Supabase Auth client instance
 */
function getSupabaseAuth() {
  if (!supabaseAuth) {
    initSupabaseAuth();
  }
  return supabaseAuth;
}

/**
 * Create a new user in Supabase Auth
 * @param {string} email - User email
 * @param {string} password - User password
 * @param {object} metadata - Additional user metadata
 * @returns {Promise<{user: object}>}
 */
async function createUser(email, password, metadata = {}) {
  try {
    const auth = getSupabaseAuth();

    const { data, error } = await auth.auth.admin.createUser({
      email,
      password,
      user_metadata: metadata,
      email_confirm: true, // Auto-confirm email
    });

    if (error) {
      throw new Error(`Failed to create user: ${error.message}`);
    }

    console.log(`✓ User created: ${email}`);
    return { user: data.user };
  } catch (error) {
    throw new Error(`User creation failed: ${error.message}`);
  }
}

/**
 * Delete a user from Supabase Auth
 * @param {string} userId - Supabase user ID
 * @returns {Promise<void>}
 */
async function deleteUser(userId) {
  try {
    const auth = getSupabaseAuth();

    const { error } = await auth.auth.admin.deleteUser(userId);

    if (error) {
      throw new Error(`Failed to delete user: ${error.message}`);
    }

    console.log(`✓ User deleted: ${userId}`);
  } catch (error) {
    throw new Error(`User deletion failed: ${error.message}`);
  }
}

/**
 * Update user in Supabase Auth
 * @param {string} userId - Supabase user ID
 * @param {object} updates - Fields to update (email, password, user_metadata, etc.)
 * @returns {Promise<{user: object}>}
 */
async function updateUser(userId, updates) {
  try {
    const auth = getSupabaseAuth();

    const { data, error } = await auth.auth.admin.updateUserById(userId, updates);

    if (error) {
      throw new Error(`Failed to update user: ${error.message}`);
    }

    console.log(`✓ User updated: ${userId}`);
    return { user: data.user };
  } catch (error) {
    throw new Error(`User update failed: ${error.message}`);
  }
}

/**
 * Get user by ID
 * @param {string} userId - Supabase user ID
 * @returns {Promise<{user: object}>}
 */
async function getUser(userId) {
  try {
    const auth = getSupabaseAuth();

    const { data, error } = await auth.auth.admin.getUserById(userId);

    if (error) {
      throw new Error(`User not found: ${error.message}`);
    }

    return { user: data.user };
  } catch (error) {
    throw new Error(`Failed to get user: ${error.message}`);
  }
}

/**
 * List all users
 * @returns {Promise<{users: object[]}>}
 */
async function listUsers() {
  try {
    const auth = getSupabaseAuth();

    const { data, error } = await auth.auth.admin.listUsers();

    if (error) {
      throw new Error(`Failed to list users: ${error.message}`);
    }

    return { users: data.users };
  } catch (error) {
    throw new Error(`Failed to list users: ${error.message}`);
  }
}

/**
 * Verify JWT token from Supabase
 * @param {string} token - JWT token
 * @returns {Promise<{user: object}>}
 */
async function verifyToken(token) {
  try {
    const auth = getSupabaseAuth();

    const { data, error } = await auth.auth.getUser(token);

    if (error) {
      throw new Error(`Invalid token: ${error.message}`);
    }

    return { user: data.user };
  } catch (error) {
    throw new Error(`Token verification failed: ${error.message}`);
  }
}

module.exports = {
  initSupabaseAuth,
  getSupabaseAuth,
  createUser,
  deleteUser,
  updateUser,
  getUser,
  listUsers,
  verifyToken,
};
