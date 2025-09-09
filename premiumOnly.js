// premiumOnly.js  (Supabase version — replaces Firebase admin/firestore)
const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_SERVICE_KEY
);

// Your users table (change via secret if needed)
const USER_TABLE = process.env.SUPABASE_USER_TABLE || 'user_signup';

// When true, block standard users from premium routes.
// While you're finishing images, leave it unset/false to allow everything.
const ENFORCE_ACCESS = String(process.env.ENFORCE_PRODUCT_ACCESS).toLowerCase() === 'true';

/** Internal: read the latest user row by any known id field */
async function fetchUserRow(userId) {
  // Try user_id, create_user_id, or numeric id
  const { data, error } = await supabase
    .from(USER_TABLE)
    .select('id, user_id, create_user_id, product_id, subscription_type, access_level, updated_at, created_at')
    .or(`user_id.eq.${userId},create_user_id.eq.${userId},id.eq.${userId}`)
    .limit(1)
    .maybeSingle();

  if (error) throw error;
  return data || null;
}

/** Return access tier string: 'admin' | 'premium' | 'standard' | 'unknown' */
async function getUserAccess(userId) {
  const row = await fetchUserRow(userId);
  if (!row) throw new Error('No user data found for user_id');

  const raw = String(
    row.product_id ?? row.subscription_type ?? row.access_level ?? ''
  ).toLowerCase();

  if (raw === 'admin') return 'admin';
  if (['premium', 'pro'].includes(raw)) return 'premium';
  if (['standard', 'basic', 'free'].includes(raw)) return 'standard';
  return 'unknown';
}

/** Express middleware: gate premium routes (respects ENFORCE_PRODUCT_ACCESS) */
async function premiumOnly(req, res, next) {
  const userId =
    req.query.user_id ||
    req.headers['x-user-id'] ||
    req.body?.user_id ||
    req.params?.userId;

  if (!userId) return res.status(400).send('Missing user_id');

  try {
    const tier = await getUserAccess(userId);

    if (!ENFORCE_ACCESS) {
      if (!['premium', 'admin'].includes(tier)) {
        console.log(`[ACCESS][BETA] Non-premium user (${userId}, tier=${tier}) hit premium route.`);
      }
      return next(); // beta mode: allow
    }

    if (tier === 'premium' || tier === 'admin') return next();
    return res.status(403).send('Upgrade required to access this feature');
  } catch (err) {
    console.error('Access check failed:', err.message || err);
    return res.status(500).send('Error checking access level');
  }
}

/** Helper: check a user’s current product_id/tier */
async function checkUserProductId(userId) {
  try {
    const productId = await getUserAccess(userId);
    return { success: true, productId };
  } catch (error) {
    return { success: false, error: error.message || String(error) };
  }
}

/** Helper: upgrade (or set) a user’s product_id */
async function upgradeUserToProduct(userId, productId = 'premium') {
  try {
    // Prefer user_id; if no match, fall back to create_user_id
    let { data, error } = await supabase
      .from(USER_TABLE)
      .update({ product_id, updated_at: new Date().toISOString() })
      .eq('user_id', userId)
      .select()
      .maybeSingle();

    if ((!data || error?.code === 'PGRST116')) {
      ({ data, error } = await supabase
        .from(USER_TABLE)
        .update({ product_id, updated_at: new Date().toISOString() })
        .eq('create_user_id', userId)
        .select()
        .maybeSingle());
    }

    if (error) throw error;
    if (!data) throw new Error('User not found');

    console.log(`✅ User ${userId} set to product_id=${productId}`);
    return { success: true, productId };
  } catch (error) {
    console.error(`❌ Error upgrading user:`, error.message || error);
    return { success: false, error: error.message || String(error) };
  }
}

module.exports = {
  premiumOnly,
  getUserAccess,
  checkUserProductId,
  upgradeUserToProduct
};
