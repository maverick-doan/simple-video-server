import { Hono } from "hono";
import { uploadVideo, getVideo } from "../controllers/videoController";
import type { AppBindings } from "../config/app";
import { requireAuth } from "../middleware/authc";
import { requireRole } from "../middleware/authz";
import { requestTranscodeJob, getTranscodeJob } from "../controllers/transcodeJobController";

export const videoRouter = new Hono<{ Variables: AppBindings }>();

videoRouter.get('/:id', requireAuth, requireRole(['user']), getVideo);
videoRouter.post('/upload', requireAuth, requireRole(['user']), uploadVideo);
videoRouter.post('/transcode', requireAuth, requireRole(['user']), requestTranscodeJob);
videoRouter.get('/transcode/:id', requireAuth, requireRole(['user']), getTranscodeJob);