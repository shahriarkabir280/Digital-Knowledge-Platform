const { Router } = require("express");
const { validateRegisterPayload } = require("./registerValidator");
const { registerUser } = require("./registerService");
const { validateLoginPayload, validateRefreshPayload } = require("./loginValidator");
const { loginUser, refreshAccessToken } = require("./loginService");

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

router.post("/login", async (req, res, next) => {
  const validation = validateLoginPayload(req.body);

  if (!validation.ok) {
    return res.status(validation.error.statusCode).json({ error: validation.error });
  }

  try {
    const session = await loginUser(validation.data);

    return res.status(200).json({
      message: "Login successful",
      ...session,
    });
  } catch (error) {
    return next(error);
  }
});

router.post("/refresh", async (req, res, next) => {
  const validation = validateRefreshPayload(req.body);

  if (!validation.ok) {
    return res.status(validation.error.statusCode).json({ error: validation.error });
  }

  try {
    const session = await refreshAccessToken(validation.data.refreshToken);

    return res.status(200).json({
      message: "Token refreshed",
      ...session,
    });
  } catch (error) {
    return next(error);
  }
});

module.exports = router;
