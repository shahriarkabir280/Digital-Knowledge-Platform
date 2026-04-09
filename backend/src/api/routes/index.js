const { Router } = require("express");

const router = Router();

router.get("/status", (_req, res) => {
  res.status(200).json({ message: "API is ready" });
});

module.exports = router;
