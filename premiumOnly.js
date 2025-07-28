const admin = require("firebase-admin");
const db = admin.firestore();

const ENFORCE_ACCESS = process.env.ENFORCE_PRODUCT_ACCESS === "true";

async function getUserAccess(userId) {
  const snapshot = await db
    .collection("Car Crash Lawyer AI User Sign Up")
    .where("user_id", "==", userId)
    .orderBy("created", "desc")
    .limit(1)
    .get();

  if (snapshot.empty) throw new Error("No user data found for user_id");

  const doc = snapshot.docs[0].data();
  return doc.product_id || "standard";
}

async function premiumOnly(req, res, next) {
  const userId = req.query.user_id;
  if (!userId) return res.status(400).send("Missing user_id");

  try {
    const productId = await getUserAccess(userId);

    if (!ENFORCE_ACCESS) {
      if (productId !== "premium") {
        console.log(`[ACCESS][BETA-MODE] Standard user (${userId}) accessed Premium route.`);
      }
      return next();
    }

    if (productId === "premium") {
      return next();
    } else {
      return res.status(403).send("Upgrade required to access this feature");
    }

  } catch (err) {
    console.error("Access check failed:", err.message);
    return res.status(500).send("Error checking access level");
  }
}

// Additional helper functions for managing premium access
async function checkUserProductId(userId) {
  try {
    const productId = await getUserAccess(userId);
    return { success: true, productId };
  } catch (error) {
    return { success: false, error: error.message };
  }
}

async function upgradeUserToProduct(userId, productId = "premium") {
  try {
    const snapshot = await db
      .collection("Car Crash Lawyer AI User Sign Up")
      .where("user_id", "==", userId)
      .limit(1)
      .get();

    if (snapshot.empty) {
      throw new Error("No user data found for user_id");
    }

    const docRef = snapshot.docs[0].ref;
    await docRef.update({
      product_id: productId,
      updated: new Date()
    });

    console.log(`✅ User ${userId} upgraded to ${productId}`);
    return { success: true, productId };
  } catch (error) {
    console.error(`❌ Error upgrading user to ${productId}:`, error.message);
    return { success: false, error: error.message };
  }
}

module.exports = {
  premiumOnly,
  getUserAccess,
  checkUserProductId,
  upgradeUserToProduct
};