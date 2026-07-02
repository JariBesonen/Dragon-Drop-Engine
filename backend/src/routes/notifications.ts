import { Router } from "express";
import { list, markRead } from "../controllers/notificationsController.js";

const notificationsRouter = Router();

notificationsRouter.get("/", list);
notificationsRouter.post("/read", markRead);

export default notificationsRouter;
