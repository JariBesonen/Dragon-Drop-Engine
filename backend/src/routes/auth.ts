import { Router } from "express";
import { login, logout, me, register } from "../controllers/authController";

const authRouter = Router();

authRouter.post("/register", register);
authRouter.post("/login", login);
authRouter.post("/logout", logout);
authRouter.get("/me", me);

export default authRouter;
