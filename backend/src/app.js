const express = require("express");
const cors = require("cors");

const apiRouter = require("./api/routes");

const app = express();

app.use(cors());
app.use(express.json());

app.get("/health", (_req, res) => {
  res.status(200).json({ status: "ok" });
});

app.use("/api", apiRouter);

module.exports = app;
