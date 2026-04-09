require("dotenv").config();

const app = require("./app");

const PORT = process.env.BACKEND_PORT || 3000;

app.listen(PORT, () => {
  // Keep startup log simple and explicit for local development.
  console.log(`Backend server running on http://localhost:${PORT}`);
});
