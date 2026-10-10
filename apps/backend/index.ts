import dotenv from "dotenv";

dotenv.config();

import express, { Application } from "express";
import helmet from "helmet";
import rateLimit from "express-rate-limit";
import cors from "cors";
import mongoSanitize from "express-mongo-sanitize";
import { connectDB } from "./config/database.js";
import { errorHandler } from "./middlewares/errorHandler.js";
import { notFound } from "./middlewares/notFound.js";
import { requestLogger, responseLogger } from "./middlewares/requestLogger.js";
import {
  performanceMonitor,
  getSystemHealthMetrics,
} from "./middlewares/performanceMonitor.js";
import { checkDatabaseHealth } from "./config/database.js";
import { logger } from "./services/logger.service.js";
import swaggerUi from "swagger-ui-express";
import { swaggerSpec } from "./config/swagger.js";
import compression from "compression";
import authRoutes from "./routes/auth.routes.js";
import studentRoutes from "./routes/student.routes.js";
import courseRoutes from "./routes/course.routes.js";
import contactRoutes from "./routes/contact.routes.js";
import adminRoutes from "./routes/admin.routes.js";

const app: Application = express();

connectDB();

app.set("trust proxy", 1);

app.use(
  helmet({
    contentSecurityPolicy: {
      directives: {
        defaultSrc: ["'self'"],
        styleSrc: ["'self'", "'unsafe-inline'"],
        scriptSrc: ["'self'"],
        imgSrc: ["'self'", "data:", "https:"],
      },
    },
    crossOriginEmbedderPolicy: false,
  }),
);

app.use(
  cors({
    origin: true,
    credentials: true,
  }),
);

app.use(express.json({ limit: "10mb" }));
app.use(express.urlencoded({ extended: true, limit: "10mb" }));

app.use(compression() as unknown as express.RequestHandler);

app.use(mongoSanitize() as unknown as express.RequestHandler);

app.use(
  requestLogger({
    includeHeaders: process.env.LOG_REQUEST_HEADERS === "true",
    includeBody: process.env.LOG_REQUEST_BODY === "true",
    excludePaths: ["/health", "/favicon.ico"],
  }),
);

app.use(
  responseLogger({
    includeBody: process.env.LOG_RESPONSE_BODY === "true",
    excludePaths: ["/health", "/favicon.ico"],
  }),
);

app.use(
  performanceMonitor({
    enabled: process.env.PERFORMANCE_MONITORING_ENABLED === "true",
    samplingRate: parseFloat(process.env.PERFORMANCE_SAMPLING_RATE || "0.1"),
    enableDatabaseLogging: process.env.PERFORMANCE_DB_LOGGING === "true",
  }),
);

const limiter = rateLimit({
  windowMs: parseInt(process.env.RATE_LIMIT_WINDOW_MS || "900000"),
  max:
    process.env.NODE_ENV === "production"
      ? parseInt(process.env.RATE_LIMIT_MAX_REQUESTS || "100")
      : parseInt(process.env.RATE_LIMIT_MAX_REQUESTS_DEV || "1000"),
  message: "Too many requests from this IP, please try again later.",
  standardHeaders: true,
  legacyHeaders: false,
});

app.use("/api/", limiter);

app.use(`/api/v1/auth`, authRoutes);
app.use(`/api/v1/student`, studentRoutes);
app.use(`/api/v1/courses`, courseRoutes);
app.use(`/api/v1/contact`, contactRoutes);
app.use(`/api/v1/admin`, adminRoutes);

app.get("/health", (req, res) => {
  try {
    const timestamp = new Date().toISOString();

    const healthResponse = {
      status: "healthy",
      message: "Server is running",
      timestamp,
      uptime: process.uptime(),
      version: process.version,
      logging: {
        status: "healthy",
        level: logger.getLevel(),
      },
    };

    res.status(200).json(healthResponse);
    logger.info("Health check completed successfully", "system");
  } catch (error) {
    logger.error("Health check failed", "system", {
      error: (error as Error).message,
    });

    res.status(503).json({
      status: "unhealthy",
      message: "Health check failed",
      timestamp: new Date().toISOString(),
      error:
        process.env.NODE_ENV === "development"
          ? (error as Error).message
          : "Internal error",
    });
  }
});

app.use(notFound);

app.use(errorHandler);

const PORT = process.env.PORT || 5000;

app.listen(PORT, () => {
  console.log(`Server running in ${process.env.NODE_ENV} mode on port ${PORT}`);
  console.log(
    `API Documentation available at http://localhost:${PORT}/api/v1/docs`,
  );
});

export default app;
