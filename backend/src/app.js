const express = require("express");
const cors = require("cors");
const swaggerUi = require("swagger-ui-express");

const apiRouter = require("./api/routes");
const authRouter = require("./modules/auth");
const openapiSpec = require("./api/docs/openapi");
const requestLogger = require("./api/middlewares/requestLogger");
const notFound = require("./api/middlewares/notFound");
const errorHandler = require("./api/middlewares/errorHandler");

const app = express();

app.use(cors());
app.use(express.json());
app.use(requestLogger);

app.use("/api-docs", swaggerUi.serve, swaggerUi.setup(openapiSpec));
app.get("/openapi.json", (_req, res) => res.json(openapiSpec));

app.use("/api", apiRouter);
app.use("/auth", authRouter);
app.use(notFound);
app.use(errorHandler);

module.exports = app;
