import { Hono } from "hono";
import { uploadVideo, getVideo, listAllVideos } from "../controllers/videoController";
import type { AppBindings } from "../config/app";
import { requireAuth } from "../middleware/authc";
import { requireRole } from "../middleware/authz";
import { requestTranscodeJob, getTranscodeJob } from "../controllers/transcodeJobController";

export const videoRouter = new Hono<{ Variables: AppBindings }>();

videoRouter.post('/upload', requireAuth, requireRole(['user', 'admin']), uploadVideo);
videoRouter.post('/transcode', requireAuth, requireRole(['user', 'admin']), requestTranscodeJob);
videoRouter.get('/transcode/:id', requireAuth, requireRole(['user', 'admin']), getTranscodeJob);
videoRouter.get('/list', requireAuth, requireRole(['admin']), listAllVideos);
videoRouter.get('/:id', requireAuth, requireRole(['user', 'admin']), getVideo);