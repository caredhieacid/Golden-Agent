import { Router, Request, Response } from 'express';
import { v4 as uuidv4 } from 'uuid';
import { randomInt } from 'crypto';
import { prisma } from '../db.js';
import { hashPassword, comparePassword, validatePasswordStrength, validateEmail, validateUsername } from '../utils/password.js';
import { generateTokenPair, verifyToken, getTokenExpiration } from '../utils/jwt.js';
import { generateCaptcha, verifyCaptcha } from '../utils/captcha.js';
import { sendVerificationEmail, sendPasswordResetEmail, sendVerificationCodeEmail, isEmailConfigured } from '../utils/email.js';
import { authMiddleware, createAuthRateLimiter } from '../middleware/auth.js';

const router = Router();
const authLimiter = createAuthRateLimiter();

// Email verification code store (in-memory, for production use Redis)
const emailCodeStore = new Map<string, { code: string; expiresAt: number; type: string }>();

// Clean up expired codes
setInterval(() => {
  const now = Date.now();
  for (const [key, data] of emailCodeStore.entries()) {
    if (data.expiresAt < now) {
      emailCodeStore.delete(key);
    }
  }
}, 60000);

/**
 * GET /api/auth/captcha
 * Get a new captcha image
 */
router.get('/captcha', (req: Request, res: Response) => {
  const captcha = generateCaptcha();
  res.json({
    captchaId: captcha.captchaId,
    svg: captcha.svg,
  });
});

/**
 * POST /api/auth/send-email-code
 * Send verification code to email
 */
router.post('/send-email-code', authLimiter, async (req: Request, res: Response) => {
  try {
    const { email, type } = req.body;

    if (!email || !type) {
      return res.status(400).json({ error: 'Email and type are required' });
    }

    if (!['register', 'reset', 'change'].includes(type)) {
      return res.status(400).json({ error: 'Invalid type' });
    }

    if (!validateEmail(email)) {
      return res.status(400).json({ error: 'Invalid email format' });
    }

    // For registration, check if email already exists
    if (type === 'register') {
      const existing = await prisma.user.findUnique({ where: { email } });
      if (existing) {
        return res.status(409).json({ error: '该邮箱已被注册' });
      }
    }

    // For reset, check if email exists
    if (type === 'reset') {
      const existing = await prisma.user.findUnique({ where: { email } });
      if (!existing) {
        // Don't reveal if email exists
        return res.json({ message: '如果邮箱存在，验证码已发送' });
      }
    }

    // Generate 6-digit code
    const code = randomInt(100000, 999999).toString();
    const expiresAt = Date.now() + 5 * 60 * 1000; // 5 minutes

    // Store code
    emailCodeStore.set(email, { code, expiresAt, type });

    // Send email
    if (isEmailConfigured()) {
      const result = await sendVerificationCodeEmail(email, code, type);
      if (!result.success) {
        return res.status(500).json({ error: result.error || '发送失败' });
      }
    } else {
      console.log(`[Dev] 验证码 for ${email}: ${code}`);
    }

    res.json({ message: '验证码已发送，请查收邮件' });
  } catch (error) {
    console.error('Send email code error:', error);
    res.status(500).json({ error: '发送失败' });
  }
});

/**
 * Verify email code helper
 */
function verifyEmailCode(email: string, code: string, type: string): boolean {
  const stored = emailCodeStore.get(email);
  if (!stored) return false;
  if (stored.expiresAt < Date.now()) {
    emailCodeStore.delete(email);
    return false;
  }
  if (stored.code !== code || stored.type !== type) return false;
  emailCodeStore.delete(email); // One-time use
  return true;
}

/**
 * POST /api/auth/register
 * Register a new user (requires email verification code)
 */
