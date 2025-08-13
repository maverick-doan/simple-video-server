import { Hono } from "hono";
import { uploadVideo, getVideo } from "../controllers/videoController";
import type { AppBindings } from "../config/app";
import { requireAuth } from "../middleware/authc";
import { requireRole } from "../middleware/authz";

export const videoRouter = new Hono<{ Variables: AppBindings }>();

videoRouter.get('/:id', requireAuth, requireRole(['user']), getVideo);
videoRouter.post('/upload', requireAuth, requireRole(['user']), uploadVideo);