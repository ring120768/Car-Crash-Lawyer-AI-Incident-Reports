// services/userSignUps.js (Supabase version — no Firebase)
const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_SERVICE_KEY
);

// Change if your table name is different
const USER_TABLE = process.env.SUPABASE_USER_TABLE || 'user_signup';

/**
 * Get user details by ID (accepts user_id, create_user_id, or numeric id)
 */
async function getUserDetails(userId) {
  try {
    const { data, error } = await supabase
      .from(USER_TABLE)
      .select('*')
      .or(`user_id.eq.${userId},create_user_id.eq.${userId},id.eq.${userId}`)
      .limit(1)
      .maybeSingle();

    if (error) throw error;
    if (!data) {
      return { success: false, error: 'User not found' };
    }
    return { success: true, data };
  } catch (error) {
    console.error('❌ Error fetching user details:', error);
    return { success: false, error: error.message || String(error) };
  }
}

/**
 * Realtime listener for user sign-ups.
 * Usage:
 *   const unsubscribe = subscribeToUserSignUps({
 *     onAdded: (row) => {},
 *     onModified: (newRow, oldRow) => {},
 *     onRemoved: (oldRow) => {}
 *   });
 *   // later: unsubscribe();
 */
function subscribeToUserSignUps(handlers = {}) {
  const { onAdded, onModified, onRemoved } = handlers;

  const channel = supabase
    .channel('user_signup_changes')
    .on(
      'postgres_changes',
      { event: '*', schema: 'public', table: USER_TABLE },
      (payload) => {
        const t = payload.eventType; // 'INSERT' | 'UPDATE' | 'DELETE'
        if (t === 'INSERT' && onAdded) onAdded(payload.new);
        else if (t === 'UPDATE' && onModified) onModified(payload.new, payload.old);
        else if (t === 'DELETE' && onRemoved) onRemoved(payload.old);
        else console.log('User signup change:', t, payload);
      }
    )
    .subscribe((status) => {
      console.log('Realtime status (user_signup):', status);
    });

  // Return unsubscribe handle (mirrors your Firebase pattern)
  return () => {
    try {
      supabase.removeChannel(channel);
    } catch (_) {}
  };
}

module.exports = { subscribeToUserSignUps, getUserDetails };


