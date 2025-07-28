const { db } = require("./firebase");

async function checkPermissions(user_id) {
  try {
    const snapshot = await db
      .collection("Car Crash Lawyer AI User Sign Up")
      .where("user_id", "==", user_id)
      .limit(1)
      .get();

    if (snapshot.empty) {
      return { status: "not_found" };
    }

    const userData = snapshot.docs[0].data();
    const productId = (userData.product_id || "").toLowerCase();

    if (productId === "admin") {
      return { status: "admin", data: userData };
    } else if (productId === "premium") {
      return { status: "premium", data: userData };
    } else if (productId === "standard") {
      return { status: "standard", data: userData };
    } else {
      return { status: "unknown", data: userData };
    }

  } catch (error) {
    console.error("Permission check failed:", error);
    return { status: "error", error };
  }
}

module.exports = { checkPermissions };