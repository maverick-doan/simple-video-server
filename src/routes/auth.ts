import { Hono } from "hono";
import { 
    login, 
    me, 
    logout,
    cognitoLogin,
    cognitoMFAChallenge,
    getGoogleAuthUrl,
    googleCallback,
    setupMFA,
    verifyMFA,
} from "../controllers/authController";
import { requireAuth } from "../middleware/authc";
import type { AppBindings } from "../config/app";

export const authRouter = new Hono<{ Variables: AppBindings }>();

// Local auth
authRouter.post('/login', login);
authRouter.get('/me', requireAuth, me);
authRouter.post('/logout', requireAuth, logout);

// Cognito auth
authRouter.post('/cognito/login', cognitoLogin);
authRouter.post('/cognito/mfa-challenge', cognitoMFAChallenge);

// Federated (Google)
authRouter.get('/cognito/google/url', getGoogleAuthUrl);
authRouter.get('/cognito/google/callback', googleCallback);

// MFA setup for Cognito users
authRouter.post('/cognito/mfa/setup', requireAuth, setupMFA);
authRouter.post('/cognito/mfa/verify', requireAuth, verifyMFA);