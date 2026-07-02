import { Router } from "express";
import {
  approveFollowRequest,
  create,
  denyFollowRequest,
  getFollowRequests,
  getById,
  getMine,
  join,
  updatePrivacy,
} from "../controllers/hivesController";
import {
  create as createPost,
  hivePosts,
} from "../controllers/postsController";
import { uploadHiveBanner } from "../middleware/upload";
import { uploadHivePostImage } from "../middleware/upload";

const hivesRouter = Router();

hivesRouter.get("/me", getMine);
hivesRouter.post("/:id/join", join);
hivesRouter.patch("/:id/privacy", updatePrivacy);
hivesRouter.get("/:id/follow-requests", getFollowRequests);
hivesRouter.post("/:id/follow-requests/:requestId/approve", approveFollowRequest);
hivesRouter.post("/:id/follow-requests/:requestId/deny", denyFollowRequest);
hivesRouter.get("/:id/posts", hivePosts);
hivesRouter.post("/:id/posts", uploadHivePostImage, createPost);
hivesRouter.get("/:id", getById);
hivesRouter.post("/", uploadHiveBanner, create);

export default hivesRouter;
