import { Router, Request, Response } from 'express';
import { v4 as uuidv4 } from 'uuid';
import { prisma } from '../db.js';
import { authMiddleware } from '../middleware/auth.js';

const router = Router();

// Helper to safely get string from params (can be string | string[])
function paramString(value: string | string[] | undefined): string {
  if (Array.isArray(value)) return value[0] || '';
  return value || '';
}

// Payment routes require authentication
router.use(authMiddleware);

// ============================================
// Payment Provider Interface (for future implementation)
// ============================================

export interface PaymentOrder {
  id: string;
  userId: string;
  amount: number;
  currency: string;
  subject: string;
  description?: string;
  metadata?: Record<string, unknown>;
}

export interface PaymentResult {
  success: boolean;
  orderId: string;
  paymentUrl?: string;
  qrCode?: string;
  error?: string;
}

export interface OrderStatus {
  orderId: string;
  status: 'PENDING' | 'COMPLETED' | 'FAILED' | 'REFUNDED';
  transactionId?: string;
  paidAt?: Date;
}

export interface RefundResult {
  success: boolean;
  refundId?: string;
  error?: string;
}

export interface CallbackResult {
  success: boolean;
  orderId: string;
  transactionId?: string;
}

/**
 * Payment Provider Interface
 * Implement this interface for different payment providers
 */
export interface PaymentProvider {
  name: string;
  createOrder(order: PaymentOrder): Promise<PaymentResult>;
  queryOrder(orderId: string): Promise<OrderStatus>;
  refund(orderId: string, amount?: number): Promise<RefundResult>;
  handleCallback(data: Record<string, unknown>): Promise<CallbackResult>;
}

// Placeholder providers (to be implemented with actual credentials)
const paymentProviders: Map<string, PaymentProvider> = new Map();

/**
 * Register a payment provider
 */
export function registerPaymentProvider(provider: PaymentProvider) {
  paymentProviders.set(provider.name, provider);
}

/**
 * Get a payment provider by name
 */
export function getPaymentProvider(name: string): PaymentProvider | undefined {
  return paymentProviders.get(name);
}

// ============================================
// Payment API Routes
// ============================================

/**
 * GET /api/payment/methods
 * Get available payment methods
 */
router.get('/methods', (req: Request, res: Response) => {
  const methods = Array.from(paymentProviders.keys()).map(name => ({
    name,
    displayName: name === 'alipay' ? '支付宝' : name === 'wechat' ? '微信支付' : name,
  }));

  // Add placeholder methods for demo
  if (methods.length === 0) {
    methods.push(
      { name: 'alipay', displayName: '支付宝' },
      { name: 'wechat', displayName: '微信支付' }
    );
  }

  res.json({ methods });
});

/**
 * POST /api/payment/create
 * Create a new payment order
 */
router.post('/create', async (req: Request, res: Response) => {
  try {
    if (!req.user) {
      return res.status(401).json({ error: 'Not authenticated' });
    }

    const { amount, currency = 'CNY', method = 'alipay', metadata } = req.body;

    if (!amount || amount <= 0) {
      return res.status(400).json({ error: 'Valid amount is required' });
    }

    // Create payment record
    const paymentId = uuidv4();
    const payment = await prisma.payment.create({
      data: {
        id: paymentId,
        userId: req.user.id,
        amount,
        currency,
        method,
        status: 'PENDING',
        metadata: metadata ? JSON.stringify(metadata) : null,
      },
    });

    // Try to create order with provider
    const provider = getPaymentProvider(method);
    if (provider) {
      const result = await provider.createOrder({
        id: paymentId,
        userId: req.user.id,
        amount,
        currency,
        subject: '天枢 VIP会员',
        description: 'VIP membership subscription',
        metadata,
      });

      if (result.success) {
        return res.json({
          paymentId,
          paymentUrl: result.paymentUrl,
          qrCode: result.qrCode,
        });
      } else {
        // Update payment status to failed
        await prisma.payment.update({
          where: { id: paymentId },
          data: { status: 'FAILED' },
        });
        return res.status(400).json({ error: result.error || 'Failed to create payment order' });
      }
    }

    // Demo mode: return mock payment info
    res.json({
      paymentId,
      message: 'Payment created (demo mode)',
      demoMode: true,
      mockPaymentUrl: `${process.env.FRONTEND_URL || 'http://localhost:3000'}/payment/demo?id=${paymentId}`,
    });
  } catch (error) {
    console.error('Create payment error:', error);
    res.status(500).json({ error: 'Failed to create payment' });
  }
});

/**
 * GET /api/payment/status/:id
 * Get payment status
 */
