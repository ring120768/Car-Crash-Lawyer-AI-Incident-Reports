const express = require("express");
const path = require("path");

const app = express();
app.use(express.static("public"));

app.get("/signup", (req, res) => {
  res.sendFile(path.join(__dirname, "public", "signup.html"));
});

app.get("/report", (req, res) => {
  res.sendFile(path.join(__dirname, "public", "report.html"));
});

const PORT = 5000; // Recommended port
app.listen(PORT, "0.0.0.0", () => {
  console.log(`✅ Server running on http://localhost:${PORT}`);
});