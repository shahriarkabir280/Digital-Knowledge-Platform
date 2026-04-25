const express = require("express");
const cors = require("cors");
const path = require("path");

const apiRouter = require("./api/routes");
const authRouter = require("./modules/auth");
const requestLogger = require("./api/middlewares/requestLogger");
const notFound = require("./api/middlewares/notFound");
const errorHandler = require("./api/middlewares/errorHandler");
const uploadConfig = require("./config/upload.config");

const app = express();

app.use(cors());
app.use(express.json());
app.use(requestLogger);

app.use("/uploads", express.static(path.resolve(uploadConfig.UPLOAD_BASE_DIR)));

app.use("/api", apiRouter);
app.use("/auth", authRouter);
app.use(notFound);
app.use(errorHandler);

module.exports = app;
