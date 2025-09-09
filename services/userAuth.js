// users.js (Supabase version — no Firebase)
const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(
  process.env.SUPABASE_URL,
  // Use the SERVICE_ROLE key on the server so admin auth works
  process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_SERVICE_KEY
);

// Your table; change via secret if needed
const USER_TABLE = process.env.SUPABASE_USER_TABLE || 'user_signup';

// Helper: upsert a row in user_signup keyed by user_id
async function upsertUserRow(payload) {
  const { data, error } = await supabase
    .from(USER_TABLE)
    .upsert(payload, { onConflict: 'user_id' }) // requires unique index on user_id
    .select()
    .maybeSingle();
  if (error) throw error;
  return data;
}

// Create a new user account (server-side; Supabase Auth admin)
async function createUser(email, password, fullName) {
  try {
    const { data: created, error: createErr } = await supabase.auth.admin.createUser({
      email,
      password,
      user_metadata: { full_name: fullName }
    });
    if (createErr) throw createErr;

    const userId = created.user.id;
    console.log('✅ User created with ID:', userId);

    const row = await upsertUserRow({
      user_id: userId,
      email,
      full_name: fullName,
      created_at: new Date().toISOString(),
      // Uncomment if you want a default plan now:
      // product_id: 'standard'
    });

    console.log('✅ User data stored in Supabase table');
    return { success: true, userId, data: row };
  } catch (error) {
    console.error('❌ Error creating user:', error.message || error);
    throw error;
  }
}

// Get user by ID (supports user_id, create_user_id, or numeric id)
async function getUserById(userId) {
  try {
    const { data, error } = await supabase
      .from(USER_TABLE)
      .select('*')
      .or(`user_id.eq.${userId},create_user_id.eq.${userId},id.eq.${userId}`)
      .limit(1)
      .maybeSingle();

    if (error) throw error;
    if (!data) throw new Error('User not found');

    return { id: data.user_id || data.id, ...data };
  } catch (error) {
    console.error('❌ Error fetching user:', error.message || error);
    throw error;
  }
}

// Update user info (prefers user_id; falls back to create_user_id)
async function updateUser(userId, updateData) {
  try {
    const payload = { ...updateData, updated_at: new Date().toISOString() };

    // Try user_id first
    let q = supabase.from(USER_TABLE).update(payload).eq('user_id', userId).select().maybeSingle();
    let { data, error } = await q;

    if (error?.code === 'PGRST116' || (!error && !data)) {
      // No row matched user_id; try create_user_id
      ({ data, error } = await supabase
        .from(USER_TABLE)
        .update(payload)
        .eq('create_user_id', userId)
        .select()
        .maybeSingle());
    }

    if (error) throw error;
    console.log('✅ User updated successfully');
    return { success: true, data };
  } catch (error) {
    console.error('❌ Error updating user:', error.message || error);
    throw error;
  }
}

// Alias for compatibility with your old API
async function signUp(email, password, fullName = 'User Full Name') {
  return createUser(email, password, fullName);
}

module.exports = {
  createUser,
  getUserById,
  updateUser,
  signUp
};
