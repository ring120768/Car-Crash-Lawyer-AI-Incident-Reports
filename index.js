const express = require("express");
const app = express();
const path = require("path");
const PORT = 3000;

// Serve everything in the "public" directory
app.use(express.static("public"));

// Fallback route to serve index.html directly
app.get("/", (req, res) => {
  res.sendFile(path.join(__dirname, "public/index.html"));
});

app.listen(PORT, () => {
  console.log(`Server running at http://localhost:${PORT}`);
});



