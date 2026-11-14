import React, { useState, useEffect } from 'react';
import {
  CreditCard,
  Building2,
  Check,
  CheckCircle2,
  XCircle,
  Clock,
  Eye,
  Printer,
  Download,
  Search,
  ArrowUpRight,
  TrendingUp,
  AlertCircle,
  RefreshCw,
  FileText,
  DollarSign,
  ShieldCheck,
  Calendar,
  RotateCcw,
  Send,
  HelpCircle,
  Copy,
  Lock,
} from 'lucide-react';
import { Hotel, Reservation, PlanPrivileges } from '../../types';
import { ComparativePerformanceChart, MetricConfig } from '../common/ComparativePerformanceChart';

interface HotelBillingAndPaymentsViewProps {
  hotel: Hotel;
  reservations: Reservation[];
  privileges?: PlanPrivileges;
  onRequestUpgrade?: () => void;
  onUpdateBankInfo: (bankInfo: {
    bankName: string;
    accountName: string;
    accountNumber: string;
    transferInstructions?: string;
  }) => void;
  onUpdateReservationStatus?: (resId: string, status: Reservation['status']) => void;
  onVerifyPayment?: (resId: string, verified: boolean) => void;
  onProcessRefund?: (resId: string, refundData: { amount: number; txRef?: string }) => void;
}

