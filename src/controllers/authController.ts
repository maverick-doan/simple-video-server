import type { Context } from "hono";
import { getUserByUsernameOrEmail, getUserByEmail, getUserByUsername } from "../models/userModel";
import * as bcrypt from 'bcrypt';
import { signJwt } from "../utils/jwt";
import type { AppBindings } from "../config/app";
import type { LoginRequest } from "../types/user";
import { redisService } from "../cache/redis";
import { CognitoService } from "../services/cognito";
import { getUserByCognitoSub } from "../models/userModel";
import { createUser } from "../models/userModel";

export async function cognitoRegister(c: Context<{ Variables: AppBindings }>) {
	const body = await c.req.json();
	const { username, email, password } = body || {};
	if (!username || !email || !password) return c.json({ error: 'username, email, password required' }, 400);
    const userByEmail = await getUserByEmail(email);
    if (userByEmail) return c.json({ error: 'Email already exists' }, 400);
    const userByUsername = await getUserByUsername(username);
    if (userByUsername) return c.json({ error: 'Username already exists' }, 400);
	await CognitoService.signUp(username, password, email);
	return c.json({ message: 'Registration submitted. Check your email for the confirmation code.' }, 200);
}

export async function cognitoConfirm(c: Context<{ Variables: AppBindings }>) {
	const body = await c.req.json();
	const { username, code } = body || {};
	if (!username || !code) return c.json({ error: 'username and code required' }, 400);

	await CognitoService.confirmSignUp(username, code);
	return c.json({ message: 'Email confirmed. You can now login.' }, 200);
}

function isValidLoginRequest(body: unknown): body is LoginRequest {
    if (!body || typeof body !== 'object') return false;
    const { username, password } = body as any;
    return (
        typeof username === 'string' &&
        typeof password === 'string' &&
        username.length > 0 &&
        password.length > 0
    );
}

// Local login handler
export async function login(c: Context<{ Variables: AppBindings }>) {
    try {
        const body = await c.req.json();
        if (!isValidLoginRequest(body)) {
            return c.json({ error: 'Invalid request body' }, 400);
        }

        const username = body.username.trim();
        const password = body.password.trim();
        
        const user = await getUserByUsernameOrEmail(username);
        if (!user) {
            return c.json({ error: 'Invalid credentials' }, 401);
        }

        const pwdMatched = await bcrypt.compare(password, user.password_hash);

        if (!pwdMatched) {
            return c.json({ error: 'Invalid credentials' }, 401);
        }

        const token = signJwt({ 
            sub: user.id, 
            username: user.username, 
            email: user.email, 
            role: user.role,
            authProvider: user.auth_provider
          });

        return c.json({ token }, 200);

    } catch (err) {
        console.error('Login error:', err);
        if (err instanceof Error) {
            return c.json({
                error: "Bad request"
            }, 400);
        }
        return c.json({
            error: "Internal server error"
        }, 500);
    }
}

