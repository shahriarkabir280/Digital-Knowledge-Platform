const { Router } = require("express");
const { validateRegisterPayload } = require("./registerValidator");
const { registerUser } = require("./registerService");

const router = Router();

router.get("/health", (_req, res) => {
  res.status(200).json({ module: "auth", status: "ready" });
});

router.post("/register", async (req, res, next) => {
  const validation = validateRegisterPayload(req.body);

  if (!validation.ok) {
    return res.status(validation.error.statusCode).json({ error: validation.error });
  }

  try {
    const user = await registerUser(validation.data);

    return res.status(201).json({
      message: "Registration successful",
      user,
    });
  } catch (error) {
    return next(error);
  }
});

module.exports = router;
