import { Router, Request, Response } from 'express';
import { prisma } from '../db.js';
import { authMiddleware, adminMiddleware } from '../middleware/auth.js';

const router = Router();

// Helper to safely get string from query (can be string | ParsedQs | string[] | ParsedQs[])
function queryString(value: string | any | undefined): string | undefined {
  if (Array.isArray(value)) return typeof value[0] === 'string' ? value[0] : undefined;
  return typeof value === 'string' ? value : undefined;
}

// Helper to safely get string from params (can be string | string[])
function paramString(value: string | string[] | undefined): string {
  if (Array.isArray(value)) return value[0] || '';
  return value || '';
}

// All admin routes require authentication and admin role
router.use(authMiddleware);
router.use(adminMiddleware);

// ============================================
// User Management
// ============================================

/**
 * GET /api/admin/users
 * Get paginated list of users
 */
router.get('/users', async (req: Request, res: Response) => {
  try {
    const page = parseInt(queryString(req.query.page) || '1') || 1;
    const limit = parseInt(queryString(req.query.limit) || '20') || 20;
    const search = queryString(req.query.search);
    const role = queryString(req.query.role);
    const status = queryString(req.query.status);

    const skip = (page - 1) * limit;

    // Build where clause
    const where: any = {};
    if (search) {
      where.OR = [
        { email: { contains: search } },
        { username: { contains: search } },
        { nickname: { contains: search } },
      ];
    }
    if (role) {
      where.role = role;
    }
    if (status) {
      where.status = status;
    }

    const [users, total] = await Promise.all([
      prisma.user.findMany({
        where,
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
          _count: {
            select: { sessions: true, payments: true },
          },
        },
        orderBy: { createdAt: 'desc' },
        skip,
        take: limit,
      }),
      prisma.user.count({ where }),
    ]);

    res.json({
      users,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    });
  } catch (error) {
    console.error('Get users error:', error);
    res.status(500).json({ error: 'Failed to get users' });
  }
});

/**
 * GET /api/admin/users/:id
 * Get user details
 */
router.get('/users/:id', async (req: Request, res: Response) => {
  try {
    const id = paramString(req.params.id);

    const user = await prisma.user.findUnique({
      where: { id },
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
        updatedAt: true,
        sessions: {
          select: {
            id: true,
            userAgent: true,
            ip: true,
            createdAt: true,
            expiresAt: true,
          },
          orderBy: { createdAt: 'desc' },
          take: 10,
        },
        payments: {
          select: {
            id: true,
            amount: true,
            currency: true,
            status: true,
            method: true,
            createdAt: true,
          },
          orderBy: { createdAt: 'desc' },
          take: 10,
        },
        _count: {
          select: { sessions: true, payments: true, analytics: true },
        },
      },
    });

    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    res.json({ user });
  } catch (error) {
    console.error('Get user error:', error);
    res.status(500).json({ error: 'Failed to get user' });
  }
});

/**
 * PUT /api/admin/users/:id
 * Update user (role, status)
 */
router.put('/users/:id', async (req: Request, res: Response) => {
  try {
    const id = paramString(req.params.id);
    const { role, status, nickname } = req.body;

    const updateData: any = {};
    if (role && ['USER', 'VIP', 'ADMIN'].includes(role)) {
      updateData.role = role;
    }
    if (status && ['ACTIVE', 'INACTIVE', 'BANNED'].includes(status)) {
      updateData.status = status;
    }
    if (nickname !== undefined) {
      updateData.nickname = nickname;
    }

    if (Object.keys(updateData).length === 0) {
      return res.status(400).json({ error: 'No valid fields to update' });
    }

    const user = await prisma.user.update({
      where: { id },
      data: updateData,
      select: {
        id: true,
        email: true,
        username: true,
        nickname: true,
        role: true,
        status: true,
      },
    });

    res.json({ message: 'User updated', user });
  } catch (error) {
    console.error('Update user error:', error);
    res.status(500).json({ error: 'Failed to update user' });
  }
});

/**
 * DELETE /api/admin/users/:id
 * Delete user (soft delete by setting status to BANNED)
 */
