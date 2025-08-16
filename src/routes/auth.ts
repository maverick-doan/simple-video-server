import { Hono } from "hono";
import { login, me, logout } from "../controllers/authController";
import { requireAuth } from "../middleware/authc";
import type { AppBindings } from "../config/app";

export const authRouter = new Hono<{ Variables: AppBindings }>();

authRouter.post('/login', login);
authRouter.get('/me', requireAuth, me);
authRouter.post('/logout', requireAuth, logout);