export async function cognitoLogin(c: Context<{ Variables: AppBindings }>) {
    try {
        const body = await c.req.json();
        if (!isValidLoginRequest(body)) {
            return c.json({ error: 'Invalid request body' }, 400);
        }

        const username = body.username.trim();
        const password = body.password.trim();
        
        const authResult = await CognitoService.authenticateUser(username, password);
        
        if (authResult.ChallengeName === 'SOFTWARE_TOKEN_MFA') {
            return c.json({
                challenge: 'MFA_REQUIRED',
                session: authResult.Session,
                message: 'MFA code required'
            }, 200);
        }
        
        if (authResult.AuthenticationResult?.AccessToken) {
            const userInfo = await CognitoService.getUser(username) as any;
            
            const userAttributes = userInfo.UserAttributes || [];
            const email = userAttributes.find((attr: any) => attr.Name === 'email')?.Value || '';
            const cognitoUsername = userAttributes.find((attr: any) => attr.Name === 'preferred_username')?.Value || 
                                  userAttributes.find((attr: any) => attr.Name === 'sub')?.Value || '';
            const groups = userAttributes.find((attr: any) => attr.Name === 'cognito:groups')?.Value?.split(',') || [];
            const cognitoSub = userAttributes.find((attr: any) => attr.Name === 'sub')?.Value || '';

            let user = await getUserByCognitoSub(cognitoSub);

            if (!user) {
                user = await createUser({
                    username: cognitoUsername,
                    email: email,
                    authProvider: 'cognito',
                    cognitoSub: cognitoSub,
                    role: groups.includes('Admin') ? 'admin' : 'user'
                });
            }
            
            return c.json({
                accessToken: authResult.AuthenticationResult.AccessToken,
                idToken: authResult.AuthenticationResult.IdToken,
                refreshToken: authResult.AuthenticationResult.RefreshToken,
                user: {
                    id: user.id,
                    username: user.username,
                    email: user.email,
                    role: user.role,
                    authProvider: 'cognito'
                }
            }, 200);
        }
        
        return c.json({ error: 'Authentication failed' }, 401);
        
    } catch (err) {
        console.error('Cognito login error:', err);
        return c.json({ error: 'Authentication failed' }, 401);
    }
}

export async function cognitoMFAChallenge(c: Context<{ Variables: AppBindings }>) {
    try {
        const body = await c.req.json();
        const { session, mfaCode, username } = body;
        
        if (!session || !mfaCode || !username) {
            return c.json({ error: 'Missing required fields' }, 400);
        }
        
        const challengeResult = await CognitoService.respondToMFAChallenge(session, mfaCode, username);
        
        if (challengeResult.AuthenticationResult?.AccessToken) {
            const userInfo: any = await CognitoService.getUserInfo(challengeResult.AuthenticationResult.AccessToken);
            
            const userAttributes = userInfo.UserAttributes || [];
            const email = userAttributes.find((attr: any) => attr.Name === 'email')?.Value || '';
            const cognitoUsername = userAttributes.find((attr: any) => attr.Name === 'preferred_username')?.Value || 
                                  userAttributes.find((attr: any) => attr.Name === 'sub')?.Value || '';
            const groups = userAttributes.find((attr: any) => attr.Name === 'cognito:groups')?.Value?.split(',') || [];

            let user = await getUserByCognitoSub(userInfo.Username);

            if (!user) {
                user = await createUser({
                    username: cognitoUsername,
                    email: email,
                    authProvider: 'cognito',
                    cognitoSub: userInfo.Username,
                    role: groups.includes('Admin') ? 'admin' : 'user'
                });
            }
            
            return c.json({
                accessToken: challengeResult.AuthenticationResult.AccessToken,
                idToken: challengeResult.AuthenticationResult.IdToken,
                refreshToken: challengeResult.AuthenticationResult.RefreshToken,
                user: {
                    id: user.id,
                    username: user.username,
                    email: user.email,
                    role: user.role,
                    authProvider: 'cognito'
                }
            }, 200);
        }
        
        return c.json({ error: 'MFA verification failed' }, 401);
        
    } catch (err) {
        console.error('MFA challenge error:', err);
        return c.json({ error: 'MFA verification failed' }, 401);
    }
}

// MFA setup handler
export async function setupMFA(c: Context<{ Variables: AppBindings }>) {
    try {
        const user = c.get('user');
        if (!user || user.authProvider !== 'cognito') {
            return c.json({ error: 'Cognito user required' }, 400);
        }
        
        const body = await c.req.json();
        const { accessToken } = body;
        
        if (!accessToken) {
            return c.json({ error: 'Access token required' }, 400);
        }
        
        const mfaSetup = await CognitoService.setupMFA(accessToken);
        
        return c.json({
            secretCode: mfaSetup.SecretCode,
            qrCodeUrl: `otpauth://totp/VideoApp:${user.username}?secret=${mfaSetup.SecretCode}&issuer=VideoApp`
        }, 200);
        
    } catch (err) {
        console.error('MFA setup error:', err);
        return c.json({ error: 'MFA setup failed' }, 500);
    }
}