router.post('/register', authLimiter, async (req: Request, res: Response) => {
  try {
    const { email, username, password, emailCode } = req.body;

    // Validate required fields
    if (!email || !username || !password || !emailCode) {
      return res.status(400).json({ error: '邮箱、用户名、密码和验证码都是必填项' });
    }

    // Verify email code
    if (!verifyEmailCode(email, emailCode, 'register')) {
      return res.status(400).json({ error: '验证码无效或已过期' });
    }

    // Validate email format
    if (!validateEmail(email)) {
      return res.status(400).json({ error: '邮箱格式不正确' });
    }

    // Validate username
    const usernameValidation = validateUsername(username);
    if (!usernameValidation.isValid) {
      return res.status(400).json({ error: usernameValidation.error });
    }

    // Validate password strength
    const passwordValidation = validatePasswordStrength(password);
    if (!passwordValidation.isValid) {
      return res.status(400).json({ errors: passwordValidation.errors });
    }

    // Check if email already exists (double check)
    const existingEmail = await prisma.user.findUnique({ where: { email } });
    if (existingEmail) {
      return res.status(409).json({ error: '该邮箱已被注册' });
    }

    // Check if username already exists
    const existingUsername = await prisma.user.findUnique({ where: { username } });
    if (existingUsername) {
      return res.status(409).json({ error: '用户名已被使用' });
    }

    // Hash password
    const hashedPassword = await hashPassword(password);

    // Create user (email already verified via code)
    const user = await prisma.user.create({
      data: {
        email,
        username,
        password: hashedPassword,
        emailVerified: true, // Already verified via code
      },
    });

    res.status(201).json({
      message: '注册成功！请登录',
      userId: user.id,
    });
  } catch (error) {
    console.error('Registration error:', error);
    res.status(500).json({ error: '注册失败，请稍后重试' });
  }
});

/**
 * POST /api/auth/login
 * Login with email/username and password
 */
router.post('/login', authLimiter, async (req: Request, res: Response) => {
  try {
    const { login, password, captchaId, captchaAnswer } = req.body;

    // Validate required fields
    if (!login || !password) {
      return res.status(400).json({ error: 'Login and password are required' });
    }

    // Find user by email or username
    const user = await prisma.user.findFirst({
      where: {
        OR: [{ email: login }, { username: login }],
      },
    });

    // 管理员跳过验证码检查
    const isAdmin = user && user.role === 'ADMIN';

    // Validate captcha (普通用户需要验证码)
    if (!isAdmin && (!captchaId || !captchaAnswer || !verifyCaptcha(captchaId, captchaAnswer))) {
      return res.status(400).json({ error: 'Invalid or expired captcha' });
    }

    if (!user) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    if (!user) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    // Check if account is active
    if (user.status !== 'ACTIVE') {
      return res.status(403).json({ error: 'Account is inactive or banned' });
    }

    // Verify password
    const isValidPassword = await comparePassword(password, user.password);
    if (!isValidPassword) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    // Generate tokens
    const tokens = generateTokenPair({
      userId: user.id,
      email: user.email,
      role: user.role,
    });

    // Create session
    const expiresAt = new Date(Date.now() + getTokenExpiration() * 1000);
    await prisma.session.create({
      data: {
        userId: user.id,
        token: tokens.accessToken,
        userAgent: req.headers['user-agent'],
        ip: req.ip || req.connection.remoteAddress,
        expiresAt,
      },
    });

    // Update last login
    await prisma.user.update({
      where: { id: user.id },
      data: { lastLoginAt: new Date() },
    });

    res.json({
      message: 'Login successful',
      user: {
        id: user.id,
        email: user.email,
        username: user.username,
        nickname: user.nickname,
        avatar: user.avatar,
        role: user.role,
        emailVerified: user.emailVerified,
      },
      accessToken: tokens.accessToken,
      refreshToken: tokens.refreshToken,
    });
  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({ error: 'Login failed' });
  }
});

/**
 * POST /api/auth/logout
 * Logout current session
 */
router.post('/logout', authMiddleware, async (req: Request, res: Response) => {
  try {
    const authHeader = req.headers.authorization;
    const token = authHeader?.substring(7);

    if (token) {
      // Delete session
      await prisma.session.deleteMany({
        where: { token },
      });
    }

    res.json({ message: 'Logged out successfully' });
  } catch (error) {
    console.error('Logout error:', error);
    res.status(500).json({ error: 'Logout failed' });
  }
});

/**
 * POST /api/auth/verify-email
 * Verify email with token
 */
