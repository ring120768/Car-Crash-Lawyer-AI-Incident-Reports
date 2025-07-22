const { checkPermissions } = require("./services/permissions");

app.get("/test-access/:user_id", async (req, res) => {
  const result = await checkPermissions(req.params.user_id);
  res.json(result);
});
