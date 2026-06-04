import { Router } from "express";
import { create, getById, getMine } from "../controllers/hivesController";
import { create as createPost, hivePosts } from "../controllers/postsController";
import { uploadHiveBanner } from "../middleware/upload";
import { uploadHivePostImage } from "../middleware/upload";

const hivesRouter = Router();

hivesRouter.get("/me", getMine);
hivesRouter.get("/:id/posts", hivePosts);
hivesRouter.post("/:id/posts", uploadHivePostImage, createPost);
hivesRouter.get("/:id", getById);
hivesRouter.post("/", uploadHiveBanner, create);

export default hivesRouter;
