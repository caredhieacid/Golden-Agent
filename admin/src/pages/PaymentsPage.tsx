import { useState, useEffect, useCallback } from 'react';
import { ChevronLeft, ChevronRight, Eye, Check, RefreshCw } from 'lucide-react';
import { adminApi, Payment } from '../lib/api';
import { Select, Button } from '../components/ui/Input';
import { Modal } from '../components/ui/Modal';

export default function PaymentsPage() {
  const [payments, setPayments] = useState<Payment[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Pagination
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [total, setTotal] = useState(0);
  const limit = 15;

  // Filters
  const [statusFilter, setStatusFilter] = useState('');
  const [methodFilter, setMethodFilter] = useState('');

  // Modals
  const [selectedPayment, setSelectedPayment] = useState<Payment | null>(null);
  const [showDetailModal, setShowDetailModal] = useState(false);
  const [showStatusModal, setShowStatusModal] = useState(false);
  const [newStatus, setNewStatus] = useState('');
  const [saving, setSaving] = useState(false);

  const loadPayments = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const data = await adminApi.getPayments({
        page,
        limit,
        status: statusFilter || undefined,
        method: methodFilter || undefined,
      });
      setPayments(data.payments);
      setTotalPages(data.pagination.totalPages);
      setTotal(data.pagination.total);
    } catch (err: any) {
      setError(err.message || 'Failed to load payments');
    } finally {
      setLoading(false);
    }
  }, [page, statusFilter, methodFilter]);

  useEffect(() => {
    loadPayments();
  }, [loadPayments]);

  const openDetailModal = async (payment: Payment) => {
    try {
      const fullPayment = await adminApi.getPayment(payment.id);
      setSelectedPayment(fullPayment);
      setShowDetailModal(true);
    } catch (err: any) {
      setError(err.message);
    }
  };

  const openStatusModal = (payment: Payment) => {
    setSelectedPayment(payment);
    setNewStatus(payment.status);
    setShowStatusModal(true);
  };

  const handleUpdateStatus = async () => {
    if (!selectedPayment || !newStatus) return;
    try {
      setSaving(true);
      await adminApi.updatePayment(selectedPayment.id, { status: newStatus });
      setShowStatusModal(false);
      loadPayments();
    } catch (err: any) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
  };

  const getStatusBadge = (status: string) => {
    const styles: Record<string, { bg: string; text: string }> = {
      PENDING: { bg: 'bg-amber-500/20', text: 'text-amber-400' },
      COMPLETED: { bg: 'bg-green-500/20', text: 'text-green-400' },
      FAILED: { bg: 'bg-red-500/20', text: 'text-red-400' },
      REFUNDED: { bg: 'bg-blue-500/20', text: 'text-blue-400' },
    };
    const style = styles[status] || styles.PENDING;
    return (
      <span className={`px-2 py-1 rounded text-xs ${style.bg} ${style.text}`}>
        {status}
      </span>
    );
  };

  const getMethodIcon = (method?: string) => {
    if (!method) return '-';
    const icons: Record<string, string> = {
      alipay: '支付宝',
      wechat: '微信支付',
      stripe: 'Stripe',
    };
    return icons[method] || method;
  };

  // Summary stats
  const pendingCount = payments.filter((p) => p.status === 'PENDING').length;
  const completedTotal = payments
    .filter((p) => p.status === 'COMPLETED')
    .reduce((sum, p) => sum + p.amount, 0);

  return (
    <div className="space-y-4">
      {/* Summary */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="glass-card rounded-xl p-4">
          <p className="text-zinc-400 text-sm">Total Payments</p>
          <p className="text-2xl font-bold text-white">{total}</p>
        </div>
        <div className="glass-card rounded-xl p-4">
          <p className="text-zinc-400 text-sm">Pending</p>
          <p className="text-2xl font-bold text-amber-400">{pendingCount}</p>
        </div>
        <div className="glass-card rounded-xl p-4">
          <p className="text-zinc-400 text-sm">Completed Total</p>
          <p className="text-2xl font-bold text-green-400">¥{completedTotal.toLocaleString()}</p>
        </div>
      </div>

      {/* Filters */}
      <div className="glass-card rounded-xl p-4">
        <div className="flex flex-wrap gap-4">
          <Select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            options={[
              { value: '', label: 'All Status' },
              { value: 'PENDING', label: 'Pending' },
              { value: 'COMPLETED', label: 'Completed' },
              { value: 'FAILED', label: 'Failed' },
              { value: 'REFUNDED', label: 'Refunded' },
            ]}
          />
          <Select
            value={methodFilter}
            onChange={(e) => setMethodFilter(e.target.value)}
            options={[
              { value: '', label: 'All Methods' },
              { value: 'alipay', label: 'Alipay' },
              { value: 'wechat', label: 'WeChat Pay' },
              { value: 'stripe', label: 'Stripe' },
            ]}
          />
          <Button variant="ghost" onClick={() => loadPayments()}>
            <RefreshCw size={16} className="mr-2" />
            Refresh
          </Button>
        </div>
      </div>

      {/* Error */}
      {error && (
        <div className="bg-red-500/20 border border-red-500/50 rounded-lg p-4 text-red-400">
          {error}
        </div>
      )}

      {/* Table */}
      <div className="glass-card rounded-xl overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-zinc-800">
              <tr>
                <th className="text-left px-4 py-3 text-zinc-400 font-medium text-sm">ID</th>
                <th className="text-left px-4 py-3 text-zinc-400 font-medium text-sm">User</th>
                <th className="text-left px-4 py-3 text-zinc-400 font-medium text-sm">Amount</th>
                <th className="text-left px-4 py-3 text-zinc-400 font-medium text-sm">Method</th>
                <th className="text-left px-4 py-3 text-zinc-400 font-medium text-sm">Status</th>
                <th className="text-left px-4 py-3 text-zinc-400 font-medium text-sm">Date</th>
                <th className="text-right px-4 py-3 text-zinc-400 font-medium text-sm">Actions</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan={7} className="text-center py-8 text-zinc-400">
                    Loading...
                  </td>
                </tr>
              ) : payments.length === 0 ? (
                <tr>
                  <td colSpan={7} className="text-center py-8 text-zinc-400">
                    No payments found
                  </td>
                </tr>
              ) : (
                payments.map((payment) => (
                  <tr key={payment.id} className="border-t border-zinc-800 hover:bg-zinc-800/50">
                    <td className="px-4 py-3 text-zinc-400 text-sm font-mono">
                      {payment.id.slice(0, 8)}...
                    </td>
                    <td className="px-4 py-3">
                      {payment.user ? (
                        <div>
                          <p className="text-white">{payment.user.username}</p>
                          <p className="text-zinc-500 text-sm">{payment.user.email}</p>
                        </div>
                      ) : (
                        <span className="text-zinc-500">-</span>
                      )}
                    </td>
                    <td className="px-4 py-3">
                      <span className="text-white font-medium">
                        ¥{payment.amount.toLocaleString()}
                      </span>
                      <span className="text-zinc-500 text-sm ml-1">{payment.currency}</span>
                    </td>
                    <td className="px-4 py-3 text-zinc-400 text-sm">
                      {getMethodIcon(payment.method)}
                    </td>
                    <td className="px-4 py-3">{getStatusBadge(payment.status)}</td>
                    <td className="px-4 py-3 text-zinc-400 text-sm">
                      {new Date(payment.createdAt).toLocaleString()}
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center justify-end gap-2">
                        <button
                          onClick={() => openDetailModal(payment)}
                          className="p-1.5 rounded hover:bg-zinc-700 text-zinc-400 hover:text-white transition-colors"
                          title="View Details"
                        >
                          <Eye size={16} />
                        </button>
                        {payment.status === 'PENDING' && (
                          <button
                            onClick={() => openStatusModal(payment)}
                            className="p-1.5 rounded hover:bg-zinc-700 text-zinc-400 hover:text-green-400 transition-colors"
                            title="Update Status"
                          >
                            <Check size={16} />
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        <div className="flex items-center justify-between px-4 py-3 border-t border-zinc-800">
          <p className="text-zinc-400 text-sm">
            Showing {payments.length} of {total} payments
          </p>
          <div className="flex items-center gap-2">
            <button
              onClick={() => setPage(Math.max(1, page - 1))}
              disabled={page === 1}
              className="p-2 rounded hover:bg-zinc-800 disabled:opacity-50 disabled:cursor-not-allowed text-zinc-400 hover:text-white"
            >
              <ChevronLeft size={18} />
            </button>
            <span className="text-zinc-400 text-sm">
              Page {page} of {totalPages}
            </span>
            <button
              onClick={() => setPage(Math.min(totalPages, page + 1))}
              disabled={page === totalPages}
              className="p-2 rounded hover:bg-zinc-800 disabled:opacity-50 disabled:cursor-not-allowed text-zinc-400 hover:text-white"
            >
              <ChevronRight size={18} />
            </button>
          </div>
        </div>
      </div>

      {/* Detail Modal */}
      <Modal
        isOpen={showDetailModal}
        onClose={() => setShowDetailModal(false)}
        title="Payment Details"
        size="lg"
      >
        {selectedPayment && (
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="glass-card rounded-lg p-3">
                <p className="text-zinc-400 text-sm">Payment ID</p>
                <p className="text-white font-mono text-sm">{selectedPayment.id}</p>
              </div>
              <div className="glass-card rounded-lg p-3">
                <p className="text-zinc-400 text-sm">Status</p>
                {getStatusBadge(selectedPayment.status)}
              </div>
              <div className="glass-card rounded-lg p-3">
                <p className="text-zinc-400 text-sm">Amount</p>
                <p className="text-white font-bold text-lg">
                  ¥{selectedPayment.amount.toLocaleString()} {selectedPayment.currency}
                </p>
              </div>
              <div className="glass-card rounded-lg p-3">
                <p className="text-zinc-400 text-sm">Method</p>
                <p className="text-white">{getMethodIcon(selectedPayment.method)}</p>
              </div>
              <div className="glass-card rounded-lg p-3">
                <p className="text-zinc-400 text-sm">Created</p>
                <p className="text-white">{new Date(selectedPayment.createdAt).toLocaleString()}</p>
              </div>
              <div className="glass-card rounded-lg p-3">
                <p className="text-zinc-400 text-sm">Updated</p>
                <p className="text-white">{new Date(selectedPayment.updatedAt).toLocaleString()}</p>
              </div>
            </div>

            {selectedPayment.user && (
              <div className="glass-card rounded-lg p-4">
                <h4 className="text-white font-medium mb-3">User Info</h4>
                <div className="grid grid-cols-3 gap-4">
                  <div>
                    <p className="text-zinc-400 text-sm">Username</p>
                    <p className="text-white">{selectedPayment.user.username}</p>
                  </div>
                  <div>
                    <p className="text-zinc-400 text-sm">Email</p>
                    <p className="text-white">{selectedPayment.user.email}</p>
                  </div>
                  <div>
                    <p className="text-zinc-400 text-sm">Role</p>
                    <p className="text-white">{selectedPayment.user.role}</p>
                  </div>
                </div>
              </div>
            )}

            {selectedPayment.transactionId && (
              <div className="glass-card rounded-lg p-4">
                <h4 className="text-white font-medium mb-2">Transaction ID</h4>
                <p className="text-zinc-400 font-mono text-sm">{selectedPayment.transactionId}</p>
              </div>
            )}

            {selectedPayment.metadata && Object.keys(selectedPayment.metadata).length > 0 && (
              <div className="glass-card rounded-lg p-4">
                <h4 className="text-white font-medium mb-2">Metadata</h4>
                <pre className="text-zinc-400 text-sm overflow-x-auto">
                  {JSON.stringify(selectedPayment.metadata, null, 2)}
                </pre>
              </div>
            )}
          </div>
        )}
      </Modal>

      {/* Status Modal */}
      <Modal
        isOpen={showStatusModal}
        onClose={() => setShowStatusModal(false)}
        title="Update Payment Status"
      >
        <div className="space-y-4">
          <p className="text-zinc-300">
            Update status for payment <span className="text-white font-mono">{selectedPayment?.id.slice(0, 8)}...</span>
          </p>
          <Select
            label="New Status"
            value={newStatus}
            onChange={(e) => setNewStatus(e.target.value)}
            options={[
              { value: 'PENDING', label: 'Pending' },
              { value: 'COMPLETED', label: 'Completed' },
              { value: 'FAILED', label: 'Failed' },
              { value: 'REFUNDED', label: 'Refunded' },
            ]}
          />
          <p className="text-zinc-400 text-sm">
            Note: Setting status to "Completed" will upgrade the user to VIP.
          </p>
          <div className="flex gap-3 pt-4">
            <Button variant="secondary" onClick={() => setShowStatusModal(false)}>
              Cancel
            </Button>
            <Button onClick={handleUpdateStatus} loading={saving}>
              Update Status
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
