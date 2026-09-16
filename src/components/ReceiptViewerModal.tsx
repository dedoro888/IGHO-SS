import React, { useState } from 'react';
import {
  X,
  Download,
  Printer,
  CheckCircle2,
  AlertTriangle,
  Upload,
  ExternalLink,
  ShieldCheck,
  Building,
  FileText,
  CreditCard,
  ZoomIn,
} from 'lucide-react';
import { Reservation, Hotel } from '../types';

interface ReceiptViewerModalProps {
  reservation: Reservation | null;
  hotel: Hotel;
  onClose: () => void;
  onApprove?: (resId: string) => void;
  onReject?: (resId: string, reason: string) => void;
  onUploadReceipt?: (resId: string, receiptUrl: string) => void;
}

export const ReceiptViewerModal: React.FC<ReceiptViewerModalProps> = ({
  reservation,
  hotel,
  onClose,
  onApprove,
  onReject,
  onUploadReceipt,
}) => {
  const [rejectPrompt, setRejectPrompt] = useState(false);
  const [rejectReason, setRejectReason] = useState('Payment amount could not be reconciled with bank statement');
  const [activeTab, setActiveTab] = useState<'preview' | 'details'>('preview');

  if (!reservation) return null;

  const receiptUrl = reservation.receiptUrl || 'https://images.unsplash.com/photo-1554224155-8d04cb21cd6c?auto=format&fit=crop&w=1000&q=80';

  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-xs flex items-center justify-center p-4 overflow-y-auto">
      <div className="bg-white rounded-2xl max-w-2xl w-full shadow-2xl border border-neutral-200 overflow-hidden my-6 animate-in fade-in zoom-in-95">
        {/* Modal Header */}
        <div className="bg-neutral-900 text-white p-5 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-white/10 flex items-center justify-center">
              <FileText className="w-5 h-5 text-emerald-400" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="font-bold text-base text-white">Guest Payment Receipt</h3>
                <span className={`text-[10px] font-bold px-2.5 py-0.5 rounded-full uppercase tracking-wider ${
                  reservation.status === 'confirmed' || reservation.status === 'checked_in'
                    ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30'
                    : reservation.status === 'rejected'
                    ? 'bg-rose-500/20 text-rose-300 border border-rose-500/30'
                    : 'bg-amber-500/20 text-amber-300 border border-amber-500/30'
                }`}>
                  {reservation.status.replace('_', ' ')}
                </span>
              </div>
              <p className="text-xs text-neutral-400">
                Ref: {reservation.reference} • Guest: {reservation.guestName}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={handlePrint}
              title="Print Receipt"
              className="p-2 rounded-full bg-white/10 hover:bg-white/20 text-neutral-300 hover:text-white transition-colors"
            >
              <Printer className="w-4 h-4" />
            </button>
            <button
              onClick={onClose}
              className="p-2 rounded-full bg-white/10 hover:bg-white/20 text-neutral-300 hover:text-white transition-colors"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* View Switcher Tabs */}
        <div className="flex border-b border-neutral-200 bg-neutral-50 px-6 pt-3 gap-2">
          <button
            onClick={() => setActiveTab('preview')}
            className={`px-4 py-2 rounded-full text-xs font-bold transition-colors ${
              activeTab === 'preview'
                ? 'bg-black text-white shadow-xs'
                : 'text-neutral-600 hover:bg-neutral-200/60'
            }`}
          >
            Receipt Document
          </button>
          <button
            onClick={() => setActiveTab('details')}
            className={`px-4 py-2 rounded-full text-xs font-bold transition-colors ${
              activeTab === 'details'
                ? 'bg-black text-white shadow-xs'
                : 'text-neutral-600 hover:bg-neutral-200/60'
            }`}
          >
            Payment Verification Details
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-6 max-h-[65vh] overflow-y-auto space-y-5">
          {activeTab === 'preview' ? (
            <div className="space-y-4">
              {/* Receipt Canvas Card (styled as an authentic Nigerian Bank / IGHO official payment receipt) */}
              <div className="border border-neutral-200 rounded-2xl p-6 bg-linear-to-b from-neutral-50/50 to-white shadow-xs space-y-6">
                {/* Receipt Header */}
                <div className="flex items-start justify-between border-b border-neutral-200 pb-4">
                  <div>
                    <div className="flex items-center gap-2">
                      <div className="w-6 h-6 rounded-md bg-black text-white flex items-center justify-center font-bold text-xs">
                        {hotel.name.charAt(0)}
                      </div>
                      <span className="font-bold text-sm text-black">{hotel.name}</span>
                    </div>
                    <p className="text-[11px] text-neutral-500 mt-1">{hotel.address || 'Hospitality Suites, Lagos'}</p>
                    <p className="text-[10px] text-neutral-400 font-mono">IGHO Stay Verified Property</p>
                  </div>

                  <div className="text-right">
                    <span className="text-[10px] font-bold tracking-wider text-neutral-400 uppercase block">
                      Transaction Slip
                    </span>
                    <span className="font-mono text-xs font-black text-neutral-900">
                      {reservation.paymentRef || `TXN-${reservation.reference}`}
                    </span>
                    <p className="text-[10px] text-neutral-400 mt-0.5">{reservation.createdAt?.split('T')[0] || '2026-09-10'}</p>
                  </div>
                </div>

                {/* Amount Highlight */}
                <div className="bg-neutral-900 text-white rounded-2xl p-4 flex items-center justify-between">
                  <div>
                    <span className="text-[10px] font-semibold text-neutral-400 uppercase tracking-wider block">
                      Paid Amount
                    </span>
                    <div className="text-2xl font-black font-mono">
                      ₦{reservation.total.toLocaleString()}
                    </div>
                  </div>
                  <div className="text-right">
                    <span className="inline-flex items-center gap-1 text-[11px] font-bold bg-emerald-500/20 text-emerald-300 px-3 py-1 rounded-full border border-emerald-500/30">
                      <CheckCircle2 className="w-3.5 h-3.5" />
                      Payment Submitted
                    </span>
                  </div>
                </div>

                {/* Transfer Breakdown */}
                <div className="grid grid-cols-2 gap-4 text-xs">
                  <div className="space-y-1 p-3 rounded-xl bg-neutral-50 border border-neutral-100">
                    <span className="text-[10px] font-bold text-neutral-400 uppercase">Sender (Guest)</span>
                    <div className="font-bold text-neutral-900">{reservation.guestName}</div>
                    <div className="text-neutral-500 text-[11px]">{reservation.guestEmail}</div>
                    <div className="text-neutral-500 text-[11px]">{reservation.guestPhone}</div>
                  </div>

                  <div className="space-y-1 p-3 rounded-xl bg-neutral-50 border border-neutral-100">
                    <span className="text-[10px] font-bold text-neutral-400 uppercase">Receiving Account</span>
                    <div className="font-bold text-neutral-900">{hotel.accountName || 'Lava Hotels Limited'}</div>
                    <div className="text-neutral-700 text-[11px] font-mono font-semibold">
                      {hotel.accountNumber || '1014529384'} ({hotel.bankName || 'Zenith Bank'})
                    </div>
                    <div className="text-emerald-700 text-[10px] font-semibold">Official Business Account</div>
                  </div>
                </div>

                {/* Stay Summary */}
                <div className="border-t border-neutral-100 pt-4 space-y-2 text-xs">
                  <span className="text-[10px] font-bold text-neutral-400 uppercase tracking-wider block">
                    Reservation Particulars
                  </span>
                  <div className="grid grid-cols-3 gap-2 text-[11px]">
                    <div>
                      <span className="text-neutral-400 block">Room</span>
                      <span className="font-bold text-black">Room {reservation.roomNumber} ({reservation.roomType})</span>
                    </div>
                    <div>
                      <span className="text-neutral-400 block">Stay Duration</span>
                      <span className="font-bold text-black">{reservation.nights} Night(s)</span>
                    </div>
                    <div>
                      <span className="text-neutral-400 block">Dates</span>
                      <span className="font-bold text-black">{reservation.checkIn} → {reservation.checkOut}</span>
                    </div>
                  </div>
                </div>

                {/* Attached Slip Preview (if guest provided an image or screenshot) */}
                <div className="space-y-2 border-t border-neutral-100 pt-4">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-neutral-800 flex items-center gap-1.5">
                      <CreditCard className="w-3.5 h-3.5 text-neutral-500" />
                      Attached Guest Evidence / Screenshot
                    </span>
                    <a
                      href={receiptUrl}
                      target="_blank"
                      rel="noreferrer"
                      className="text-[11px] text-blue-600 hover:text-blue-800 font-semibold flex items-center gap-1"
                    >
                      <ExternalLink className="w-3 h-3" />
                      Open Full Size
                    </a>
                  </div>

                  <div className="relative rounded-xl overflow-hidden border border-neutral-200 bg-neutral-100 max-h-56 flex items-center justify-center group">
                    <img
                      src={receiptUrl}
                      alt="Guest Payment Receipt Evidence"
                      className="w-full h-auto max-h-56 object-contain"
                    />
                    <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-2">
                      <a
                        href={receiptUrl}
                        target="_blank"
                        rel="noreferrer"
                        className="px-4 py-1.5 bg-white text-black text-xs font-bold rounded-full shadow-lg flex items-center gap-1 hover:bg-neutral-100"
                      >
                        <ZoomIn className="w-3.5 h-3.5" />
                        Inspect High-Res
                      </a>
                    </div>
                  </div>
                </div>
              </div>

              {/* Upload or Replace Evidence */}
              <div className="flex items-center justify-between p-3 rounded-2xl bg-neutral-50 border border-neutral-200 text-xs">
                <span className="text-neutral-600 font-medium">
                  Need to replace or upload another receipt copy?
                </span>
                <label className="cursor-pointer px-4 py-1.5 rounded-full bg-neutral-900 hover:bg-neutral-800 text-white font-bold text-xs flex items-center gap-1.5 transition-colors">
                  <Upload className="w-3.5 h-3.5" />
                  <span>Upload Receipt</span>
                  <input
                    type="file"
                    accept="image/*"
                    className="hidden"
                    onChange={(e) => {
                      const file = e.target.files?.[0];
                      if (file && onUploadReceipt) {
                        const url = URL.createObjectURL(file);
                        onUploadReceipt(reservation.id, url);
                      }
                    }}
                  />
                </label>
              </div>
            </div>
          ) : (
            /* Details Tab */
            <div className="space-y-4 text-xs">
              <div className="p-4 rounded-2xl bg-neutral-50 border border-neutral-200 space-y-3">
                <h4 className="font-bold text-neutral-900 text-sm">Security & Audit Check</h4>
                <div className="grid grid-cols-2 gap-3 text-xs">
                  <div>
                    <span className="text-neutral-400 block text-[10px] uppercase font-bold">Channel</span>
                    <span className="font-semibold text-neutral-800">
                      {reservation.source || 'Direct Guest Portal / Bank Transfer'}
                    </span>
                  </div>
                  <div>
                    <span className="text-neutral-400 block text-[10px] uppercase font-bold">Verification Method</span>
                    <span className="font-semibold text-neutral-800">Manual Slip & Bank Reconciliation</span>
                  </div>
                  <div>
                    <span className="text-neutral-400 block text-[10px] uppercase font-bold">Booking Reference</span>
                    <span className="font-mono font-bold text-neutral-800">{reservation.reference}</span>
                  </div>
                  <div>
                    <span className="text-neutral-400 block text-[10px] uppercase font-bold">System Status</span>
                    <span className="font-bold capitalize text-neutral-800">{reservation.status.replace('_', ' ')}</span>
                  </div>
                </div>
              </div>

              <div className="p-4 rounded-2xl bg-blue-50/60 border border-blue-200 text-blue-950 space-y-1">
                <div className="font-bold text-xs flex items-center gap-1.5 text-blue-900">
                  <ShieldCheck className="w-4 h-4 text-blue-600" />
                  IGHO Hotel Protection Policy
                </div>
                <p className="text-[11px] text-blue-800 leading-relaxed">
                  Only confirm payments once the credited amount matches your official hotel corporate account balance.
                  Confirming this receipt will automatically update the reservation to <strong>Confirmed</strong> and reserve the room.
                </p>
              </div>
            </div>
          )}

          {/* Rejection Prompt form */}
          {rejectPrompt && (
            <div className="p-4 rounded-2xl bg-rose-50 border border-rose-200 space-y-3 animate-in fade-in">
              <div className="flex items-center gap-2 text-rose-800 font-bold text-xs">
                <AlertTriangle className="w-4 h-4 text-rose-600" />
                Reject Receipt & Decline Payment
              </div>
              <div className="space-y-1">
                <label className="text-[11px] font-semibold text-rose-900 block">Reason for Rejection</label>
                <input
                  type="text"
                  value={rejectReason}
                  onChange={(e) => setRejectReason(e.target.value)}
                  className="w-full px-4 py-2 rounded-full border border-rose-300 text-xs bg-white text-rose-950 focus:outline-none focus:border-rose-600"
                />
              </div>
              <div className="flex items-center justify-end gap-2 pt-1">
                <button
                  type="button"
                  onClick={() => setRejectPrompt(false)}
                  className="px-4 py-1.5 rounded-full border border-neutral-300 text-xs font-semibold text-neutral-700 hover:bg-white"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={() => {
                    if (onReject) onReject(reservation.id, rejectReason);
                    onClose();
                  }}
                  className="px-5 py-1.5 rounded-full bg-rose-600 hover:bg-rose-700 text-white text-xs font-bold shadow-xs"
                >
                  Confirm Rejection
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Modal Actions Footer */}
        <div className="p-4 bg-neutral-50 border-t border-neutral-200 flex flex-wrap items-center justify-between gap-3">
          <button
            type="button"
            onClick={onClose}
            className="px-5 py-2 rounded-full border border-neutral-300 text-xs font-bold text-neutral-700 hover:bg-neutral-100 transition-colors"
          >
            Close
          </button>

          <div className="flex items-center gap-2">
            {!rejectPrompt && onReject && reservation.status !== 'rejected' && (
              <button
                type="button"
                onClick={() => setRejectPrompt(true)}
                className="px-4 py-2 rounded-full border border-rose-300 text-rose-700 hover:bg-rose-50 text-xs font-bold transition-colors"
              >
                Reject Receipt
              </button>
            )}

            {onApprove && reservation.status !== 'confirmed' && reservation.status !== 'checked_in' && (
              <button
                type="button"
                onClick={() => {
                  onApprove(reservation.id);
                  onClose();
                }}
                className="px-6 py-2 rounded-full bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold shadow-xs flex items-center gap-1.5 transition-colors"
              >
                <CheckCircle2 className="w-4 h-4" />
                <span>Approve Receipt & Confirm Booking</span>
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
