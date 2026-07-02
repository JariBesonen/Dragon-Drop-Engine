import { Router } from "express";
import { uploadProfileMedia } from "../middleware/upload";
import {
  byUsername,
  follow,
  me,
  settings,
  unfollow,
} from "../controllers/profileController";

const profileRouter = Router();

profileRouter.get("/me", me);
profileRouter.patch("/settings", uploadProfileMedia, settings);
profileRouter.post("/:username/follow", follow);
profileRouter.delete("/:username/follow", unfollow);
profileRouter.get("/:username", byUsername);

export default profileRouter;
