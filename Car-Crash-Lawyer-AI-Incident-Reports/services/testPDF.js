const { generateUserPDF, generateIncidentPDF } = require('./services/pdfGenerator');

(async () => {
  try {
    console.log("⚙️ Starting test PDF generation...");

    // 🔹 Mock Sign-Up Data
    const signUpData = {
      user_full_name: "Ian Ring",
      email_text: "ring120768@gmail.com",  // use your real email
      vehicle_make: "Tesla",
      vehicle_model: "Model Y",
      insurance_company: "ABC Insurance Ltd",
      policy_number: "POL123456"
    };

    // 🔹 Mock Incident Data
    const incidentData = {
      incident_date: "2025-07-23",
      statement_of_events: "Rear-ended while stopped at lights.",
      license_plate_number: "AB12CDE",
      speed_limit: "30",
      direction_of_travel: "Northbound"
    };

    await generateUserPDF(signUpData);
    console.log("✅ User PDF test complete.");

    await generateIncidentPDF(signUpData, incidentData);
    console.log("✅ Incident PDF test complete.");

  } catch (err) {
    console.error("❌ Error during test:", err.message || err);
  }
})();