router.delete('/users/:id', async (req: Request, res: Response) => {
  try {
    const id = paramString(req.params.id);

    // Don't allow deleting yourself
    if (id === req.user?.id) {
      return res.status(400).json({ error: 'Cannot delete your own account' });
    }

    // Delete all sessions first
    await prisma.session.deleteMany({
      where: { userId: id },
    });

    // Delete user
    await prisma.user.delete({
      where: { id },
    });

    res.json({ message: 'User deleted' });
  } catch (error) {
    console.error('Delete user error:', error);
    res.status(500).json({ error: 'Failed to delete user' });
  }
});

// ============================================
// Statistics
// ============================================

/**
 * GET /api/admin/stats/overview
 * Get overview statistics
 */
router.get('/stats/overview', async (req: Request, res: Response) => {
  try {
    const [
      totalUsers,
      activeUsers,
      vipUsers,
      adminCount,
      totalPayments,
      completedPayments,
      todaySignups,
      todayLogins,
      totalRevenue,
    ] = await Promise.all([
      prisma.user.count(),
      prisma.user.count({ where: { status: 'ACTIVE' } }),
      prisma.user.count({ where: { role: 'VIP' } }),
      prisma.user.count({ where: { role: 'ADMIN' } }),
      prisma.payment.count(),
      prisma.payment.count({ where: { status: 'COMPLETED' } }),
      prisma.user.count({
        where: {
          createdAt: {
            gte: new Date(new Date().setHours(0, 0, 0, 0)),
          },
        },
      }),
      prisma.user.count({
        where: {
          lastLoginAt: {
            gte: new Date(new Date().setHours(0, 0, 0, 0)),
          },
        },
      }),
      prisma.payment.aggregate({
        where: { status: 'COMPLETED' },
        _sum: { amount: true },
      }),
    ]);

    res.json({
      users: {
        total: totalUsers,
        active: activeUsers,
        vip: vipUsers,
        admins: adminCount,
        todaySignups,
        todayLogins,
      },
      payments: {
        total: totalPayments,
        completed: completedPayments,
        totalRevenue: totalRevenue._sum.amount || 0,
      },
    });
  } catch (error) {
    console.error('Get overview stats error:', error);
    res.status(500).json({ error: 'Failed to get statistics' });
  }
});

/**
 * GET /api/admin/stats/traffic
 * Get traffic statistics
 */
router.get('/stats/traffic', async (req: Request, res: Response) => {
  try {
    const days = parseInt(queryString(req.query.days) || '7') || 7;
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - days);
    startDate.setHours(0, 0, 0, 0);

    // Get daily visit counts
    const analytics = await prisma.analytics.findMany({
      where: {
        timestamp: { gte: startDate },
      },
      select: {
        timestamp: true,
        path: true,
        userId: true,
      },
    });

    // Group by day
    const dailyStats = new Map<string, { visits: number; uniqueVisitors: Set<string>; paths: Map<string, number> }>();

    for (const item of analytics) {
      const day = item.timestamp.toISOString().split('T')[0];
      if (!dailyStats.has(day)) {
        dailyStats.set(day, { visits: 0, uniqueVisitors: new Set(), paths: new Map() });
      }
      const stats = dailyStats.get(day)!;
      stats.visits++;
      if (item.userId) {
        stats.uniqueVisitors.add(item.userId);
      }
      stats.paths.set(item.path, (stats.paths.get(item.path) || 0) + 1);
    }

    // Convert to array format
    const result = Array.from(dailyStats.entries()).map(([date, stats]) => ({
      date,
      visits: stats.visits,
      uniqueVisitors: stats.uniqueVisitors.size,
      topPaths: Array.from(stats.paths.entries())
        .sort((a, b) => b[1] - a[1])
        .slice(0, 5)
        .map(([path, count]) => ({ path, count })),
    }));

    res.json({ traffic: result.reverse() });
  } catch (error) {
    console.error('Get traffic stats error:', error);
    res.status(500).json({ error: 'Failed to get traffic statistics' });
  }
});

/**
 * GET /api/admin/stats/users
 * Get user statistics
 */
