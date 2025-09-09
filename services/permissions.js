// permissions.js  (Supabase version — replaces the Firebase one)
const { createClient } = require('@supabase/supabase-js');

const supabaseUrl =
  process.env.SUPABASE_URL;

const supabaseKey =
  process.env.SUPABASE_SERVICE_ROLE_KEY ||
  process.env.SUPABASE_SERVICE_KEY ||
  process.env.SUPABASE_ANON_KEY; // last resort; prefer service role on server

if (!supabaseUrl || !supabaseKey) {
  console.warn('⚠️ Supabase env vars missing: SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY');
}

const supabase = createClient(supabaseUrl, supabaseKey);

// If your user row lives in a different table, set SUPABASE_USER_TABLE in Secrets.
const USER_TABLE = process.env.SUPABASE_USER_TABLE || 'user_signup';

/**
 * checkPermissions(user_id) — returns { status, data? }
 * status ∈ 'admin' | 'premium' | 'standard' | 'unknown' | 'not_found' | 'error'
 */
async function checkPermissions(user_id) {
  try {
    // We’ll look up by any of these columns so you can pass create_user_id or id, etc.
    const lookupCols = ['id', 'user_id', 'create_user_id', 'user_id_hidden_field'];
    const orExpr = lookupCols.map(col => `${col}.eq.${user_id}`).join(',');

    const { data, error } = await supabase
      .from(USER_TABLE)
      .select('*, product_id, subscription_type, access_level')
      .or(orExpr)
      .limit(1)
      .maybeSingle();

    if (error) throw error;
    if (!data) return { status: 'not_found' };

    // Determine plan from common fields
    const raw =
      (data.product_id ||
       data.subscription_type ||
       data.access_level ||
       '').toString().toLowerCase();

    let status = 'unknown';
    if (raw === 'admin') status = 'admin';
    else if (['premium', 'pro'].includes(raw)) status = 'premium';
    else if (['standard', 'basic', 'free'].includes(raw)) status = 'standard';

    return { status, data };
  } catch (error) {
    console.error('Permission check failed:', error);
    return { status: 'error', error };
  }
}

module.exports = { checkPermissions };

