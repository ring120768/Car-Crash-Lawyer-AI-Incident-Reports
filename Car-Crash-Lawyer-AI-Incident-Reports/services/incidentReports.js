// Wait for map tile load, then trigger screenshot upload
import html2canvas from "https://cdn.jsdelivr.net/npm/html2canvas@1.4.1/dist/html2canvas.min.js";
import {
  getAuth,
  onAuthStateChanged
} from "https://www.gstatic.com/firebasejs/9.6.11/firebase-auth.js";
import {
  getFirestore,
  doc,
  updateDoc
} from "https://www.gstatic.com/firebasejs/9.6.11/firebase-firestore.js";
import {
  getStorage,
  ref,
  uploadString,
  getDownloadURL
} from "https://www.gstatic.com/firebasejs/9.6.11/firebase-storage.js";

const auth = getAuth();
const db = getFirestore();
const storage = getStorage();

function waitForMapToLoad(callback) {
  const maxWait = 10000;
  const checkInterval = 250;
  let waited = 0;

  const check = () => {
    const tiles = document.querySelectorAll('img.leaflet-tile');
    const loaded = [...tiles].every(img => img.complete);

    if (loaded || waited >= maxWait) {
      callback();
    } else {
      waited += checkInterval;
      setTimeout(check, checkInterval);
    }
  };

  check();
}

onAuthStateChanged(auth, async (user) => {
  if (!user) return;

  waitForMapToLoad(async () => {
    try {
      const target = document.getElementById('screenshotTarget');
      if (!target) return;

      const canvas = await html2canvas(target);
      const imgData = canvas.toDataURL('image/png');

      const screenshotRef = ref(storage, `screenshots/${user.uid}/map-screenshot-${Date.now()}.png`);
      await uploadString(screenshotRef, imgData, 'data_url');
      const downloadUrl = await getDownloadURL(screenshotRef);

      const userDoc = doc(db, "Car Crash Lawyer AI User Sign Up", user.uid);
      await updateDoc(userDoc, {
        map_screenshot_url: downloadUrl,
        map_screenshot_uploaded_at: new Date()
      });

      console.log("✅ Map screenshot captured and uploaded");
    } catch (err) {
      console.error("❌ Screenshot after map load failed:", err);
    }
  });
});




