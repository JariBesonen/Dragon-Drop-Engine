import { Router } from "express";
import {
  addComment,
  comments,
  create,
  dislikeComment,
  dislike,
  explore,
  home,
  like,
  likeComment,
  removeComment,
  remove,
} from "../controllers/postsController";
import { uploadHivePostImage } from "../middleware/upload";

const postsRouter = Router();

postsRouter.get("/explore", explore);
postsRouter.get("/home", home);
postsRouter.get("/:id/comments", comments);
postsRouter.post("/:id/comments", addComment);
postsRouter.post("/:id/comments/:commentId/like", likeComment);
postsRouter.post("/:id/comments/:commentId/dislike", dislikeComment);
postsRouter.delete("/:id/comments/:commentId", removeComment);
postsRouter.post("/:id/like", like);
postsRouter.post("/:id/dislike", dislike);
postsRouter.delete("/:id", remove);
postsRouter.post("/", uploadHivePostImage, create);

export default postsRouter;
