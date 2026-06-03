import { Router } from "express";
import { create, explore, home } from "../controllers/postsController";

const postsRouter = Router();

postsRouter.get("/explore", explore);
postsRouter.get("/home", home);
postsRouter.post("/", create);

export default postsRouter;