router.post('/verify-email', async (req: Request, res: Response) => {
  try {
    const { token } = req.body;

    if (!token) {
      return res.status(400).json({ error: 'Verification token is required' });
    }

    // Find user with this token
    const user = await prisma.user.findFirst({
      where: {
        verifyToken: token,
        verifyExpires: { gt: new Date() },
      },
    });

    if (!user) {
      return res.status(400).json({ error: 'Invalid or expired verification token' });
    }

    // Update user
    await prisma.user.update({
      where: { id: user.id },
      data: {
        emailVerified: true,
        verifyToken: null,
        verifyExpires: null,
      },
    });

    res.json({ message: 'Email verified successfully' });
  } catch (error) {
    console.error('Email verification error:', error);
    res.status(500).json({ error: 'Email verification failed' });
  }
});

/**
 * POST /api/auth/resend-verification
 * Resend verification email
 */
router.post('/resend-verification', authLimiter, async (req: Request, res: Response) => {
  try {
    const { email } = req.body;

    if (!email) {
      return res.status(400).json({ error: 'Email is required' });
    }

    const user = await prisma.user.findUnique({ where: { email } });

    if (!user) {
      // Don't reveal if email exists
      return res.json({ message: 'If the email exists, a verification email will be sent' });
    }

    if (user.emailVerified) {
      return res.status(400).json({ error: 'Email is already verified' });
    }

    // Generate new token
    const verifyToken = uuidv4();
    const verifyExpires = new Date(Date.now() + 24 * 60 * 60 * 1000);

    await prisma.user.update({
      where: { id: user.id },
      data: { verifyToken, verifyExpires },
    });

    if (isEmailConfigured()) {
      await sendVerificationEmail(email, user.username, verifyToken);
    }

    res.json({ message: 'Verification email sent' });
  } catch (error) {
    console.error('Resend verification error:', error);
    res.status(500).json({ error: 'Failed to resend verification email' });
  }
});

/**
 * POST /api/auth/forgot-password
 * Request password reset
 */
router.post('/forgot-password', authLimiter, async (req: Request, res: Response) => {
  try {
    const { email } = req.body;

    if (!email) {
      return res.status(400).json({ error: 'Email is required' });
    }

    const user = await prisma.user.findUnique({ where: { email } });

    if (!user) {
      // Don't reveal if email exists
      return res.json({ message: 'If the email exists, a password reset email will be sent' });
    }

    // Generate reset token
    const resetToken = uuidv4();
    const resetExpires = new Date(Date.now() + 60 * 60 * 1000); // 1 hour

    await prisma.user.update({
      where: { id: user.id },
      data: { resetToken, resetExpires },
    });

    if (isEmailConfigured()) {
      await sendPasswordResetEmail(email, user.username, resetToken);
    }

    res.json({ message: 'Password reset email sent' });
  } catch (error) {
    console.error('Forgot password error:', error);
    res.status(500).json({ error: 'Failed to process password reset request' });
  }
});

/**
 * POST /api/auth/reset-password
 * Reset password with token
 */
router.post('/reset-password', async (req: Request, res: Response) => {
  try {
    const { token, newPassword } = req.body;

    if (!token || !newPassword) {
      return res.status(400).json({ error: 'Token and new password are required' });
    }

    // Validate password strength
    const passwordValidation = validatePasswordStrength(newPassword);
    if (!passwordValidation.isValid) {
      return res.status(400).json({ errors: passwordValidation.errors });
    }

    // Find user with this token
    const user = await prisma.user.findFirst({
      where: {
        resetToken: token,
        resetExpires: { gt: new Date() },
      },
    });

    if (!user) {
      return res.status(400).json({ error: 'Invalid or expired reset token' });
    }

    // Hash new password
    const hashedPassword = await hashPassword(newPassword);

    // Update user
    await prisma.user.update({
      where: { id: user.id },
      data: {
        password: hashedPassword,
        resetToken: null,
        resetExpires: null,
      },
    });

    // Delete all sessions for this user
    await prisma.session.deleteMany({
      where: { userId: user.id },
    });

    res.json({ message: 'Password reset successfully' });
  } catch (error) {
    console.error('Reset password error:', error);
    res.status(500).json({ error: 'Failed to reset password' });
  }
});

/**
 * GET /api/auth/me
 * Get current user info
 */
router.get('/me', authMiddleware, async (req: Request, res: Response) => {
  try {
    if (!req.user) {
      return res.status(401).json({ error: 'Not authenticated' });
    }

    const user = await prisma.user.findUnique({
      where: { id: req.user.id },
      select: {
        id: true,
        email: true,
        username: true,
        nickname: true,
        avatar: true,
        role: true,
        status: true,
        emailVerified: true,
        lastLoginAt: true,
        createdAt: true,
      },
    });

    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    res.json({ user });
  } catch (error) {
    console.error('Get user error:', error);
    res.status(500).json({ error: 'Failed to get user info' });
  }
});

