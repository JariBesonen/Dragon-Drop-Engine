import { Router } from "express";
import { create, getById, getMine } from "../controllers/hivesController";
import { uploadHiveBanner } from "../middleware/upload";

const hivesRouter = Router();

hivesRouter.get("/me", getMine);
hivesRouter.get("/:id", getById);
hivesRouter.post("/", uploadHiveBanner, create);

export default hivesRouter;
