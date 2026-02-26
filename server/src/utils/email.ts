import nodemailer from 'nodemailer';

// SMTP configuration from environment
const SMTP_HOST = process.env.SMTP_HOST || 'smtp.example.com';
const SMTP_PORT = parseInt(process.env.SMTP_PORT || '587', 10);
const SMTP_USER = process.env.SMTP_USER || '';
const SMTP_PASS = process.env.SMTP_PASS || '';
const FROM_EMAIL = process.env.FROM_EMAIL || 'noreply@golden-agent.com';
const FRONTEND_URL = process.env.FRONTEND_URL || 'http://localhost:3000';

// Create transporter
const transporter = SMTP_USER && SMTP_PASS
  ? nodemailer.createTransport({
      host: SMTP_HOST,
      port: SMTP_PORT,
      secure: SMTP_PORT === 465,
      auth: {
        user: SMTP_USER,
        pass: SMTP_PASS,
      },
    })
  : null;

/**
 * Check if email service is configured
 */
export function isEmailConfigured(): boolean {
  return transporter !== null;
}

/**
 * Send email verification
 */
export async function sendVerificationEmail(
  email: string,
  username: string,
  verifyToken: string
): Promise<{ success: boolean; error?: string }> {
  if (!transporter) {
    console.warn('Email service not configured. Verification email not sent.');
    return { success: false, error: 'Email service not configured' };
  }

  const verifyUrl = `${FRONTEND_URL}/verify-email?token=${verifyToken}`;

  try {
    await transporter.sendMail({
      from: FROM_EMAIL,
      to: email,
      subject: '天枢 - 邮箱验证',
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <h2>欢迎注册天枢</h2>
          <p>您好 ${username}，</p>
          <p>感谢您注册天枢。请点击下方按钮验证您的邮箱地址：</p>
          <a href="${verifyUrl}" style="display: inline-block; padding: 12px 24px; background-color: #4F46E5; color: white; text-decoration: none; border-radius: 6px;">
            验证邮箱
          </a>
          <p>此链接将在24小时后失效。</p>
          <p>如果您没有注册此账号，请忽略此邮件。</p>
          <p>天枢团队</p>
        </div>
      `,
    });
    return { success: true };
  } catch (error) {
    console.error('Failed to send verification email:', error);
    return { success: false, error: 'Failed to send email' };
  }
}

/**
 * Send password reset email
 */
export async function sendPasswordResetEmail(
  email: string,
  username: string,
  resetToken: string
): Promise<{ success: boolean; error?: string }> {
  if (!transporter) {
    console.warn('Email service not configured. Password reset email not sent.');
    return { success: false, error: 'Email service not configured' };
  }

  const resetUrl = `${FRONTEND_URL}/reset-password?token=${resetToken}`;

  try {
    await transporter.sendMail({
      from: FROM_EMAIL,
      to: email,
      subject: '天枢 - 密码重置',
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <h2>密码重置请求</h2>
          <p>您好 ${username}，</p>
          <p>我们收到了重置您账号密码的请求。请点击下方按钮重置密码：</p>
          <a href="${resetUrl}" style="display: inline-block; padding: 12px 24px; background-color: #4F46E5; color: white; text-decoration: none; border-radius: 6px;">
            重置密码
          </a>
          <p>此链接将在1小时后失效。</p>
          <p>如果您没有请求重置密码，请忽略此邮件。</p>
          <p>天枢团队</p>
        </div>
      `,
    });
    return { success: true };
  } catch (error) {
    console.error('Failed to send password reset email:', error);
    return { success: false, error: 'Failed to send email' };
  }
}

/**
 * Send welcome email after verification
 */
export async function sendWelcomeEmail(
  email: string,
  username: string
): Promise<{ success: boolean; error?: string }> {
  if (!transporter) {
    return { success: false, error: 'Email service not configured' };
  }

  try {
    await transporter.sendMail({
      from: FROM_EMAIL,
      to: email,
      subject: '天枢 - 欢迎加入',
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <h2>欢迎加入天枢！</h2>
          <p>您好 ${username}，</p>
          <p>您的账号已成功验证。现在您可以：</p>
          <ul>
            <li>追踪美国国会交易动态</li>
            <li>获取A股市场实时行情</li>
            <li>分析黄金市场价格走势</li>
            <li>查看内幕交易数据</li>
          </ul>
          <a href="${FRONTEND_URL}" style="display: inline-block; padding: 12px 24px; background-color: #4F46E5; color: white; text-decoration: none; border-radius: 6px;">
            开始探索
          </a>
          <p>天枢团队</p>
        </div>
      `,
    });
    return { success: true };
  } catch (error) {
    console.error('Failed to send welcome email:', error);
    return { success: false, error: 'Failed to send email' };
  }
}

/**
 * Send verification code email (6-digit code)
 */
export async function sendVerificationCodeEmail(
  email: string,
  code: string,
  type: 'register' | 'reset' | 'change'
): Promise<{ success: boolean; error?: string }> {
  if (!transporter) {
    console.warn('Email service not configured. Verification code not sent.');
    return { success: false, error: 'Email service not configured' };
  }

  const typeText = type === 'register' ? '注册验证' : type === 'reset' ? '密码重置' : '更换邮箱';
  const expireText = '5分钟';

  try {
    await transporter.sendMail({
      from: FROM_EMAIL,
      to: email,
      subject: `天枢 - ${typeText}码`,
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
          <h2 style="color: #4F46E5;">天枢 ${typeText}</h2>
          <p>您好，</p>
          <p>您正在进行${typeText}操作，验证码如下：</p>
          <div style="background-color: #f3f4f6; padding: 20px; text-align: center; margin: 20px 0; border-radius: 8px;">
            <span style="font-size: 32px; font-weight: bold; letter-spacing: 8px; color: #4F46E5;">${code}</span>
          </div>
          <p style="color: #666; font-size: 14px;">验证码将在${expireText}后失效，请尽快使用。</p>
          <p style="color: #999; font-size: 12px;">如果您没有进行此操作，请忽略此邮件。</p>
          <hr style="border: none; border-top: 1px solid #eee; margin: 20px 0;">
          <p style="color: #999; font-size: 12px;">天枢团队</p>
        </div>
      `,
    });
    console.log(`[Email] 验证码已发送到 ${email}: ${code}`);
    return { success: true };
  } catch (error) {
    console.error('Failed to send verification code email:', error);
    return { success: false, error: 'Failed to send email' };
  }
}
