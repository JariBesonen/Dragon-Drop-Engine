import { Router } from "express";
import { getList, getThread, getUnreadCount, send } from "../controllers/messagesController";

const messagesRouter = Router();

messagesRouter.post("/", send);
messagesRouter.get("/unread-count", getUnreadCount);
messagesRouter.get("/", getList);
messagesRouter.get("/:userId", getThread);

export default messagesRouter;
