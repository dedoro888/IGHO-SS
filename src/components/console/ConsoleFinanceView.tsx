import React, { useState } from 'react';
import {
  Wallet,
  DollarSign,
  TrendingUp,
  CreditCard,
  RotateCcw,
  CheckCircle2,
  XCircle,
  AlertCircle,
  Search,
  Download,
  ArrowLeft,
  ChevronLeft,
  ChevronRight,
  Receipt,
} from 'lucide-react';
import { PlatformTransaction } from '../../types';

interface ConsoleFinanceViewProps {
  transactions: PlatformTransaction[];
  onIssueRefund: (transactionId: string, reason: string) => void;
  onNavigateBreadcrumb?: () => void;
}

export const ConsoleFinanceView: React.FC<ConsoleFinanceViewProps> = ({
  transactions,
  onIssueRefund,
  onNavigateBreadcrumb,
}) => {
  const [statusFilter, setStatusFilter] = useState('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [currentPage, setCurrentPage] = useState(1);

  // Refund Modal State
  const [refundingTxn, setRefundingTxn] = useState<PlatformTransaction | null>(null);
  const [refundReason, setRefundReason] = useState('');

  // Financial calculations
  const successfulTxns = transactions.filter((t) => t.paymentStatus === 'successful');
  const totalRevenue = successfulTxns.reduce((sum, t) => sum + t.amount, 0);

  const successfulCount = successfulTxns.length;
  const failedCount = transactions.filter((t) => t.paymentStatus === 'failed').length;
  const refundCount = transactions.filter((t) => t.paymentStatus === 'refunded').length;
  const totalRefundAmount = transactions
    .filter((t) => t.paymentStatus === 'refunded')
    .reduce((sum, t) => sum + t.amount, 0);

  const filteredTxns = transactions.filter((t) => {
    const matchesStatus = statusFilter === 'all' || t.paymentStatus === statusFilter;
    const query = searchQuery.toLowerCase();
    const matchesSearch =
      !query ||
      t.reference.toLowerCase().includes(query) ||
      t.hotelName.toLowerCase().includes(query) ||
      t.paymentMethod.toLowerCase().includes(query);
    return matchesStatus && matchesSearch;
  });

  const pageSize = 10;
  const totalPages = Math.ceil(filteredTxns.length / pageSize) || 1;
  const paginatedTxns = filteredTxns.slice((currentPage - 1) * pageSize, currentPage * pageSize);

  const handleConfirmRefund = () => {
    if (!refundingTxn) return;
    if (!refundReason.trim()) {
      alert('Please specify a reason for this refund.');
      return;
    }
    onIssueRefund(refundingTxn.id, refundReason.trim());
    setRefundingTxn(null);
    setRefundReason('');
  };

  return (
    <div className="space-y-6 text-neutral-900">
      {/* Breadcrumb */}
      <div className="flex items-center gap-2 text-xs text-neutral-500">
        <button
          onClick={onNavigateBreadcrumb}
          className="hover:text-black flex items-center gap-1 transition-colors font-medium"
        >
          <ArrowLeft className="w-3.5 h-3.5" />
          <span>Dashboard</span>
        </button>
        <span className="text-neutral-300">/</span>
        <span className="text-neutral-900 font-bold">Platform Finance & Invoicing</span>
      </div>

      {/* Header */}
      <div className="bg-white border border-neutral-200 rounded-2xl p-5 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-3.5">
          <div className="w-11 h-11 rounded-xl bg-neutral-100 border border-neutral-200 text-neutral-900 flex items-center justify-center font-bold">
            <Wallet className="w-5 h-5" />
          </div>
          <div>
            <h1 className="text-2xl font-black tracking-tight text-black">
              Platform Finance & Transactions
            </h1>
            <p className="text-xs text-neutral-500">
              Audit subscription settlements, fee receipts, payment gateways, and chargeback disputes.
            </p>
          </div>
        </div>

        <button
          onClick={() => alert('Exporting platform financial statement CSV...')}
          className="px-4 py-2 rounded-xl border border-neutral-300 hover:bg-neutral-50 text-neutral-900 font-bold text-xs transition-colors flex items-center gap-1.5 shadow-2xs"
        >
          <Download className="w-3.5 h-3.5" />
          <span>Export Ledger</span>
        </button>
      </div>

      {/* Financial KPIs */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3.5">
        <div className="bg-white border border-neutral-200 rounded-2xl p-4 shadow-xs">
          <span className="text-[10px] text-neutral-500 font-bold uppercase tracking-wider block">
            Settled Revenue
          </span>
          <div className="text-2xl font-black text-black mt-1 font-mono">
            ₦{totalRevenue.toLocaleString()}
          </div>
          <span className="text-[10px] text-emerald-700 font-medium">All platform products</span>
        </div>

        <div className="bg-white border border-neutral-200 rounded-2xl p-4 shadow-xs">
          <span className="text-[10px] text-neutral-500 font-bold uppercase tracking-wider block">
            Successful Transactions
          </span>
          <div className="text-2xl font-black text-black mt-1">{successfulCount}</div>
          <span className="text-[10px] text-neutral-400">Captured in ledger</span>
        </div>

        <div className="bg-white border border-neutral-200 rounded-2xl p-4 shadow-xs">
          <span className="text-[10px] text-neutral-500 font-bold uppercase tracking-wider block">
            Failed Invoices
          </span>
          <div className={`text-2xl font-black mt-1 ${failedCount > 0 ? 'text-rose-600' : 'text-neutral-400'}`}>
            {failedCount}
          </div>
          <span className="text-[10px] text-neutral-400">Card / transfer errors</span>
        </div>

        <div className="bg-white border border-neutral-200 rounded-2xl p-4 shadow-xs">
          <span className="text-[10px] text-neutral-500 font-bold uppercase tracking-wider block">
            Total Refunds
          </span>
          <div className="text-2xl font-black text-black mt-1 font-mono">
            ₦{totalRefundAmount.toLocaleString()}
          </div>
          <span className="text-[10px] text-neutral-400">{refundCount} processed</span>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="bg-white border border-neutral-200 rounded-2xl p-4 shadow-xs flex flex-wrap items-center justify-between gap-3">
        <div className="relative flex-1 min-w-[240px] max-w-md">
          <Search className="w-4 h-4 text-neutral-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search by reference, hotel, or payment method..."
            className="w-full bg-neutral-50 border border-neutral-200 rounded-xl pl-9 pr-3 py-2 text-xs text-neutral-900 placeholder:text-neutral-400 focus:outline-none focus:border-black focus:bg-white transition-colors"
          />
        </div>

        <div className="flex items-center gap-2">
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="bg-neutral-50 border border-neutral-200 rounded-xl px-3 py-2 text-xs text-neutral-800 font-medium focus:outline-none focus:border-black"
          >
            <option value="all">All Statuses</option>
            <option value="successful">Successful</option>
            <option value="failed">Failed</option>
            <option value="refunded">Refunded</option>
          </select>
        </div>
      </div>

      {/* Transactions Table or Empty State */}
      {filteredTxns.length === 0 ? (
        <div className="bg-white border border-neutral-200 rounded-2xl p-12 text-center space-y-4 shadow-xs">
          <div className="w-12 h-12 rounded-2xl bg-neutral-100 border border-neutral-200 flex items-center justify-center mx-auto text-neutral-500">
            <Receipt className="w-6 h-6" />
          </div>
          <div className="space-y-1 max-w-md mx-auto">
            <h3 className="text-base font-bold text-black">No transactions recorded</h3>
            <p className="text-xs text-neutral-500 leading-relaxed">
              All placeholder financial logs have been cleared. As hotels subscribe and transact on the platform, audit trails will populate here.
            </p>
          </div>
        </div>
      ) : (
        <div className="bg-white border border-neutral-200 rounded-2xl shadow-xs overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-neutral-50 border-b border-neutral-200 text-[10px] font-bold uppercase tracking-wider text-neutral-500">
                  <th className="p-4">Reference</th>
                  <th className="p-4">Tenant</th>
                  <th className="p-4">Amount</th>
                  <th className="p-4">Gateway / Method</th>
                  <th className="p-4">Status</th>
                  <th className="p-4">Timestamp</th>
                  <th className="p-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-neutral-100 text-xs text-neutral-800">
                {paginatedTxns.map((t) => (
                  <tr key={t.id} className="hover:bg-neutral-50/80 transition-colors">
                    <td className="p-4 font-mono font-bold text-neutral-900">{t.reference}</td>
                    <td className="p-4 font-semibold text-black">{t.hotelName}</td>
                    <td className="p-4 font-mono font-bold text-black">₦{t.amount.toLocaleString()}</td>
                    <td className="p-4 capitalize text-neutral-600">{t.paymentMethod}</td>
                    <td className="p-4">
                      {t.paymentStatus === 'successful' && (
                        <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
                          Successful
                        </span>
                      )}
                      {t.paymentStatus === 'failed' && (
                        <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-rose-50 text-rose-700 border border-rose-200">
                          Failed
                        </span>
                      )}
                      {t.paymentStatus === 'refunded' && (
                        <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-neutral-100 text-neutral-700 border border-neutral-200">
                          Refunded
                        </span>
                      )}
                    </td>
                    <td className="p-4 font-mono text-[11px] text-neutral-500">{t.timestamp}</td>
                    <td className="p-4 text-right">
                      {t.paymentStatus === 'successful' && (
                        <button
                          onClick={() => setRefundingTxn(t)}
                          className="px-2.5 py-1 rounded-lg border border-neutral-200 text-xs font-semibold hover:bg-neutral-100 text-neutral-700"
                        >
                          Issue Refund
                        </button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Refund Modal */}
      {refundingTxn && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white border border-neutral-200 rounded-2xl p-6 sm:p-8 max-w-md w-full shadow-2xl space-y-4">
            <h3 className="text-lg font-bold text-neutral-900">
              Confirm Refund for {refundingTxn.reference}
            </h3>
            <p className="text-xs text-neutral-500">
              Amount: <strong className="text-black font-mono">₦{refundingTxn.amount.toLocaleString()}</strong>
            </p>
            <input
              type="text"
              value={refundReason}
              onChange={(e) => setRefundReason(e.target.value)}
              placeholder="Reason for refund (required)..."
              className="w-full bg-neutral-50 border border-neutral-300 rounded-xl px-3 py-2 text-xs text-neutral-900 focus:outline-none focus:border-black"
            />
            <div className="flex items-center justify-end gap-2 pt-2">
              <button
                onClick={() => setRefundingTxn(null)}
                className="px-4 py-2 rounded-xl text-xs font-semibold text-neutral-700 hover:bg-neutral-100"
              >
                Cancel
              </button>
              <button
                onClick={handleConfirmRefund}
                className="px-4 py-2 rounded-full bg-black text-white text-xs font-bold hover:bg-neutral-800 shadow-sm"
              >
                Confirm Refund
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
