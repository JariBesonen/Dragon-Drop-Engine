import { Router } from "express";
import { create, explore, home, remove } from "../controllers/postsController";
import { uploadHivePostImage } from "../middleware/upload";

const postsRouter = Router();

postsRouter.get("/explore", explore);
postsRouter.get("/home", home);
postsRouter.delete("/:id", remove);
postsRouter.post("/", uploadHivePostImage, create);

export default postsRouter;
