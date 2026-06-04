import { Router } from "express";
import {
  create,
  dislike,
  explore,
  home,
  like,
  remove,
} from "../controllers/postsController";
import { uploadHivePostImage } from "../middleware/upload";

const postsRouter = Router();

postsRouter.get("/explore", explore);
postsRouter.get("/home", home);
postsRouter.post("/:id/like", like);
postsRouter.post("/:id/dislike", dislike);
postsRouter.delete("/:id", remove);
postsRouter.post("/", uploadHivePostImage, create);

export default postsRouter;
