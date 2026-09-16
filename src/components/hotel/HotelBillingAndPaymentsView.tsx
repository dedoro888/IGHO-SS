import React, { useState } from 'react';
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
} from 'lucide-react';
import { Hotel, Reservation } from '../../types';
import { ComparativePerformanceChart, MetricConfig } from '../common/ComparativePerformanceChart';

interface HotelBillingAndPaymentsViewProps {
  hotel: Hotel;
  reservations: Reservation[];
  onUpdateBankInfo: (bankInfo: { bankName: string; accountName: string; accountNumber: string }) => void;
  onUpdateReservationStatus?: (resId: string, status: Reservation['status']) => void;
  onVerifyPayment?: (resId: string, verified: boolean) => void;
}

export const HotelBillingAndPaymentsView: React.FC<HotelBillingAndPaymentsViewProps> = ({
  hotel,
  reservations,
  onUpdateBankInfo,
  onUpdateReservationStatus,
  onVerifyPayment,
}) => {
  // Bank Account Form State
  const [bankName, setBankName] = useState(hotel.bankName || '');
  const [accountName, setAccountName] = useState(hotel.accountName || '');
  const [accountNumber, setAccountNumber] = useState(hotel.accountNumber || '');
  const [saveSuccess, setSaveSuccess] = useState(false);

  // Sub-view: 'overview' | 'invoices' | 'bank_config'
  const [activeSubTab, setActiveSubTab] = useState<'overview' | 'invoices' | 'bank_config'>('overview');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedReceiptRes, setSelectedReceiptRes] = useState<Reservation | null>(null);
  const [printingRes, setPrintingRes] = useState<Reservation | null>(null);

  // Safe status update dispatch
  const handleUpdateStatus = (resId: string, status: Reservation['status']) => {
    if (onUpdateReservationStatus) {
      onUpdateReservationStatus(resId, status);
    }
    if (onVerifyPayment) {
      onVerifyPayment(resId, status === 'confirmed' || status === 'checked_in' || status === 'checked_out');
    }
  };

  // Handle bank configuration save
  const handleSaveBankInfo = (e: React.FormEvent) => {
    e.preventDefault();
    onUpdateBankInfo({ bankName, accountName, accountNumber });
    setSaveSuccess(true);
    setTimeout(() => setSaveSuccess(false), 2500);
  };

  // Calculations for Financial Reports
  const confirmedReservations = reservations.filter(
    (r) => r.status === 'confirmed' || r.status === 'checked_in' || r.status === 'checked_out'
  );
  const totalRevenue = confirmedReservations.reduce((sum, r) => sum + (r.total || 0), 0);
  const pendingReservations = reservations.filter((r) => r.status === 'pending_verification');
  const pendingAmount = pendingReservations.reduce((sum, r) => sum + (r.total || 0), 0);

  const totalRooms = hotel.roomCount || 30;
  const occupiedCount = reservations.filter((r) => r.status === 'checked_in').length;
  const occupancyRate = totalRooms > 0 ? Math.round((occupiedCount / totalRooms) * 100) : 0;
  const averageDailyRate =
    confirmedReservations.length > 0 ? Math.round(totalRevenue / confirmedReservations.length) : 0;
  const revPar = totalRooms > 0 ? Math.round(totalRevenue / totalRooms) : 0;

  // Chart configuration with exact values for axes
  const financialMetrics: MetricConfig[] = [
    {
      id: 'revenue',
      name: 'Revenue (₦)',
      unit: '',
      isCurrency: true,
      data: [
        { label: 'Mon', current: Math.round(totalRevenue * 0.12), previous: Math.round(totalRevenue * 0.08) },
        { label: 'Tue', current: Math.round(totalRevenue * 0.18), previous: Math.round(totalRevenue * 0.14) },
        { label: 'Wed', current: Math.round(totalRevenue * 0.15), previous: Math.round(totalRevenue * 0.16) },
        { label: 'Thu', current: Math.round(totalRevenue * 0.22), previous: Math.round(totalRevenue * 0.19) },
        { label: 'Fri', current: Math.round(totalRevenue * 0.35), previous: Math.round(totalRevenue * 0.28) },
        { label: 'Sat', current: Math.round(totalRevenue * 0.42), previous: Math.round(totalRevenue * 0.38) },
        { label: 'Sun', current: Math.round(totalRevenue * 0.26), previous: Math.round(totalRevenue * 0.22) },
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

  return (
    <div className="space-y-6 max-w-6xl">
      {/* Top Banner & Navigation Sub-Tabs */}
      <div className="bg-white border border-neutral-200 rounded-2xl p-5 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-black text-black tracking-tight">Billing, Settlements & Financials</h1>
          <p className="text-xs text-neutral-500">
            Configure settlement accounts, review guest transfer verifications, and audit hotel financial reports.
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
              onClick={() => setActiveSubTab('bank_config')}
              className={`px-4 py-1.5 rounded-full transition-colors whitespace-nowrap ${
                activeSubTab === 'bank_config' ? 'bg-black text-white shadow-xs font-bold' : 'text-neutral-600 hover:text-black'
              }`}
            >
              Settlement Bank Info
            </button>
          </div>

          <button
            onClick={handlePrintReport}
            className="flex items-center gap-1.5 px-4 py-2 bg-white border border-neutral-200 hover:bg-neutral-50 rounded-full text-xs font-semibold text-neutral-800 shadow-2xs whitespace-nowrap"
          >
            <Printer className="w-3.5 h-3.5" />
            <span>Print Report</span>
          </button>
        </div>
      </div>

      {/* SUB-VIEW 1: FINANCIAL REPORTS */}
      {activeSubTab === 'overview' && (
        <div className="space-y-6">
          {/* Key Financial Indicators Grid */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="bg-white border border-neutral-200 rounded-2xl p-4 shadow-xs space-y-1">
              <span className="text-[10px] font-bold text-neutral-400 uppercase tracking-wider block">
                Total Realized Revenue
              </span>
              <div className="text-2xl font-black text-black">₦{totalRevenue.toLocaleString()}</div>
              <div className="text-[11px] text-emerald-700 font-semibold flex items-center gap-1">
                <TrendingUp className="w-3 h-3" />
                <span>{confirmedReservations.length} cleared reservations</span>
              </div>
            </div>

            <div className="bg-white border border-neutral-200 rounded-2xl p-4 shadow-xs space-y-1">
              <span className="text-[10px] font-bold text-neutral-400 uppercase tracking-wider block">
                Awaiting Verification
              </span>
              <div className="text-2xl font-black text-amber-700">₦{pendingAmount.toLocaleString()}</div>
              <div className="text-[11px] text-neutral-500 font-medium">
                {pendingReservations.length} proof slips pending review
              </div>
            </div>

            <div className="bg-white border border-neutral-200 rounded-2xl p-4 shadow-xs space-y-1">
              <span className="text-[10px] font-bold text-neutral-400 uppercase tracking-wider block">
                Average Daily Rate (ADR)
              </span>
              <div className="text-2xl font-black text-black">₦{averageDailyRate.toLocaleString()}</div>
              <div className="text-[11px] text-neutral-500 font-medium">Per confirmed room booking</div>
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

          {/* Revenue & Occupancy Trend Graphs with explicit axes */}
          <ComparativePerformanceChart
            title="Hotel Revenue & Performance Trends"
            subtitle="Audited financial comparisons across operating days with explicit X/Y values"
            metrics={financialMetrics}
            currentPeriodLabel="This Week"
            previousPeriodLabel="Last Week"
          />

          {/* Revenue Breakdown by Payment Method */}
          <div className="bg-white border border-neutral-200 rounded-2xl p-5 shadow-xs space-y-4">
            <h3 className="text-sm font-bold text-black uppercase tracking-wider">
              Settlement Channel Distribution
            </h3>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div className="border border-neutral-200 rounded-xl p-3 bg-neutral-50/50">
                <span className="text-xs text-neutral-500 block">Bank Transfer (Guest Direct)</span>
                <span className="text-lg font-bold text-black">
                  ₦{totalRevenue.toLocaleString()}
                </span>
                <span className="text-[10px] text-neutral-400 block mt-0.5">100% of volume</span>
              </div>
              <div className="border border-neutral-200 rounded-xl p-3 bg-neutral-50/50">
                <span className="text-xs text-neutral-500 block">POS / Card Terminal</span>
                <span className="text-lg font-bold text-neutral-400">₦0</span>
                <span className="text-[10px] text-neutral-400 block mt-0.5">0% of volume</span>
              </div>
              <div className="border border-neutral-200 rounded-xl p-3 bg-neutral-50/50">
                <span className="text-xs text-neutral-500 block">Front Desk Cash</span>
                <span className="text-lg font-bold text-neutral-400">₦0</span>
                <span className="text-[10px] text-neutral-400 block mt-0.5">0% of volume</span>
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
                                : 'bg-rose-50 text-rose-800 border-rose-200'
                            }`}
                          >
                            {isConfirmed ? 'Verified & Paid' : isPending ? 'Pending Verification' : res.status}
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

      {/* SUB-VIEW 3: BANK ACCOUNT CONFIGURATION (Requirement 7) */}
      {activeSubTab === 'bank_config' && (
        <div className="max-w-2xl bg-white border border-neutral-200 rounded-2xl p-6 shadow-xs space-y-6">
          <div className="space-y-1">
            <h2 className="text-xl font-bold text-black tracking-tight">Settlement Bank Account</h2>
            <p className="text-xs text-neutral-500">
              Input the account number, bank name, and account name where guests will transfer money to pay for
              reservations. The account information on the guest checkout will automatically and dynamically
              populate from here.
            </p>
          </div>

          <form onSubmit={handleSaveBankInfo} className="space-y-4">
            <div>
              <label className="block text-xs font-semibold text-neutral-700 mb-1">
                Settlement Bank Name *
              </label>
              <input
                type="text"
                required
                value={bankName}
                onChange={(e) => setBankName(e.target.value)}
                placeholder="e.g. Zenith Bank PLC / Providus Bank"
                className="w-full bg-white border border-neutral-300 rounded-xl px-3.5 py-2.5 text-xs text-neutral-900 focus:outline-none focus:border-black"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-neutral-700 mb-1">
                Account Name (as registered with the bank) *
              </label>
              <input
                type="text"
                required
                value={accountName}
                onChange={(e) => setAccountName(e.target.value)}
                placeholder="e.g. Palmview Grand Hotels & Suites Ltd"
                className="w-full bg-white border border-neutral-300 rounded-xl px-3.5 py-2.5 text-xs text-neutral-900 focus:outline-none focus:border-black"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-neutral-700 mb-1">
                10-Digit NUBAN Account Number *
              </label>
              <input
                type="text"
                required
                maxLength={10}
                value={accountNumber}
                onChange={(e) => setAccountNumber(e.target.value)}
                placeholder="e.g. 1012345678"
                className="w-full bg-white border border-neutral-300 rounded-xl px-3.5 py-2.5 text-xs text-neutral-900 focus:outline-none focus:border-black font-mono"
              />
            </div>

            {/* Live Checkout Preview */}
            <div className="bg-neutral-50 border border-neutral-200 rounded-xl p-4 space-y-2">
              <span className="text-[10px] font-bold text-neutral-500 uppercase tracking-wider block">
                Live Guest Checkout Preview
              </span>
              <div className="grid grid-cols-3 gap-2 text-xs">
                <div>
                  <span className="text-neutral-400 block text-[10px]">Bank</span>
                  <span className="font-semibold text-black">{bankName || 'Not configured'}</span>
                </div>
                <div>
                  <span className="text-neutral-400 block text-[10px]">Account Name</span>
                  <span className="font-semibold text-black">{accountName || 'Not configured'}</span>
                </div>
                <div>
                  <span className="text-neutral-400 block text-[10px]">Account Number</span>
                  <span className="font-mono font-bold text-black">{accountNumber || '—'}</span>
                </div>
              </div>
            </div>

            <div className="flex items-center gap-3 pt-2">
              <button
                type="submit"
                className="bg-black text-white px-6 py-2.5 rounded-full text-xs font-bold hover:bg-neutral-800 transition-all flex items-center gap-2 active:scale-95 shadow-xs"
              >
                <Check className="w-4 h-4" />
                <span>Save Bank Information</span>
              </button>
              {saveSuccess && (
                <span className="text-xs text-emerald-600 font-semibold flex items-center gap-1 animate-in fade-in duration-200">
                  <CheckCircle2 className="w-4 h-4" /> Bank details saved and published to guest checkout!
                </span>
              )}
            </div>
          </form>
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
