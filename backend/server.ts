import "dotenv/config";
import cookieParser from "cookie-parser";
import cors from "cors";
import express, { NextFunction, Request, Response } from "express";
import session from "express-session";
import helmet from "helmet";
import { initDatabase } from "./src/db/init";
import authRouter from "./src/routes/auth";
import postsRouter from "./src/routes/posts";
import profileRouter from "./src/routes/profile";

const app = express();
const PORT = Number(process.env.PORT) || 5000;

// Middleware
app.use(helmet());
app.use(
  cors({
    origin: process.env.FRONTEND_URL || "http://localhost:5173",
    credentials: true,
  }),
);
app.use(cookieParser());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

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
app.use("/api/posts", postsRouter);
app.use("/api/profile", profileRouter);

// Error handling middleware
app.use((err: Error, _req: Request, res: Response, _next: NextFunction) => {
  console.error(err.stack);
  res.status(500).json({ message: "Something went wrong!" });
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
