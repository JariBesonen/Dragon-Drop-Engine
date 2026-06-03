import { Router } from "express";
import { me, settings } from "../controllers/profileController";

const profileRouter = Router();

profileRouter.get("/me", me);
profileRouter.patch("/settings", settings);

export default profileRouter;