/**
 * PUT /api/auth/profile
 * Update current user profile
 */
router.put('/profile', authMiddleware, async (req: Request, res: Response) => {
  try {
    if (!req.user) {
      return res.status(401).json({ error: 'Not authenticated' });
    }

    const { nickname, avatar } = req.body;

    const updateData: { nickname?: string; avatar?: string } = {};

    if (nickname !== undefined) {
      if (nickname.length > 50) {
        return res.status(400).json({ error: 'Nickname too long' });
      }
      updateData.nickname = nickname;
    }

    if (avatar !== undefined) {
      updateData.avatar = avatar;
    }

    if (Object.keys(updateData).length === 0) {
      return res.status(400).json({ error: 'No fields to update' });
    }

    const user = await prisma.user.update({
      where: { id: req.user.id },
      data: updateData,
      select: {
        id: true,
        email: true,
        username: true,
        nickname: true,
        avatar: true,
        role: true,
      },
    });

    res.json({ message: 'Profile updated', user });
  } catch (error) {
    console.error('Update profile error:', error);
    res.status(500).json({ error: 'Failed to update profile' });
  }
});

/**
 * POST /api/auth/change-password
 * Change password (requires current password)
 */
router.post('/change-password', authMiddleware, async (req: Request, res: Response) => {
  try {
    if (!req.user) {
      return res.status(401).json({ error: 'Not authenticated' });
    }

    const { currentPassword, newPassword } = req.body;

    if (!currentPassword || !newPassword) {
      return res.status(400).json({ error: 'Current and new password are required' });
    }

    // Validate new password strength
    const passwordValidation = validatePasswordStrength(newPassword);
    if (!passwordValidation.isValid) {
      return res.status(400).json({ errors: passwordValidation.errors });
    }

    // Get user with password
    const user = await prisma.user.findUnique({
      where: { id: req.user.id },
    });

    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    // Verify current password
    const isValidPassword = await comparePassword(currentPassword, user.password);
    if (!isValidPassword) {
      return res.status(401).json({ error: 'Current password is incorrect' });
    }

    // Hash new password
    const hashedPassword = await hashPassword(newPassword);

    // Update password
    await prisma.user.update({
      where: { id: user.id },
      data: { password: hashedPassword },
    });

    // Delete all other sessions
    await prisma.session.deleteMany({
      where: {
        userId: user.id,
        NOT: { token: req.headers.authorization?.substring(7) },
      },
    });

    res.json({ message: 'Password changed successfully' });
  } catch (error) {
    console.error('Change password error:', error);
    res.status(500).json({ error: 'Failed to change password' });
  }
});

/**
 * POST /api/auth/refresh
 * Refresh access token
 */
router.post('/refresh', async (req: Request, res: Response) => {
  try {
    const { refreshToken } = req.body;

    if (!refreshToken) {
      return res.status(400).json({ error: 'Refresh token is required' });
    }

    // Verify refresh token
    const payload = verifyToken(refreshToken);
    if (!payload) {
      return res.status(401).json({ error: 'Invalid or expired refresh token' });
    }

    // Get user
    const user = await prisma.user.findUnique({
      where: { id: payload.userId },
    });

    if (!user || user.status !== 'ACTIVE') {
      return res.status(401).json({ error: 'User not found or inactive' });
    }

    // Generate new tokens
    const tokens = generateTokenPair({
      userId: user.id,
      email: user.email,
      role: user.role,
    });

    // Create new session
    const expiresAt = new Date(Date.now() + getTokenExpiration() * 1000);
    await prisma.session.create({
      data: {
        userId: user.id,
        token: tokens.accessToken,
        userAgent: req.headers['user-agent'],
        ip: req.ip || req.connection.remoteAddress,
        expiresAt,
      },
    });

    res.json({
      accessToken: tokens.accessToken,
      refreshToken: tokens.refreshToken,
    });
  } catch (error) {
    console.error('Token refresh error:', error);
    res.status(500).json({ error: 'Failed to refresh token' });
  }
});

export default router;
