import svgCaptcha from 'svg-captcha';
import { prisma } from '../db.js';

const CAPTCHA_EXPIRES_IN = parseInt(process.env.CAPTCHA_EXPIRES_IN || '300000', 10); // 5 minutes default

// In-memory store for captcha (for development without Redis)
// In production, use Redis for distributed systems
const captchaStore = new Map<string, { text: string; expiresAt: number }>();

// Clean up expired captchas periodically
setInterval(() => {
  const now = Date.now();
  for (const [id, data] of captchaStore.entries()) {
    if (data.expiresAt < now) {
      captchaStore.delete(id);
    }
  }
}, 60000); // Clean every minute

export interface CaptchaResult {
  captchaId: string;
  svg: string;
}

/**
 * Generate a new captcha
 */
export function generateCaptcha(): CaptchaResult {
  const captcha = svgCaptcha.create({
    size: 6,
    noise: 3,
    color: true,
    background: '#f0f0f0',
    width: 150,
    height: 50,
  });

  const captchaId = crypto.randomUUID();
  const expiresAt = Date.now() + CAPTCHA_EXPIRES_IN;

  captchaStore.set(captchaId, {
    text: captcha.text.toLowerCase(),
    expiresAt,
  });

  return {
    captchaId,
    svg: captcha.data,
  };
}

/**
 * Verify a captcha
 */
export function verifyCaptcha(captchaId: string, userInput: string): boolean {
  const stored = captchaStore.get(captchaId);

  if (!stored) {
    return false;
  }

  if (stored.expiresAt < Date.now()) {
    captchaStore.delete(captchaId);
    return false;
  }

  const isValid = stored.text === userInput.toLowerCase();
  captchaStore.delete(captchaId); // Delete after verification (one-time use)

  return isValid;
}

/**
 * Get remaining time for a captcha
 */
export function getCaptchaRemainingTime(captchaId: string): number {
  const stored = captchaStore.get(captchaId);
  if (!stored) return 0;
  return Math.max(0, stored.expiresAt - Date.now());
}