router.get('/status/:id', async (req: Request, res: Response) => {
  try {
    const id = paramString(req.params.id);

    const payment = await prisma.payment.findUnique({
      where: { id },
    });

    if (!payment) {
      return res.status(404).json({ error: 'Payment not found' });
    }

    // Check if user owns this payment
    if (payment.userId !== req.user?.id && req.user?.role !== 'ADMIN') {
      return res.status(403).json({ error: 'Access denied' });
    }

    // Try to query provider for latest status
    if (payment.method) {
      const provider = getPaymentProvider(payment.method);
      if (provider) {
        const status = await provider.queryOrder(id);
        if (status.status !== payment.status) {
          // Update status
          const updateData: any = { status: status.status };
          if (status.transactionId) {
            updateData.transactionId = status.transactionId;
          }
          await prisma.payment.update({
            where: { id },
            data: updateData,
          });

          // If completed, upgrade user to VIP
          if (status.status === 'COMPLETED') {
            await prisma.user.update({
              where: { id: payment.userId },
              data: { role: 'VIP' },
            });
          }
        }
      }
    }

    res.json({
      payment: {
        id: payment.id,
        amount: payment.amount,
        currency: payment.currency,
        status: payment.status,
        method: payment.method,
        transactionId: payment.transactionId,
        createdAt: payment.createdAt,
      },
    });
  } catch (error) {
    console.error('Get payment status error:', error);
    res.status(500).json({ error: 'Failed to get payment status' });
  }
});

/**
 * GET /api/payment/history
 * Get payment history for current user
 */
router.get('/history', async (req: Request, res: Response) => {
  try {
    if (!req.user) {
      return res.status(401).json({ error: 'Not authenticated' });
    }

    const payments = await prisma.payment.findMany({
      where: { userId: req.user.id },
      orderBy: { createdAt: 'desc' },
      take: 50,
    });

    res.json({ payments });
  } catch (error) {
    console.error('Get payment history error:', error);
    res.status(500).json({ error: 'Failed to get payment history' });
  }
});

/**
 * POST /api/payment/callback/:method
 * Handle payment callback from provider
 */
router.post('/callback/:method', async (req: Request, res: Response) => {
  try {
    const method = paramString(req.params.method);
    const provider = getPaymentProvider(method);

    if (!provider) {
      return res.status(400).json({ error: 'Unknown payment method' });
    }

    const result = await provider.handleCallback(req.body);

    if (result.success && result.orderId) {
      // Update payment status
      const payment = await prisma.payment.findUnique({
        where: { id: result.orderId },
      });

      if (payment) {
        await prisma.payment.update({
          where: { id: result.orderId },
          data: {
            status: 'COMPLETED',
            transactionId: result.transactionId,
          },
        });

        // Upgrade user to VIP
        await prisma.user.update({
          where: { id: payment.userId },
          data: { role: 'VIP' },
        });
      }
    }

    // Return success response for callback
    res.send('success');
  } catch (error) {
    console.error('Payment callback error:', error);
    res.status(500).send('fail');
  }
});

/**
 * POST /api/payment/refund/:id
 * Request refund for a payment
 */
router.post('/refund/:id', async (req: Request, res: Response) => {
  try {
    const id = paramString(req.params.id);
    const { amount } = req.body;

    const payment = await prisma.payment.findUnique({
      where: { id },
    });

    if (!payment) {
      return res.status(404).json({ error: 'Payment not found' });
    }

    // Check if user owns this payment or is admin
    if (payment.userId !== req.user?.id && req.user?.role !== 'ADMIN') {
      return res.status(403).json({ error: 'Access denied' });
    }

    if (payment.status !== 'COMPLETED') {
      return res.status(400).json({ error: 'Only completed payments can be refunded' });
    }

    // Try to process refund with provider
    if (payment.method) {
      const provider = getPaymentProvider(payment.method);
      if (provider) {
        const result = await provider.refund(id, amount);
        if (!result.success) {
          return res.status(400).json({ error: result.error || 'Refund failed' });
        }
      }
    }

    // Update payment status
    await prisma.payment.update({
      where: { id },
      data: { status: 'REFUNDED' },
    });

    // Downgrade user if admin initiated refund
    if (req.user?.role === 'ADMIN') {
      await prisma.user.update({
        where: { id: payment.userId },
        data: { role: 'USER' },
      });
    }

    res.json({ message: 'Refund processed' });
  } catch (error) {
    console.error('Refund error:', error);
    res.status(500).json({ error: 'Failed to process refund' });
  }
});

/**
 * POST /api/payment/demo-complete
 * Demo endpoint to complete a payment (for testing only)
 */
router.post('/demo-complete', async (req: Request, res: Response) => {
  try {
    const { paymentId } = req.body;

    if (!paymentId) {
      return res.status(400).json({ error: 'Payment ID is required' });
    }

    const payment = await prisma.payment.findUnique({
      where: { id: paymentId },
    });

    if (!payment) {
      return res.status(404).json({ error: 'Payment not found' });
    }

    if (payment.status !== 'PENDING') {
      return res.status(400).json({ error: 'Payment is not pending' });
    }

    // Update payment status
    await prisma.payment.update({
      where: { id: paymentId },
      data: {
        status: 'COMPLETED',
        transactionId: `demo_${Date.now()}`,
      },
    });

    // Upgrade user to VIP
    await prisma.user.update({
      where: { id: payment.userId },
      data: { role: 'VIP' },
    });

    res.json({ message: 'Payment completed (demo)', success: true });
  } catch (error) {
    console.error('Demo complete error:', error);
    res.status(500).json({ error: 'Failed to complete payment' });
  }
});

export default router;
