const { Router } = require("express");

const router = Router();

router.get("/health", (_req, res) => {
  res.status(200).json({ module: "auth", status: "ready" });
});

module.exports = router;
