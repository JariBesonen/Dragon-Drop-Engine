import "dotenv/config";
import cookieParser from "cookie-parser";
import cors from "cors";
import express, { NextFunction, Request, Response } from "express";
import session from "express-session";
import helmet from "helmet";
import path from "path";
import { initDatabase } from "./src/db/init";
import authRouter from "./src/routes/auth";
import hivesRouter from "./src/routes/hives";
import notificationsRouter from "./src/routes/notifications.js";
import postsRouter from "./src/routes/posts";
import profileRouter from "./src/routes/profile";
import searchRouter from "./src/routes/search";

const app = express();
const PORT = Number(process.env.PORT) || 5000;

// Middleware
app.use(
  helmet({
    crossOriginResourcePolicy: { policy: "cross-origin" },
  }),
);
app.use(
  cors({
    origin: process.env.FRONTEND_URL || "http://localhost:5173",
    credentials: true,
  }),
);
app.use(cookieParser());
app.use(express.json({ limit: "5mb" }));
app.use(express.urlencoded({ extended: true, limit: "5mb" }));
app.use("/uploads", express.static(path.resolve(process.cwd(), "uploads")));

// Session configuration
app.use(
  session({
    secret: process.env.SESSION_SECRET || "hive-dev-session-secret",
    resave: false,
    saveUninitialized: false,
    cookie: {
      secure: process.env.NODE_ENV === "production",
      httpOnly: true,
      maxAge: 24 * 60 * 60 * 1000, // 24 hours
    },
  }),
);

// Routes
app.get("/", (_req: Request, res: Response) => {
  res.json({ message: "Hive API is running." });
});

app.use("/api/auth", authRouter);
app.use("/api/hives", hivesRouter);
app.use("/api/notifications", notificationsRouter);
app.use("/api/posts", postsRouter);
app.use("/api/profile", profileRouter);
app.use("/api/search", searchRouter);

// Error handling middleware
app.use((err: Error, _req: Request, res: Response, _next: NextFunction) => {
  const typedError = err as Error & {
    status?: number;
    statusCode?: number;
    code?: string;
  };
  const status = typedError.statusCode || typedError.status || 500;

  if (status >= 500) {
    console.error(err.stack);
  }

  if (status === 413 || typedError.code === "LIMIT_FILE_SIZE") {
    return res.status(413).json({ message: "Uploaded banner is too large." });
  }

  return res.status(status).json({
    message: status >= 500 ? "Something went wrong!" : err.message,
  });
});

async function startServer(): Promise<void> {
  await initDatabase();
  app.listen(PORT, () => {
    console.log(`Hive backend is running on port ${PORT}`);
  });
}

startServer().catch((error: Error) => {
  console.error("Failed to start backend", error);
  process.exit(1);
});