// Google OAuth callback handler
export async function googleCallback(c: Context<{ Variables: AppBindings }>) {
    try {
        const code = c.req.query('code');
        const state = c.req.query('state');
        
        if (!code) {
            return c.json({ error: 'Authorization code not provided' }, 400);
        }
        
        const tokenResponse = await CognitoService.exchangeCodeForTokens(code) as any;
        
        if (tokenResponse.access_token) {
            const userInfo = await CognitoService.getUserInfo(tokenResponse.access_token) as any;
            
            let user = await getUserByCognitoSub(userInfo.sub);
            
            if (!user) {
                user = await createUser({
                    username: userInfo['cognito:username'] || userInfo.username || userInfo.email,
                    email: userInfo.email,
                    authProvider: 'cognito',
                    cognitoSub: userInfo.sub,
                    role: userInfo['cognito:groups']?.includes('Admin') ? 'admin' : 'user'
                });
            }
            return c.json({
                accessToken: tokenResponse.access_token,
                idToken: tokenResponse.id_token,
                refreshToken: tokenResponse.refresh_token,
                user: {
                    id: user.id,
                    username: user.username,
                    email: user.email,
                    role: user.role,
                    authProvider: 'cognito'
                }
            }, 200);
        }
        
        return c.json({ error: 'Google authentication failed' }, 401);
        
    } catch (err) {
        console.error('Google callback error:', err);
        return c.json({ error: 'Google authentication failed' }, 401);
    }
}


// MFA verification handler
export async function verifyMFA(c: Context<{ Variables: AppBindings }>) {
    try {
        const user = c.get('user');
        if (!user || user.authProvider !== 'cognito') {
            return c.json({ error: 'Cognito user required' }, 400);
        }
        
        const body = await c.req.json();
        const { accessToken, userCode } = body;
        
        if (!accessToken || !userCode) {
            return c.json({ error: 'Access token and user code required' }, 400);
        }
        
        const mfaVerify = await CognitoService.verifyMFA(accessToken, userCode);
        
        return c.json({
            status: mfaVerify.Status,
            message: 'MFA setup completed successfully'
        }, 200);
        
    } catch (err) {
        console.error('MFA verification error:', err);
        return c.json({ error: 'MFA verification failed' }, 500);
    }
}

// Get Google OAuth URL
export async function getGoogleAuthUrl(c: Context<{ Variables: AppBindings }>) {
    try {
        const authUrl = CognitoService.getGoogleAuthUrl();
        return c.json({ authUrl }, 200);
    } catch (err) {
        console.error('Google auth URL error:', err);
        return c.json({ error: 'Failed to generate auth URL' }, 500);
    }
}

// Me endpoint handler: Get current authenticated user information
export async function me(c: Context<{ Variables: AppBindings }>) {
    try {
        const user = c.get('user');
        if (!user) {
            return c.json({ error: 'Unauthorized' }, 401);
        }
        return c.json({ user });
    } catch (err) {
        console.error('Me endpoint error:', err);
        return c.json({ error: 'Internal server error' }, 500);
    }
}

// Logout endpoint handler: Logout current authenticated user
export async function logout(c: Context<{ Variables: AppBindings }>) {
    try {
        const user = c.get('user');
        if (!user) {
            return c.json({
                errror: "Unauthorized"
            }, 401);
        }

        const token = c.req.header('Authorization')?.split(' ')[1];
        if (!token) {
            return c.json({
                error: "Unauthorized"
            }, 401);
        }

        const isBlacklisted = await redisService.isTokenBlacklisted(token);
        if (isBlacklisted) {
            return c.json({
                error: "Unauthorized"
            }, 401);
        }

        await redisService.blacklistToken(token, 3600);
        return c.json({
            message: "Logged out successfully"
        }, 200);
    } catch (err) {
        console.error('Logout error:', err);
        return c.json({
            error: "Internal server error"
        }, 500);
    }
}