router.get('/stats/users', async (req: Request, res: Response) => {
  try {
    const days = parseInt(queryString(req.query.days) || '30') || 30;
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - days);
    startDate.setHours(0, 0, 0, 0);

    // Get daily signups
    const users = await prisma.user.findMany({
      where: {
        createdAt: { gte: startDate },
      },
      select: {
        createdAt: true,
        role: true,
      },
    });

    // Group by day
    const dailySignups = new Map<string, { total: number; vip: number }>();
    for (const user of users) {
      const day = user.createdAt.toISOString().split('T')[0];
      if (!dailySignups.has(day)) {
        dailySignups.set(day, { total: 0, vip: 0 });
      }
      const stats = dailySignups.get(day)!;
      stats.total++;
      if (user.role === 'VIP') {
        stats.vip++;
      }
    }

    const result = Array.from(dailySignups.entries()).map(([date, stats]) => ({
      date,
      signups: stats.total,
      vipSignups: stats.vip,
    }));

    res.json({ signups: result.reverse() });
  } catch (error) {
    console.error('Get user stats error:', error);
    res.status(500).json({ error: 'Failed to get user statistics' });
  }
});

/**
 * GET /api/admin/stats/active
 * Get active users (logged in within last N days)
 */
router.get('/stats/active', async (req: Request, res: Response) => {
  try {
    const days = parseInt(queryString(req.query.days) || '7') || 7;
    const since = new Date();
    since.setDate(since.getDate() - days);

    const activeUsers = await prisma.user.findMany({
      where: {
        lastLoginAt: { gte: since },
        status: 'ACTIVE',
      },
      select: {
        id: true,
        username: true,
        email: true,
        role: true,
        lastLoginAt: true,
      },
      orderBy: { lastLoginAt: 'desc' },
      take: 100,
    });

    res.json({ activeUsers, total: activeUsers.length });
  } catch (error) {
    console.error('Get active users error:', error);
    res.status(500).json({ error: 'Failed to get active users' });
  }
});

// ============================================
// Payment Management
// ============================================

/**
 * GET /api/admin/payments
 * Get paginated list of payments
 */
router.get('/payments', async (req: Request, res: Response) => {
  try {
    const page = parseInt(queryString(req.query.page) || '1') || 1;
    const limit = parseInt(queryString(req.query.limit) || '20') || 20;
    const status = queryString(req.query.status);
    const method = queryString(req.query.method);

    const skip = (page - 1) * limit;

    const where: any = {};
    if (status) {
      where.status = status;
    }
    if (method) {
      where.method = method;
    }

    const [payments, total] = await Promise.all([
      prisma.payment.findMany({
        where,
        include: {
          user: {
            select: {
              id: true,
              username: true,
              email: true,
            },
          },
        },
        orderBy: { createdAt: 'desc' },
        skip,
        take: limit,
      }),
      prisma.payment.count({ where }),
    ]);

    res.json({
      payments,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    });
  } catch (error) {
    console.error('Get payments error:', error);
    res.status(500).json({ error: 'Failed to get payments' });
  }
});

/**
 * GET /api/admin/payments/:id
 * Get payment details
 */
router.get('/payments/:id', async (req: Request, res: Response) => {
  try {
    const id = paramString(req.params.id);

    const payment = await prisma.payment.findUnique({
      where: { id },
      include: {
        user: {
          select: {
            id: true,
            username: true,
            email: true,
            role: true,
          },
        },
      },
    });

    if (!payment) {
      return res.status(404).json({ error: 'Payment not found' });
    }

    res.json({ payment });
  } catch (error) {
    console.error('Get payment error:', error);
    res.status(500).json({ error: 'Failed to get payment' });
  }
});

/**
 * PUT /api/admin/payments/:id
 * Update payment status (for manual processing)
 */
router.put('/payments/:id', async (req: Request, res: Response) => {
  try {
    const id = paramString(req.params.id);
    const { status, transactionId } = req.body;

    if (!status || !['PENDING', 'COMPLETED', 'FAILED', 'REFUNDED'].includes(status)) {
      return res.status(400).json({ error: 'Valid status is required' });
    }

    const updateData: any = { status };
    if (transactionId) {
      updateData.transactionId = transactionId;
    }

    const payment = await prisma.payment.update({
      where: { id },
      data: updateData,
    });

    // If payment completed, upgrade user to VIP
    if (status === 'COMPLETED') {
      await prisma.user.update({
        where: { id: payment.userId },
        data: { role: 'VIP' },
      });
    }

    res.json({ message: 'Payment updated', payment });
  } catch (error) {
    console.error('Update payment error:', error);
    res.status(500).json({ error: 'Failed to update payment' });
  }
});

export default router;
