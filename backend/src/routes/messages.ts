import { Router } from "express";
import {
  getList,
  getThread,
  getUnreadCount,
  send,
} from "../controllers/messagesController";
import { createRateLimitMiddleware } from "../middleware/rateLimit";

const messagesRouter = Router();
const messageSendRateLimit = createRateLimitMiddleware({
  windowMs: 60 * 1000,
  max: 20,
  message: "Too many message sends. Please slow down.",
});

const messageReadRateLimit = createRateLimitMiddleware({
  windowMs: 60 * 1000,
  max: 120,
  message: "Too many message requests. Please try again soon.",
});

messagesRouter.post("/", messageSendRateLimit, send);
messagesRouter.get("/unread-count", messageReadRateLimit, getUnreadCount);
messagesRouter.get("/", messageReadRateLimit, getList);
messagesRouter.get("/:userId", messageReadRateLimit, getThread);

export default messagesRouter;
