import { Router } from "express";
import { getList, getThread, send } from "../controllers/messagesController";

const messagesRouter = Router();

messagesRouter.post("/", send);
messagesRouter.get("/", getList);
messagesRouter.get("/:userId", getThread);

export default messagesRouter;
