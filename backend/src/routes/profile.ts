import { Router } from "express";
import { uploadProfileMedia } from "../middleware/upload";
import {
  approveFollowRequest,
  byUsername,
  denyFollowRequest,
  follow,
  getFollowRequests,
  getSavedPosts,
  me,
  settings,
  unfollow,
} from "../controllers/profileController";

const profileRouter = Router();

profileRouter.get("/me", me);
profileRouter.get("/me/saved", getSavedPosts);
profileRouter.patch("/settings", uploadProfileMedia, settings);
profileRouter.get("/follow-requests", getFollowRequests);
profileRouter.post("/follow-requests/:requestId/approve", approveFollowRequest);
profileRouter.post("/follow-requests/:requestId/deny", denyFollowRequest);
profileRouter.post("/:username/follow", follow);
profileRouter.delete("/:username/follow", unfollow);
profileRouter.get("/:username", byUsername);

export default profileRouter;
