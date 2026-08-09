import { Router } from "express";
import {
  addComment,
  comments,
  create,
  dislikeComment,
  dislike,
  explore,
  home,
  getById,
  like,
  likeComment,
  removeComment,
  remove,
  save,
  unsave,
} from "../controllers/postsController";
import { uploadHivePostImage } from "../middleware/upload";
import { createRateLimitMiddleware } from "../middleware/rateLimit";

const postsRouter = Router();
const postWriteRateLimit = createRateLimitMiddleware({
  windowMs: 60 * 1000,
  max: 80,
  message: "Too many post actions. Please try again shortly.",
});

const postCreateRateLimit = createRateLimitMiddleware({
  windowMs: 60 * 1000,
  max: 20,
  message: "Too many post creations. Please wait a moment.",
});

postsRouter.get("/explore", explore);
postsRouter.get("/home", home);
postsRouter.get("/:id", getById);
postsRouter.get("/:id/comments", comments);
postsRouter.post("/:id/comments", postWriteRateLimit, addComment);
postsRouter.post(
  "/:id/comments/:commentId/like",
  postWriteRateLimit,
  likeComment,
);
postsRouter.post(
  "/:id/comments/:commentId/dislike",
  postWriteRateLimit,
  dislikeComment,
);
postsRouter.delete(
  "/:id/comments/:commentId",
  postWriteRateLimit,
  removeComment,
);
postsRouter.post("/:id/like", postWriteRateLimit, like);
postsRouter.post("/:id/dislike", postWriteRateLimit, dislike);
postsRouter.post("/:id/save", postWriteRateLimit, save);
postsRouter.delete("/:id/save", postWriteRateLimit, unsave);
postsRouter.delete("/:id", postWriteRateLimit, remove);
postsRouter.post("/", postCreateRateLimit, uploadHivePostImage, create);

export default postsRouter;
