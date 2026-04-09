const express = require("express");
const cors = require("cors");

const apiRouter = require("./api/routes");
const requestLogger = require("./api/middlewares/requestLogger");
const notFound = require("./api/middlewares/notFound");
const errorHandler = require("./api/middlewares/errorHandler");

const app = express();

app.use(cors());
app.use(express.json());
app.use(requestLogger);

app.use("/api", apiRouter);
app.use(notFound);
app.use(errorHandler);

module.exports = app;