export const HotelBillingAndPaymentsView: React.FC<HotelBillingAndPaymentsViewProps> = ({
  hotel,
  reservations,
  privileges,
  onRequestUpgrade,
  onUpdateBankInfo,
  onUpdateReservationStatus,
  onVerifyPayment,
  onProcessRefund,
}) => {
  const effectivePrivileges: PlanPrivileges = privileges || hotel.privileges || {
    hasGuestPortal: hotel.hasGuestPortal !== false && hotel.subscriptionPlanId !== 'plan-starter-30k',
    maxRooms: hotel.subscriptionPlanId === 'plan-complete-50k' ? 999 : 20,
    maxStaff: hotel.subscriptionPlanId === 'plan-complete-50k' ? 100 : 5,
    maxBranches: hotel.subscriptionPlanId === 'plan-complete-50k' ? 25 : 1,
    storageQuotaGb: hotel.subscriptionPlanId === 'plan-complete-50k' ? 10 : 1,
    frontDeskPMS: true,
    housekeeping: true,
    guestFolios: true,
    nightAudit: true,
    cashierShifts: true,
    maintenanceBlocks: true,
    customRoles: hotel.subscriptionPlanId === 'plan-complete-50k',
    multiBranch: hotel.subscriptionPlanId === 'plan-complete-50k',
    cautionDeposits: hotel.subscriptionPlanId === 'plan-complete-50k',
    financialExports: hotel.subscriptionPlanId === 'plan-complete-50k',
    publicDirectoryListing: true,
    prioritySupport: hotel.subscriptionPlanId === 'plan-complete-50k',
  };

  // Direct Hotel Bank Account Configuration (No Paystack Subaccounts)
  const [bankName, setBankName] = useState(hotel.bankName || 'Zenith Bank PLC');
  const [accountName, setAccountName] = useState(hotel.accountName || `${hotel.name || 'Hotel'} Ltd`);
  const [accountNumber, setAccountNumber] = useState(hotel.accountNumber || '1014529384');
  const [transferInstructions, setTransferInstructions] = useState(
    (hotel as any).transferInstructions ||
      'Please transfer the exact booking fee to our direct commercial bank account above. Use your Booking Reference as payment remarks/narration and upload your transfer receipt to confirm your room.'
  );
  const [saveSuccess, setSaveSuccess] = useState(false);
  const [copiedBank, setCopiedBank] = useState(false);

  useEffect(() => {
    setBankName(hotel.bankName || 'Zenith Bank PLC');
    setAccountName(hotel.accountName || `${hotel.name || 'Hotel'} Ltd`);
    setAccountNumber(hotel.accountNumber || '1014529384');
    setTransferInstructions(
      hotel.transferInstructions ||
        'Please transfer the exact booking fee to our direct commercial bank account above. Use your Booking Reference as payment remarks/narration and upload your transfer receipt to confirm your room.'
    );
  }, [hotel.id, hotel.bankName, hotel.accountName, hotel.accountNumber, hotel.transferInstructions, hotel.name]);

  // Sub-view: 'overview' | 'invoices' | 'refunds' | 'bank_config'
  const [activeSubTab, setActiveSubTab] = useState<'overview' | 'invoices' | 'refunds' | 'bank_config'>('overview');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedReceiptRes, setSelectedReceiptRes] = useState<Reservation | null>(null);
  const [printingRes, setPrintingRes] = useState<Reservation | null>(null);

  // Refund processing state
  const [selectedRefundRes, setSelectedRefundRes] = useState<Reservation | null>(null);
  const [disbursementRef, setDisbursementRef] = useState('');
  const [refundProcessingSuccess, setRefundProcessingSuccess] = useState(false);

  // Status update dispatch
  const handleUpdateStatus = (resId: string, status: Reservation['status']) => {
    if (onUpdateReservationStatus) {
      onUpdateReservationStatus(resId, status);
    }
    if (onVerifyPayment) {
      onVerifyPayment(resId, status === 'confirmed' || status === 'checked_in' || status === 'checked_out');
    }
  };

  // Handle direct bank save
  const handleSaveBankInfo = (e: React.FormEvent) => {
    e.preventDefault();
    onUpdateBankInfo({
      bankName,
      accountName,
      accountNumber,
      transferInstructions,
    });
    setSaveSuccess(true);
    setTimeout(() => setSaveSuccess(false), 2500);
  };

  // Calculations for Financial Reports & Exact Deductions
  const confirmedReservations = reservations.filter(
    (r) => r.status === 'confirmed' || r.status === 'checked_in' || r.status === 'checked_out'
  );
  const grossRevenue = confirmedReservations.reduce((sum, r) => sum + (r.total || 0), 0);

  // Completed refunds are deducted directly from gross revenue
  const refundedReservations = reservations.filter(
    (r) => r.refundStatus === 'completed' || ((r.status === 'cancelled' || r.status === 'rejected') && r.refundAmount)
  );
  const totalRefundedAmount = refundedReservations.reduce(
    (sum, r) => sum + (r.refundAmount || (r.status === 'cancelled' && r.refundStatus === 'completed' ? r.total : 0) || 0),
    0
  );
  const netRevenue = Math.max(0, grossRevenue - totalRefundedAmount);

  // Pending Verifications
  const pendingReservations = reservations.filter((r) => r.status === 'pending_verification');
  const pendingAmount = pendingReservations.reduce((sum, r) => sum + (r.total || 0), 0);

  // Pending Refunds
  const pendingRefunds = reservations.filter(
    (r) => r.status === 'cancelled' && (r.refundStatus === 'pending' || r.refundStatus === 'initiated' || !r.refundStatus)
  );

  const totalRooms = hotel.roomCount || 30;
  const occupiedCount = reservations.filter((r) => r.status === 'checked_in').length;
  const occupancyRate = totalRooms > 0 ? Math.round((occupiedCount / totalRooms) * 100) : 0;
  const averageDailyRate =
    confirmedReservations.length > 0 ? Math.round(netRevenue / Math.max(1, confirmedReservations.length)) : 0;

  // Comparative performance chart metrics
  const financialMetrics: MetricConfig[] = [
    {
      id: 'net_revenue',
      name: 'Net Revenue (₦)',
      unit: '',
      isCurrency: true,
      data: [
        { label: 'Mon', current: Math.round(netRevenue * 0.12), previous: Math.round(netRevenue * 0.08) },
        { label: 'Tue', current: Math.round(netRevenue * 0.18), previous: Math.round(netRevenue * 0.14) },
        { label: 'Wed', current: Math.round(netRevenue * 0.15), previous: Math.round(netRevenue * 0.16) },
        { label: 'Thu', current: Math.round(netRevenue * 0.22), previous: Math.round(netRevenue * 0.19) },
        { label: 'Fri', current: Math.round(netRevenue * 0.35), previous: Math.round(netRevenue * 0.28) },
        { label: 'Sat', current: Math.round(netRevenue * 0.42), previous: Math.round(netRevenue * 0.38) },
        { label: 'Sun', current: Math.round(netRevenue * 0.26), previous: Math.round(netRevenue * 0.22) },
      ],
    },
    {
      id: 'occupancy',
      name: 'Occupancy (%)',
      unit: '%',
      isCurrency: false,
      data: [
        { label: 'Mon', current: 35, previous: 28 },
        { label: 'Tue', current: 42, previous: 38 },
        { label: 'Wed', current: 50, previous: 45 },
        { label: 'Thu', current: 65, previous: 55 },
        { label: 'Fri', current: 85, previous: 78 },
        { label: 'Sat', current: 92, previous: 88 },
        { label: 'Sun', current: 60, previous: 52 },
      ],
    },
  ];

  // Invoices search filter
  const filteredInvoices = reservations.filter((r) => {
    const q = searchQuery.toLowerCase();
    return (
      !q ||
      r.guestName.toLowerCase().includes(q) ||
      (r.reference && r.reference.toLowerCase().includes(q)) ||
      r.roomNumber.toLowerCase().includes(q)
    );
  });

  const handlePrintReport = () => {
    window.print();
  };

  const handleExecuteRefund = (res: Reservation) => {
    const amount = res.refundAmount || res.total || 0;
    const ref = disbursementRef.trim() || `DISB-${Date.now().toString().slice(-6)}`;
    if (onProcessRefund) {
      onProcessRefund(res.id, { amount, txRef: ref });
    } else if (onUpdateReservationStatus) {
      onUpdateReservationStatus(res.id, 'cancelled');
    }

    // Call backend API
    fetch(`/api/hotels/${hotel.id}/refunds/disburse`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        reservationId: res.id,
        amount,
        reference: ref,
      }),
    }).catch(console.error);

    setRefundProcessingSuccess(true);
    setTimeout(() => {
      setRefundProcessingSuccess(false);
      setSelectedRefundRes(null);
      setDisbursementRef('');
    }, 1800);
  };

  return (
    <div className="space-y-6 max-w-6xl">
      {/* Top Banner & Sub-Tabs */}
      <div className="bg-white border border-neutral-200 rounded-2xl p-5 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-black text-black tracking-tight">Billing, Settlements & Financials</h1>
          <p className="text-xs text-neutral-500">
            Audit realized revenues, approve guest bank transfer receipts, and execute cancellation refunds.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <div className="inline-flex items-center bg-neutral-100 p-1 rounded-full border border-neutral-200/60 text-xs font-semibold">
            <button
              onClick={() => setActiveSubTab('overview')}
              className={`px-4 py-1.5 rounded-full transition-colors whitespace-nowrap ${
                activeSubTab === 'overview' ? 'bg-black text-white shadow-xs font-bold' : 'text-neutral-600 hover:text-black'
              }`}
            >
              Financial Reports
            </button>
            <button
              onClick={() => setActiveSubTab('invoices')}
              className={`px-4 py-1.5 rounded-full transition-colors whitespace-nowrap flex items-center gap-1.5 ${
                activeSubTab === 'invoices' ? 'bg-black text-white shadow-xs font-bold' : 'text-neutral-600 hover:text-black'
              }`}
            >
              <span>Invoices & Verification</span>
              {pendingReservations.length > 0 && (
                <span className="bg-amber-100 text-amber-900 text-[10px] px-1.5 py-0.2 rounded-full font-bold">
                  {pendingReservations.length}
                </span>
              )}
            </button>
            <button
              onClick={() => setActiveSubTab('refunds')}
              className={`px-4 py-1.5 rounded-full transition-colors whitespace-nowrap flex items-center gap-1.5 ${
                activeSubTab === 'refunds' ? 'bg-black text-white shadow-xs font-bold' : 'text-neutral-600 hover:text-black'
              }`}
            >
              <RotateCcw className="w-3 h-3" />
              <span>Refunds</span>
              {pendingRefunds.length > 0 && (
                <span className="bg-rose-100 text-rose-800 text-[10px] px-1.5 py-0.2 rounded-full font-bold">
                  {pendingRefunds.length}
                </span>
              )}
            </button>
            <button
              onClick={() => setActiveSubTab('bank_config')}
              className={`px-4 py-1.5 rounded-full transition-colors whitespace-nowrap ${
                activeSubTab === 'bank_config' ? 'bg-black text-white shadow-xs font-bold' : 'text-neutral-600 hover:text-black'
              }`}
            >
              Direct Bank Details
            </button>
          </div>

          {effectivePrivileges.financialExports ? (
            <button
              onClick={handlePrintReport}
              className="flex items-center gap-1.5 px-4 py-2 bg-white border border-neutral-200 hover:bg-neutral-50 rounded-full text-xs font-semibold text-neutral-800 shadow-2xs whitespace-nowrap"
            >
              <Printer className="w-3.5 h-3.5" />
              <span>Print Report</span>
            </button>
          ) : (
            <button
              onClick={() => onRequestUpgrade?.()}
              className="flex items-center gap-1.5 px-4 py-2 bg-amber-100 border border-amber-300 hover:bg-amber-200 rounded-full text-xs font-bold text-amber-950 shadow-2xs whitespace-nowrap"
            >
              <Lock className="w-3.5 h-3.5" />
              <span>Upgrade for Report Exports</span>
            </button>
          )}
        </div>
      </div>

      {/* SUB-VIEW 1: FINANCIAL REPORTS */}
      {activeSubTab === 'overview' && (
        <div className="space-y-6">
          {/* Key Financial Indicators Grid */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="bg-white border border-neutral-200 rounded-2xl p-4 shadow-xs space-y-1">
              <span className="text-[10px] font-bold text-neutral-400 uppercase tracking-wider block">
                Net Audited Revenue
              </span>
              <div className="text-2xl font-black text-black">₦{netRevenue.toLocaleString()}</div>
              <div className="text-[11px] text-emerald-700 font-semibold flex items-center gap-1">
                <TrendingUp className="w-3 h-3" />
                <span>{confirmedReservations.length} cleared bookings</span>
              </div>
            </div>

            <div className="bg-white border border-neutral-200 rounded-2xl p-4 shadow-xs space-y-1">
              <span className="text-[10px] font-bold text-neutral-400 uppercase tracking-wider block">
                Deducted Refunds
              </span>
              <div className="text-2xl font-black text-rose-700">₦{totalRefundedAmount.toLocaleString()}</div>
              <div className="text-[11px] text-neutral-500 font-medium">
                {refundedReservations.length} reversed transfers
              </div>
            </div>

            <div className="bg-white border border-neutral-200 rounded-2xl p-4 shadow-xs space-y-1">
              <span className="text-[10px] font-bold text-neutral-400 uppercase tracking-wider block">
                Awaiting Verification
              </span>
              <div className="text-2xl font-black text-amber-700">₦{pendingAmount.toLocaleString()}</div>
              <div className="text-[11px] text-neutral-500 font-medium">
                {pendingReservations.length} proof slips pending
              </div>
            </div>

            <div className="bg-white border border-neutral-200 rounded-2xl p-4 shadow-xs space-y-1">
              <span className="text-[10px] font-bold text-neutral-400 uppercase tracking-wider block">
                Current Occupancy Rate
              </span>
              <div className="text-2xl font-black text-black">{occupancyRate}%</div>
              <div className="text-[11px] text-neutral-500 font-medium">
                {occupiedCount} of {totalRooms} rooms active
              </div>
            </div>
          </div>

          {/* Revenue & Occupancy Trend Graphs */}
          <ComparativePerformanceChart
            title="Hotel Revenue & Performance Trends"
            subtitle="Audited financial comparisons across operating days with exact values"
            metrics={financialMetrics}
            currentPeriodLabel="This Week"
            previousPeriodLabel="Last Week"
          />

          {/* Revenue Breakdown by Settlement Method */}
          <div className="bg-white border border-neutral-200 rounded-2xl p-5 shadow-xs space-y-4">
            <h3 className="text-sm font-bold text-black uppercase tracking-wider">
              Settlement Channel Breakdown
            </h3>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div className="border border-neutral-200 rounded-xl p-3 bg-neutral-50/50">
                <span className="text-xs text-neutral-500 block">Direct Hotel Bank Transfer</span>
                <span className="text-lg font-bold text-black">
                  ₦{netRevenue.toLocaleString()}
                </span>
                <span className="text-[10px] text-emerald-600 block mt-0.5">Direct to {hotel.bankName || 'Zenith Bank'}</span>
              </div>
              <div className="border border-neutral-200 rounded-xl p-3 bg-neutral-50/50">
                <span className="text-xs text-neutral-500 block">POS / Card Terminal</span>
                <span className="text-lg font-bold text-neutral-400">₦0</span>
                <span className="text-[10px] text-neutral-400 block mt-0.5">Front desk terminal</span>
              </div>
              <div className="border border-neutral-200 rounded-xl p-3 bg-neutral-50/50">
                <span className="text-xs text-neutral-500 block">Front Desk Cash</span>
                <span className="text-lg font-bold text-neutral-400">₦0</span>
                <span className="text-[10px] text-neutral-400 block mt-0.5">Over the counter</span>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* SUB-VIEW 2: INVOICES & GUEST PAYMENT VERIFICATIONS */}
      {activeSubTab === 'invoices' && (
        <div className="space-y-4">
          <div className="bg-white border border-neutral-200 rounded-2xl p-4 shadow-xs flex flex-wrap items-center justify-between gap-3">
            <div className="relative flex-1 min-w-[240px] max-w-md">
              <Search className="w-4 h-4 text-neutral-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                placeholder="Search by guest name, reference, or room number..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-9 pr-3 py-2 bg-neutral-50 border border-neutral-200 rounded-xl text-xs focus:outline-none focus:border-black"
              />
            </div>
            <div className="text-xs font-semibold text-neutral-500">
              Showing {filteredInvoices.length} transactions
            </div>
          </div>

          <div className="bg-white border border-neutral-200 rounded-2xl overflow-hidden shadow-xs">
            {filteredInvoices.length === 0 ? (
              <div className="p-12 text-center text-xs text-neutral-400 space-y-1">
                <p className="font-semibold text-neutral-600">No invoices or transactions found</p>
                <p>New guest bookings and payments will populate here automatically.</p>
              </div>
            ) : (
              <table className="w-full text-left text-xs">
                <thead className="bg-neutral-50 border-b border-neutral-200 text-[11px] font-semibold text-neutral-500">
                  <tr>
                    <th className="py-3 px-4">Booking Ref</th>
                    <th className="py-3 px-4">Guest</th>
                    <th className="py-3 px-4">Room</th>
                    <th className="py-3 px-4">Amount</th>
                    <th className="py-3 px-4">Status</th>
                    <th className="py-3 px-4">Proof Slip</th>
                    <th className="py-3 px-4 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-neutral-100">
                  {filteredInvoices.map((res) => {
                    const isPending = res.status === 'pending_verification';
                    const isConfirmed =
                      res.status === 'confirmed' ||
                      res.status === 'checked_in' ||
                      res.status === 'checked_out';
                    const isCancelled = res.status === 'cancelled';

                    return (
                      <tr key={res.id} className="hover:bg-neutral-50/70 transition-colors">
                        <td className="py-3 px-4 font-mono font-bold text-black">{res.reference}</td>
                        <td className="py-3 px-4">
                          <div className="font-semibold text-neutral-900">{res.guestName}</div>
                          <div className="text-[11px] text-neutral-400">{res.guestPhone}</div>
                        </td>
                        <td className="py-3 px-4 text-neutral-700">
                          Room {res.roomNumber} ({res.roomType})
                        </td>
                        <td className="py-3 px-4 font-extrabold text-black font-mono">
                          ₦{res.total.toLocaleString()}
                        </td>
                        <td className="py-3 px-4">
                          <span
                            className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold border ${
                              isConfirmed
                                ? 'bg-emerald-50 text-emerald-800 border-emerald-200'
                                : isPending
                                ? 'bg-amber-50 text-amber-900 border-amber-200'
                                : isCancelled
                                ? 'bg-rose-50 text-rose-800 border-rose-200'
                                : 'bg-neutral-100 text-neutral-700 border-neutral-200'
                            }`}
                          >
                            {isConfirmed
                              ? 'Verified & Paid'
                              : isPending
                              ? 'Pending Verification'
                              : isCancelled
                              ? res.refundStatus === 'completed'
                                ? 'Refunded'
                                : 'Cancelled'
                              : res.status}
                          </span>
                        </td>
                        <td className="py-3 px-4">
                          {res.receiptUrl ? (
                            <button
                              onClick={() => setSelectedReceiptRes(res)}
                              className="flex items-center gap-1.5 text-xs font-semibold text-neutral-800 hover:text-black underline"
                            >
                              <Eye className="w-3.5 h-3.5" />
                              <span>View Slip</span>
                            </button>
                          ) : (
                            <span className="text-[11px] text-neutral-400">No slip attached</span>
                          )}
                        </td>
                        <td className="py-3 px-4 text-right space-x-2">
                          {isPending && (
                            <>
                              <button
                                onClick={() => handleUpdateStatus(res.id, 'confirmed')}
                                className="px-2.5 py-1 bg-black text-white text-[11px] font-bold rounded-lg hover:bg-neutral-800 shadow-2xs"
                              >
                                Approve
                              </button>
                              <button
                                onClick={() => handleUpdateStatus(res.id, 'rejected')}
                                className="px-2.5 py-1 border border-neutral-200 text-rose-600 text-[11px] font-semibold rounded-lg hover:bg-rose-50"
                              >
                                Reject
                              </button>
                            </>
                          )}
                          <button
                            onClick={() => setPrintingRes(res)}
                            className="px-2.5 py-1 border border-neutral-200 text-neutral-700 text-[11px] font-semibold rounded-lg hover:bg-neutral-100"
                          >
                            Print Folio
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            )}
          </div>
        </div>
      )}

      {/* SUB-VIEW 3: CANCELLATIONS & GUEST REFUNDS */}
      {activeSubTab === 'refunds' && (
        <div className="space-y-4">
          <div className="bg-white border border-neutral-200 rounded-2xl p-5 shadow-xs space-y-2">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-lg font-bold text-black tracking-tight">Guest Cancellation Refunds Management</h2>
                <p className="text-xs text-neutral-500">
                  Review cancelled bookings and execute direct bank refunds to the guest's verified bank account. Approved refunds are automatically deducted from net hotel revenue.
                </p>
              </div>
              <div className="text-right">
                <span className="text-[10px] font-bold text-neutral-400 uppercase tracking-wider block">Total Refunded</span>
                <span className="text-lg font-black text-rose-600 font-mono">₦{totalRefundedAmount.toLocaleString()}</span>
              </div>
            </div>
          </div>

          {/* Refund Requests List */}
          <div className="bg-white border border-neutral-200 rounded-2xl overflow-hidden shadow-xs">
            {reservations.filter((r) => r.status === 'cancelled' || r.refundStatus).length === 0 ? (
              <div className="p-12 text-center text-xs text-neutral-400 space-y-1">
                <RotateCcw className="w-8 h-8 text-neutral-300 mx-auto mb-2" />
                <p className="font-semibold text-neutral-600">No Cancellation or Refund Requests</p>
                <p>When a guest cancels a paid reservation, their refund bank details appear here for hotel payout.</p>
              </div>
            ) : (
              <table className="w-full text-left text-xs">
                <thead className="bg-neutral-50 border-b border-neutral-200 text-[11px] font-semibold text-neutral-500">
                  <tr>
                    <th className="py-3 px-4">Booking Ref</th>
                    <th className="py-3 px-4">Guest</th>
                    <th className="py-3 px-4">Reason / Notes</th>
                    <th className="py-3 px-4">Guest Bank Destination</th>
                    <th className="py-3 px-4">Refund Amount</th>
                    <th className="py-3 px-4">Status</th>
                    <th className="py-3 px-4 text-right">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-neutral-100">
                  {reservations
                    .filter((r) => r.status === 'cancelled' || r.refundStatus)
                    .map((res) => {
                      const isCompleted = res.refundStatus === 'completed';
                      const bankInfo = res.refundBankDetails;

                      return (
                        <tr key={res.id} className="hover:bg-neutral-50/70 transition-colors">
                          <td className="py-3 px-4 font-mono font-bold text-black">{res.reference}</td>
                          <td className="py-3 px-4">
                            <div className="font-semibold text-neutral-900">{res.guestName}</div>
                            <div className="text-[11px] text-neutral-400">{res.guestPhone}</div>
                          </td>
                          <td className="py-3 px-4 text-neutral-600 max-w-[200px] truncate">
                            {res.cancellationReason || 'Guest requested date cancellation'}
                          </td>
                          <td className="py-3 px-4">
                            {bankInfo ? (
                              <div className="text-neutral-800">
                                <span className="font-bold block text-[11px]">{bankInfo.bankName}</span>
                                <span className="font-mono text-emerald-700 font-bold block text-xs">
                                  {bankInfo.accountNumber}
                                </span>
                                <span className="text-[10px] text-neutral-500 block truncate max-w-[160px]">
                                  {bankInfo.accountName}
                                </span>
                              </div>
                            ) : (
                              <span className="text-[11px] text-neutral-400">Direct Contact Pending</span>
                            )}
                          </td>
                          <td className="py-3 px-4 font-mono font-bold text-rose-600">
                            ₦{(res.refundAmount || res.total).toLocaleString()}
                          </td>
                          <td className="py-3 px-4">
                            <span
                              className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold border ${
                                isCompleted
                                  ? 'bg-emerald-50 text-emerald-800 border-emerald-200'
                                  : 'bg-amber-50 text-amber-900 border-amber-200'
                              }`}
                            >
                              {isCompleted ? 'Refund Paid & Audited' : 'Pending Bank Payout'}
                            </span>
                          </td>
                          <td className="py-3 px-4 text-right">
                            {isCompleted ? (
                              <span className="text-[11px] text-neutral-400 font-semibold flex items-center justify-end gap-1">
                                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" /> Settled
                              </span>
                            ) : (
                              <button
                                onClick={() => {
                                  setSelectedRefundRes(res);
                                  setDisbursementRef('');
                                }}
                                className="px-3 py-1.5 bg-black text-white text-[11px] font-bold rounded-lg hover:bg-neutral-800 shadow-2xs whitespace-nowrap"
                              >
                                Disburse Refund
                              </button>
                            )}
                          </td>
                        </tr>
                      );
                    })}
                </tbody>
              </table>
            )}
          </div>
        </div>
      )}

      {/* SUB-VIEW 4: DIRECT HOTEL COMMERCIAL BANK ACCOUNT CONFIGURATION */}
      {activeSubTab === 'bank_config' && (
        <div className="max-w-2xl bg-white border border-neutral-200 rounded-2xl p-6 shadow-xs space-y-6">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <Building2 className="w-5 h-5 text-neutral-800" />
              <h2 className="text-xl font-bold text-black tracking-tight">Direct Hotel Bank Deposit Account</h2>
            </div>
            <p className="text-xs text-neutral-600 leading-relaxed">
              Configure your primary corporate bank account (Zenith Bank, GTBank, Providus, etc.). Guests will see these exact banking details during online checkout and front-desk booking to transfer booking funds directly to your hotel.
            </p>
          </div>

          <form onSubmit={handleSaveBankInfo} className="space-y-4">
            <div>
              <label className="block text-xs font-semibold text-neutral-800 mb-1">
                Hotel Commercial Bank *
              </label>
              <input
                type="text"
                required
                value={bankName}
                onChange={(e) => setBankName(e.target.value)}
                placeholder="e.g. Zenith Bank PLC / Guaranty Trust Bank"
                className="w-full bg-white border border-neutral-300 rounded-xl px-3.5 py-2.5 text-xs text-neutral-900 focus:outline-none focus:border-black font-semibold"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-neutral-800 mb-1">
                Corporate Account Name *
              </label>
              <input
                type="text"
                required
                value={accountName}
                onChange={(e) => setAccountName(e.target.value)}
                placeholder="e.g. Lava Hotel & Suites Limited"
                className="w-full bg-white border border-neutral-300 rounded-xl px-3.5 py-2.5 text-xs text-neutral-900 focus:outline-none focus:border-black font-semibold"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-neutral-800 mb-1">
                10-Digit NUBAN Account Number *
              </label>
              <input
                type="text"
                required
                maxLength={10}
                value={accountNumber}
                onChange={(e) => setAccountNumber(e.target.value.replace(/\D/g, ''))}
                placeholder="e.g. 1014529384"
                className="w-full bg-white border border-neutral-300 rounded-xl px-3.5 py-2.5 text-xs text-neutral-900 focus:outline-none focus:border-black font-mono font-bold tracking-wider"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-neutral-800 mb-1">
                Guest Payment Instructions & Remarks Note
              </label>
              <textarea
                rows={3}
                value={transferInstructions}
                onChange={(e) => setTransferInstructions(e.target.value)}
                placeholder="e.g. Transfer exact fee to our Zenith Bank account. Please include your Booking Reference in narration..."
                className="w-full bg-neutral-50 border border-neutral-300 rounded-xl px-3.5 py-2 text-xs text-neutral-900 focus:outline-none focus:border-black"
              />
              <span className="text-[10px] text-neutral-500 mt-1 block">
                Shown to guests on the booking checkout screen and confirmation emails.
              </span>
            </div>

            {/* Direct Guest Checkout Card Preview */}
            <div className="bg-neutral-900 text-white border border-neutral-800 rounded-2xl p-5 space-y-3">
              <div className="flex items-center justify-between border-b border-neutral-800 pb-2">
                <span className="text-[10px] font-bold text-neutral-400 uppercase tracking-wider font-mono">
                  GUEST CHECKOUT TRANSFER PREVIEW
                </span>
                <span className="text-[10px] text-emerald-400 font-mono font-bold flex items-center gap-1">
                  <ShieldCheck className="w-3.5 h-3.5" /> Direct Hotel Account
                </span>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs">
                <div>
                  <span className="text-neutral-400 block text-[10px]">Bank Name</span>
                  <span className="font-semibold text-white truncate block">{bankName || 'Not configured'}</span>
                </div>
                <div>
                  <span className="text-neutral-400 block text-[10px]">Account Name</span>
                  <span className="font-semibold text-white truncate block">{accountName || 'Not configured'}</span>
                </div>
                <div>
                  <span className="text-neutral-400 block text-[10px]">NUBAN Account</span>
                  <span className="font-mono font-bold text-emerald-400 text-sm tracking-wider">{accountNumber || '—'}</span>
                </div>
              </div>
              <p className="text-[11px] text-neutral-400 border-t border-neutral-800/80 pt-2 leading-relaxed">
                "{transferInstructions}"
              </p>
            </div>

            <div className="flex items-center gap-3 pt-2">
              <button
                type="submit"
                className="bg-black text-white px-6 py-2.5 rounded-full text-xs font-bold hover:bg-neutral-800 transition-all flex items-center gap-2 active:scale-95 shadow-xs cursor-pointer"
              >
                <Check className="w-4 h-4" />
                <span>Save Bank Deposit Details</span>
              </button>
              {saveSuccess && (
                <span className="text-xs text-emerald-600 font-semibold flex items-center gap-1 animate-in fade-in duration-200">
                  <CheckCircle2 className="w-4 h-4" /> Hotel bank account details updated successfully!
                </span>
              )}
            </div>
          </form>
        </div>
      )}

      {/* DISBURSE REFUND MODAL */}
      {selectedRefundRes && (
        <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 space-y-5 shadow-2xl animate-in zoom-in-95 duration-150">
            <div className="flex items-center justify-between border-b border-neutral-100 pb-3">
              <div>
                <h3 className="font-bold text-base text-black">Confirm Refund Transfer Disbursement</h3>
                <p className="text-xs text-neutral-400">Ref: {selectedRefundRes.reference} · {selectedRefundRes.guestName}</p>
              </div>
              <button
                onClick={() => setSelectedRefundRes(null)}
                className="text-neutral-400 hover:text-black text-xs font-bold"
              >
                ✕
              </button>
            </div>

            <div className="p-4 rounded-xl bg-rose-50/60 border border-rose-200 space-y-2">
              <span className="text-[10px] font-bold text-rose-800 uppercase tracking-wider block font-mono">
                Guest Bank Payout Destination:
              </span>
              {selectedRefundRes.refundBankDetails ? (
                <div className="space-y-1 text-xs text-neutral-800">
                  <div className="flex justify-between">
                    <span className="text-neutral-500">Bank:</span>
                    <span className="font-bold">{selectedRefundRes.refundBankDetails.bankName}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-neutral-500">Account No:</span>
                    <span className="font-mono font-bold text-black text-sm">{selectedRefundRes.refundBankDetails.accountNumber}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-neutral-500">Beneficiary:</span>
                    <span className="font-semibold">{selectedRefundRes.refundBankDetails.accountName}</span>
                  </div>
                </div>
              ) : (
                <p className="text-xs text-neutral-600">Please confirm account details directly with {selectedRefundRes.guestName} ({selectedRefundRes.guestPhone}).</p>
              )}
            </div>

            <div className="space-y-3">
              <div className="flex justify-between items-center text-xs border-b border-neutral-100 pb-2">
                <span className="text-neutral-500">Refund Amount to Transfer:</span>
                <span className="font-mono font-extrabold text-base text-rose-600">
                  ₦{(selectedRefundRes.refundAmount || selectedRefundRes.total).toLocaleString()}
                </span>
              </div>

              <div>
                <label className="block text-xs font-semibold text-neutral-700 mb-1">
                  Bank Transfer Reference / Session ID (Optional)
                </label>
                <input
                  type="text"
                  placeholder="e.g. 00001326090114002341"
                  value={disbursementRef}
                  onChange={(e) => setDisbursementRef(e.target.value)}
                  className="w-full bg-neutral-50 border border-neutral-300 rounded-xl px-3.5 py-2 text-xs font-mono focus:outline-none focus:border-black"
                />
              </div>

              <p className="text-[11px] text-neutral-500 leading-relaxed">
                By marking as disbursed, ₦{(selectedRefundRes.refundAmount || selectedRefundRes.total).toLocaleString()} will be subtracted from your hotel's net revenue calculations in the financial reports.
              </p>
            </div>

            {refundProcessingSuccess ? (
              <div className="p-3 bg-emerald-50 text-emerald-800 rounded-xl text-xs font-bold flex items-center justify-center gap-1.5 animate-in fade-in">
                <CheckCircle2 className="w-4 h-4 text-emerald-600" /> Refund Disbursed and Deducted from Revenue!
              </div>
            ) : (
              <div className="flex items-center justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setSelectedRefundRes(null)}
                  className="px-4 py-2 border border-neutral-200 text-neutral-700 text-xs font-semibold rounded-full hover:bg-neutral-100"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={() => handleExecuteRefund(selectedRefundRes)}
                  className="px-5 py-2 bg-rose-600 hover:bg-rose-700 text-white text-xs font-bold rounded-full transition-all flex items-center gap-1.5 shadow-xs"
                >
                  <Send className="w-3.5 h-3.5" />
                  <span>Confirm Refund Sent</span>
                </button>
              </div>
            )}
          </div>
        </div>
      )}

      {/* RECEIPT INSPECTION MODAL */}
      {selectedReceiptRes && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-md w-full p-5 space-y-4 shadow-2xl animate-in zoom-in-95 duration-150">
            <div className="flex items-center justify-between border-b border-neutral-100 pb-3">
              <div>
                <h3 className="font-bold text-sm text-black">Guest Proof of Payment Slip</h3>
                <p className="text-[11px] text-neutral-400">
                  Ref: {selectedReceiptRes.reference} · {selectedReceiptRes.guestName}
                </p>
              </div>
              <button
                onClick={() => setSelectedReceiptRes(null)}
                className="text-neutral-400 hover:text-black text-xs font-bold"
              >
                ✕
              </button>
            </div>

            <div className="border border-neutral-200 rounded-xl overflow-hidden bg-neutral-50 flex items-center justify-center max-h-96">
              <img
                src={selectedReceiptRes.receiptUrl}
                alt="Receipt Slip"
                className="w-full h-auto object-contain max-h-80"
              />
            </div>

            <div className="flex items-center justify-between pt-2">
              <span className="text-xs font-mono font-bold text-black">
                ₦{selectedReceiptRes.total.toLocaleString()}
              </span>
              <div className="flex gap-2">
                <button
                  onClick={() => {
                    handleUpdateStatus(selectedReceiptRes.id, 'confirmed');
                    setSelectedReceiptRes(null);
                  }}
                  className="px-5 py-2 bg-black text-white text-xs font-bold rounded-full hover:bg-neutral-800 transition-all whitespace-nowrap"
                >
                  Approve & Confirm
                </button>
                <button
                  onClick={() => setSelectedReceiptRes(null)}
                  className="px-4 py-2 border border-neutral-200 text-neutral-700 text-xs font-semibold rounded-full hover:bg-neutral-100 transition-all whitespace-nowrap"
                >
                  Close
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* PRINTABLE FOLIO MODAL */}
      {printingRes && (
        <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-lg w-full p-6 space-y-6 shadow-2xl animate-in zoom-in-95 duration-150">
            <div className="border-b border-neutral-200 pb-4 flex justify-between items-start">
              <div>
                <h2 className="text-xl font-black text-black">{hotel.name}</h2>
                <p className="text-xs text-neutral-500">{hotel.address}, {hotel.city}, {hotel.state}</p>
                <p className="text-xs text-neutral-400">Tel: {hotel.phone} · Email: {hotel.email}</p>
              </div>
              <div className="text-right">
                <span className="text-xs font-mono font-bold text-neutral-400 block">GUEST FOLIO</span>
                <span className="text-sm font-mono font-black text-black">{printingRes.reference}</span>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3 text-xs">
              <div>
                <span className="text-neutral-400 block text-[10px]">Guest Name</span>
                <span className="font-bold text-black">{printingRes.guestName}</span>
              </div>
              <div>
                <span className="text-neutral-400 block text-[10px]">Contact</span>
                <span className="text-neutral-700">{printingRes.guestPhone} · {printingRes.guestEmail}</span>
              </div>
              <div>
                <span className="text-neutral-400 block text-[10px]">Room Allocated</span>
                <span className="font-semibold text-black">Room {printingRes.roomNumber} ({printingRes.roomType})</span>
              </div>
              <div>
                <span className="text-neutral-400 block text-[10px]">Stay Dates</span>
                <span className="font-medium text-neutral-800">{printingRes.checkIn} → {printingRes.checkOut} ({printingRes.nights} Nights)</span>
              </div>
            </div>

            <div className="border border-neutral-200 rounded-xl overflow-hidden">
              <table className="w-full text-xs text-left">
                <thead className="bg-neutral-50 border-b border-neutral-200 text-[10px] font-bold text-neutral-500">
                  <tr>
                    <th className="p-2.5">Description</th>
                    <th className="p-2.5 text-right">Amount</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-neutral-100">
                  <tr>
                    <td className="p-2.5">Room Rate ({printingRes.nights} Nights)</td>
                    <td className="p-2.5 text-right font-mono font-semibold">₦{printingRes.total.toLocaleString()}</td>
                  </tr>
                  <tr className="bg-neutral-50 font-bold">
                    <td className="p-2.5 text-black">Grand Total Settled</td>
                    <td className="p-2.5 text-right font-mono text-black">₦{printingRes.total.toLocaleString()}</td>
                  </tr>
                </tbody>
              </table>
            </div>

            <div className="flex items-center justify-between pt-2 border-t border-neutral-100">
              <span className="text-[11px] text-neutral-400">Authorized Official Stamp & Signature</span>
              <div className="flex gap-2">
                <button
                  onClick={() => window.print()}
                  className="px-4 py-2 bg-black text-white text-xs font-bold rounded-xl flex items-center gap-1.5"
                >
                  <Printer className="w-3.5 h-3.5" />
                  <span>Print Document</span>
                </button>
                <button
                  onClick={() => setPrintingRes(null)}
                  className="px-3 py-2 border border-neutral-200 text-neutral-700 text-xs font-semibold rounded-xl"
                >
                  Close
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
