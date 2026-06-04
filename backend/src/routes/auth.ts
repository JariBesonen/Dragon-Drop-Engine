import { Router } from "express";
import {
  deleteAccount,
  login,
  logout,
  me,
  register,
} from "../controllers/authController";

const authRouter = Router();

authRouter.post("/register", register);
authRouter.post("/login", login);
authRouter.post("/logout", logout);
authRouter.get("/me", me);
authRouter.delete("/account", deleteAccount);

export default authRouter;
