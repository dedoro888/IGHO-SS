import React, { useState, useEffect } from 'react';
import {
  FileText,
  CreditCard,
  Plus,
  RotateCcw,
  ShieldAlert,
  CheckCircle2,
  AlertTriangle,
  User,
  Building,
  DollarSign,
  Tag,
  ArrowRight,
  Split,
  Layers,
} from 'lucide-react';
import { Hotel, GuestFolio, FolioCharge, LinkedReversal, RefundRequest } from '../../types';

interface FolioBillingViewProps {
  hotel: Hotel;
}

export const FolioBillingView: React.FC<FolioBillingViewProps> = ({ hotel }) => {
  const [folios, setFolios] = useState<GuestFolio[]>([]);
  const [selectedFolio, setSelectedFolio] = useState<GuestFolio | null>(null);
  const [refunds, setRefunds] = useState<RefundRequest[]>([]);

  // Modals
  const [postChargeModal, setPostChargeModal] = useState(false);
  const [reversalModal, setReversalModal] = useState(false);
  const [reversingCharge, setReversingCharge] = useState<FolioCharge | null>(null);
  const [refundRequestModal, setRefundRequestModal] = useState(false);

  // Form states
  const [chargeDesc, setChargeDesc] = useState('Restaurant Dinner & Room Service');
  const [chargeCat, setChargeCat] = useState<'room' | 'food_beverage' | 'laundry' | 'caution_deposit' | 'other'>('food_beverage');
  const [chargeAmount, setChargeAmount] = useState<number>(15000);

  const [reversalReason, setReversalReason] = useState('Duplicate room service posting corrected by management authorization');
  const [reversalApprover, setReversalApprover] = useState('finance@lavahotel.com');

  const [refundAmount, setRefundAmount] = useState<number>(20000);
  const [refundReason, setRefundReason] = useState('Caution deposit refund after room checkout inspection');
  const [refundRequester, setRefundRequester] = useState('receptionist@lavahotel.com');
  const [approverEmailInput, setApproverEmailInput] = useState('manager@lavahotel.com');
  const [dualControlError, setDualControlError] = useState<string | null>(null);

  const fetchFolios = async () => {
    try {
      const res = await fetch(`/api/hotels/${hotel.id}/folios`);
      if (res.ok) {
        const d = await res.json();
        const fList = d.folios || [];
        setFolios(fList);
        if (fList.length > 0 && !selectedFolio) {
          setSelectedFolio(fList[0]);
        }
      }
    } catch (e) {
      console.error(e);
    }
  };

  const fetchRefunds = async () => {
    try {
      const res = await fetch(`/api/hotels/${hotel.id}/refunds`);
      if (res.ok) {
        const d = await res.json();
        setRefunds(d.refunds || []);
      }
    } catch (e) {
      console.error(e);
    }
  };

  useEffect(() => {
    fetchFolios();
    fetchRefunds();
  }, [hotel.id]);

  // Seed sample folios if none exist so user can immediately test split billing and reversals
  useEffect(() => {
    if (folios.length === 0) {
      const sampleFolios: GuestFolio[] = [
        {
          id: 'fol-001',
          hotelId: hotel.id,
          reservationId: 'RES-LAVA-101',
          folioType: 'room',
          folioNumber: 'FOL-2026-00001',
          guestName: 'Dr. Chidi Obi',
          guestEmail: 'chidi@lavahotel.com',
          roomNumber: '101',
          charges: [
            {
              id: 'chg-101',
              folioId: 'fol-001',
              date: '2026-11-09T14:00:00Z',
              description: 'Executive Suite - Night 1',
              category: 'room',
              amount: 85000,
              postedBy: 'System Auto-Post',
              businessDate: '2026-11-09',
            },
            {
              id: 'chg-102',
              folioId: 'fol-001',
              date: '2026-11-09T14:00:00Z',
              description: 'FIRS Value Added Tax (VAT 7.5%)',
              category: 'vat',
              amount: 6375,
              postedBy: 'System Auto-Post',
              businessDate: '2026-11-09',
            },
            {
              id: 'chg-103',
              folioId: 'fol-001',
              date: '2026-11-09T14:00:00Z',
              description: 'State Hotel Consumption Tax (5%)',
              category: 'consumption_tax',
              amount: 4250,
              postedBy: 'System Auto-Post',
              businessDate: '2026-11-09',
            },
            {
              id: 'chg-104',
              folioId: 'fol-001',
              date: '2026-11-09T16:30:00Z',
              description: 'Mini Bar & Fruit Basket',
              category: 'food_beverage',
              amount: 12000,
              postedBy: 'Front Desk',
              businessDate: '2026-11-09',
            },
          ],
          payments: [
            {
              id: 'pay-101',
              folioId: 'fol-001',
              date: '2026-11-09T14:10:00Z',
              amount: 95625,
              method: 'paystack',
              receiptNumber: 'RCP-2026-00101',
              receivedBy: 'Online Gateway',
              businessDate: '2026-11-09',
            },
          ],
          reversals: [],
          totalCharges: 107625,
          totalPayments: 95625,
          balanceDue: 12000,
          status: 'open',
          createdAt: '2026-11-09T14:00:00Z',
          updatedAt: '2026-11-09T16:30:00Z',
        },
        {
          id: 'fol-002',
          hotelId: hotel.id,
          reservationId: 'RES-LAVA-101',
          folioType: 'corporate_split',
          folioNumber: 'FOL-2026-00002',
          guestName: 'AeroTech Systems Nig Ltd (Master Bill)',
          guestEmail: 'accounts@aerotech.ng',
          roomNumber: '101',
          charges: [
            {
              id: 'chg-201',
              folioId: 'fol-002',
              date: '2026-11-09T10:00:00Z',
              description: 'Conference Room Rental & AV Projector',
              category: 'other',
              amount: 150000,
              postedBy: 'Events Manager',
              businessDate: '2026-11-09',
            },
          ],
          payments: [],
          reversals: [],
          totalCharges: 150000,
          totalPayments: 0,
          balanceDue: 150000,
          status: 'open',
          createdAt: '2026-11-09T10:00:00Z',
          updatedAt: '2026-11-09T10:00:00Z',
        },
      ];
      setFolios(sampleFolios);
      setSelectedFolio(sampleFolios[0]);
    }
  }, [folios]);

  // Execute append-only linked reversal
  const handleExecuteReversal = async () => {
    if (!selectedFolio || !reversingCharge) return;
    try {
      const res = await fetch(`/api/hotels/${hotel.id}/folios/reversal`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          folioId: selectedFolio.id,
          chargeId: reversingCharge.id,
          reversalReason,
          approverEmail: reversalApprover,
          requestedBy: 'Front Desk Cashier',
        }),
      });

      if (res.ok) {
        const d = await res.json();
        setReversalModal(false);
        setReversingCharge(null);
        fetchFolios();
        if (d.folio) setSelectedFolio(d.folio);
      }
    } catch (e) {
      console.error(e);
    }
  };

  // Submit refund request
  const handleSubmitRefund = async () => {
    if (!selectedFolio) return;
    try {
      const res = await fetch(`/api/hotels/${hotel.id}/refunds/request`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          reservationId: selectedFolio.reservationId,
          guestName: selectedFolio.guestName,
          guestEmail: selectedFolio.guestEmail,
          amount: refundAmount,
          reason: refundReason,
          requesterEmail: refundRequester,
          requesterName: 'Front Desk Staff',
        }),
      });

      if (res.ok) {
        setRefundRequestModal(false);
        fetchRefunds();
      }
    } catch (e) {
      console.error(e);
    }
  };

  // Approve refund (enforces separation of duties)
  const handleApproveRefund = async (refundId: string) => {
    setDualControlError(null);
    try {
      const res = await fetch(`/api/hotels/${hotel.id}/refunds/${refundId}/approve`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          approverEmail: approverEmailInput,
          approvalAction: 'approve',
        }),
      });

      const d = await res.json();
      if (!res.ok) {
        setDualControlError(d.message || 'Refund approval failed.');
      } else {
        fetchRefunds();
      }
    } catch (e: any) {
      setDualControlError(e.message);
    }
  };

  return (
    <div className="space-y-6 text-neutral-900 pb-12">
      {/* Header Banner */}
      <div className="bg-white border border-neutral-200 rounded-3xl p-6 sm:p-7 shadow-3xs flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <span className="text-[10px] font-bold text-neutral-400 uppercase tracking-widest block font-mono">
            Enterprise Financial Accounting
          </span>
          <h2 className="text-xl font-black text-black">
            Guest Folios & Append-Only Financial Ledgers
          </h2>
          <p className="text-xs text-neutral-500 mt-0.5">
            Decoupled folios support shared, group, and corporate split billing. Ledger entries are strictly immutable with linked corrections.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => setRefundRequestModal(true)}
            className="flex items-center gap-1.5 px-4 py-2 rounded-full border border-neutral-300 hover:bg-neutral-50 text-xs font-bold text-neutral-800 transition-colors cursor-pointer"
          >
            <RotateCcw className="w-3.5 h-3.5 text-neutral-500" />
            <span>Request Deposit Refund</span>
          </button>
        </div>
      </div>

      {/* Main Folio Management Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Folios Directory (Left 4 cols) */}
        <div className="lg:col-span-4 bg-white border border-neutral-200 rounded-3xl p-5 shadow-3xs space-y-4">
          <div className="flex items-center justify-between border-b border-neutral-100 pb-3">
            <span className="text-xs font-bold uppercase tracking-wider text-neutral-500">Active Guest Folios</span>
            <span className="text-[10px] font-mono font-bold px-2 py-0.5 bg-neutral-100 rounded-full">
              {folios.length} Folios
            </span>
          </div>

          <div className="space-y-2">
            {folios.map((f) => {
              const isSelected = selectedFolio?.id === f.id;
              return (
                <button
                  key={f.id}
                  onClick={() => setSelectedFolio(f)}
                  className={`w-full text-left p-3.5 rounded-2xl border transition-all cursor-pointer ${
                    isSelected
                      ? 'bg-black text-white border-black shadow-md'
                      : 'bg-neutral-50 hover:bg-neutral-100/80 border-neutral-200/80 text-neutral-900'
                  }`}
                >
                  <div className="flex items-start justify-between">
                    <div>
                      <span className={`text-[10px] font-mono font-bold block ${isSelected ? 'text-neutral-300' : 'text-neutral-500'}`}>
                        {f.folioNumber} · Room {f.roomNumber}
                      </span>
                      <h4 className="text-xs font-bold mt-0.5 truncate max-w-[190px]">{f.guestName}</h4>
                    </div>
                    <span className={`text-[9px] font-mono px-2 py-0.5 rounded-full uppercase font-bold ${
                      isSelected ? 'bg-neutral-800 text-neutral-200' : 'bg-neutral-200 text-neutral-700'
                    }`}>
                      {f.folioType}
                    </span>
                  </div>

                  <div className="flex items-center justify-between mt-3 pt-2 border-t border-neutral-200/40 text-[11px] font-mono">
                    <span className={isSelected ? 'text-neutral-400' : 'text-neutral-500'}>Balance Due:</span>
                    <strong className={`font-black ${f.balanceDue > 0 ? (isSelected ? 'text-rose-300' : 'text-rose-600') : (isSelected ? 'text-emerald-300' : 'text-emerald-600')}`}>
                      ₦{f.balanceDue.toLocaleString()}
                    </strong>
                  </div>
                </button>
              );
            })}
          </div>
        </div>

        {/* Selected Folio Detail View (Right 8 cols) */}
        {selectedFolio ? (
          <div className="lg:col-span-8 bg-white border border-neutral-200 rounded-3xl p-6 shadow-3xs space-y-6">
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 border-b border-neutral-100 pb-4">
              <div>
                <div className="flex items-center gap-2">
                  <span className="text-xs font-mono font-bold text-neutral-400">
                    {selectedFolio.folioNumber}
                  </span>
                  <span className="text-[10px] font-bold px-2 py-0.5 bg-neutral-100 rounded-full text-neutral-700 uppercase">
                    {selectedFolio.folioType.replace('_', ' ')}
                  </span>
                </div>
                <h3 className="text-lg font-black text-black mt-0.5">
                  {selectedFolio.guestName} — Room {selectedFolio.roomNumber}
                </h3>
              </div>

              <div className="text-right font-mono">
                <span className="text-[10px] text-neutral-400 font-bold uppercase block">Net Balance Due</span>
                <span className={`text-2xl font-black ${selectedFolio.balanceDue > 0 ? 'text-rose-600' : 'text-emerald-600'}`}>
                  ₦{selectedFolio.balanceDue.toLocaleString()}
                </span>
              </div>
            </div>

            {/* Charges Table (Immutable & Append-Only) */}
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <h4 className="text-xs font-bold text-black uppercase tracking-wider flex items-center gap-1.5">
                  <Tag className="w-3.5 h-3.5 text-neutral-500" />
                  <span>Itemized Charges (Append-Only Ledger)</span>
                </h4>
              </div>

              <div className="overflow-x-auto border border-neutral-200 rounded-2xl">
                <table className="w-full text-left text-xs">
                  <thead className="bg-neutral-50 border-b border-neutral-200 text-[10px] font-bold uppercase text-neutral-500">
                    <tr>
                      <th className="p-3">Charge ID</th>
                      <th className="p-3">Description</th>
                      <th className="p-3">Category</th>
                      <th className="p-3 text-right">Amount</th>
                      <th className="p-3 text-right">Correction</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-neutral-100 font-mono text-[11px]">
                    {selectedFolio.charges.map((c) => (
                      <tr key={c.id} className={c.isReversed ? 'bg-neutral-50 text-neutral-400 line-through' : 'hover:bg-neutral-50/50'}>
                        <td className="p-3 font-bold text-neutral-600">{c.id.slice(-6)}</td>
                        <td className="p-3 font-sans font-semibold text-neutral-900">{c.description}</td>
                        <td className="p-3 uppercase text-[10px] text-neutral-500">{c.category}</td>
                        <td className="p-3 text-right font-bold text-black">₦{c.amount.toLocaleString()}</td>
                        <td className="p-3 text-right font-sans">
                          {c.isReversed ? (
                            <span className="text-[10px] font-bold text-rose-700 bg-rose-50 border border-rose-200 px-2 py-0.5 rounded-full">
                              Reversed
                            </span>
                          ) : (
                            <button
                              onClick={() => {
                                setReversingCharge(c);
                                setReversalModal(true);
                              }}
                              className="px-2.5 py-1 rounded-lg bg-neutral-100 hover:bg-rose-50 text-neutral-700 hover:text-rose-700 text-[10px] font-bold transition-colors cursor-pointer"
                            >
                              Linked Reversal
                            </button>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Linked Reversals History */}
            {selectedFolio.reversals && selectedFolio.reversals.length > 0 && (
              <div className="p-4 bg-rose-50/60 border border-rose-200/80 rounded-2xl space-y-2 text-xs">
                <span className="text-[10px] font-bold text-rose-800 uppercase tracking-widest block">
                  Audited Financial Reversals (Dual-Signed)
                </span>
                {selectedFolio.reversals.map((rev) => (
                  <div key={rev.id} className="flex justify-between items-center text-[11px] font-mono border-b border-rose-200/40 pb-1.5 last:border-0 last:pb-0">
                    <div>
                      <span className="font-bold text-rose-900">{rev.reason}</span>
                      <span className="text-[10px] text-neutral-500 block font-sans">
                        Approved by {rev.approverEmail} at {new Date(rev.approvedAt).toLocaleTimeString()}
                      </span>
                    </div>
                    <strong className="text-rose-700 font-black">
                      -₦{Math.abs(rev.amount).toLocaleString()}
                    </strong>
                  </div>
                ))}
              </div>
            )}
          </div>
        ) : (
          <div className="lg:col-span-8 bg-neutral-50 border border-neutral-200 rounded-3xl p-12 text-center text-neutral-400 text-xs">
            Select a folio to inspect itemized line items and execute adjustments.
          </div>
        )}
      </div>

      {/* ─── LINKED REVERSAL MODAL ─── */}
      {reversalModal && reversingCharge && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white border border-neutral-200 rounded-3xl p-6 sm:p-7 max-w-md w-full shadow-2xl space-y-4 animate-in zoom-in-95">
            <h3 className="text-base font-black text-black">Execute Linked Financial Reversal</h3>
            <p className="text-xs text-neutral-500 leading-relaxed">
              Financial records are append-only. Instead of deleting or editing charges, a linked negative line item is created with an audit trail, explanation, and authorized manager approver.
            </p>

            <div className="p-3 bg-neutral-50 border border-neutral-200 rounded-xl text-xs font-mono">
              <span className="text-[10px] text-neutral-400 uppercase block">Target Charge</span>
              <strong className="text-black font-bold block">{reversingCharge.description}</strong>
              <span className="text-rose-600 font-black mt-1 block">₦{reversingCharge.amount.toLocaleString()}</span>
            </div>

            <div className="space-y-3 text-xs">
              <div>
                <label className="text-[10px] font-bold text-neutral-600 uppercase tracking-wider block mb-1">
                  Mandatory Reversal Reason
                </label>
                <textarea
                  rows={2}
                  value={reversalReason}
                  onChange={(e) => setReversalReason(e.target.value)}
                  className="w-full bg-neutral-50 border border-neutral-300 rounded-xl p-2.5 text-xs text-black focus:outline-none focus:border-black font-medium"
                />
              </div>

              <div>
                <label className="text-[10px] font-bold text-neutral-600 uppercase tracking-wider block mb-1">
                  Manager Approver Email
                </label>
                <input
                  type="email"
                  value={reversalApprover}
                  onChange={(e) => setReversalApprover(e.target.value)}
                  className="w-full bg-neutral-50 border border-neutral-300 rounded-xl px-3 py-2 text-xs font-mono text-black focus:outline-none focus:border-black"
                />
              </div>
            </div>

            <div className="flex justify-end gap-2 pt-2 border-t border-neutral-100">
              <button
                onClick={() => setReversalModal(false)}
                className="px-4 py-2 rounded-xl text-neutral-600 hover:bg-neutral-100 text-xs font-bold"
              >
                Cancel
              </button>
              <button
                onClick={handleExecuteReversal}
                className="px-5 py-2.5 rounded-xl bg-black text-white text-xs font-bold hover:bg-neutral-800 cursor-pointer"
              >
                Post Linked Reversal
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ─── DUAL CONTROL REFUND APPROVAL CENTER ─── */}
      <div className="bg-white border border-neutral-200 rounded-3xl p-6 shadow-3xs space-y-4">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 border-b border-neutral-100 pb-4">
          <div>
            <h3 className="text-base font-bold text-black flex items-center gap-2">
              <ShieldAlert className="w-4.5 h-4.5 text-neutral-800" />
              <span>Dual-Control Refund Approval Center</span>
            </h3>
            <p className="text-xs text-neutral-400">
              Separation of duties enforcement: Front desk staff can request refunds, but only an independent manager or finance officer can approve settlement.
            </p>
          </div>
        </div>

        {dualControlError && (
          <div className="p-3.5 bg-rose-50 border border-rose-200 rounded-2xl text-rose-900 text-xs font-semibold flex items-center gap-2">
            <AlertTriangle className="w-4 h-4 text-rose-600 shrink-0" />
            <span>{dualControlError}</span>
          </div>
        )}

        <div className="flex items-center gap-2 text-xs mb-3">
          <label className="text-[10px] font-bold text-neutral-500 uppercase tracking-wider">Simulate Manager Sign-in:</label>
          <input
            type="email"
            value={approverEmailInput}
            onChange={(e) => setApproverEmailInput(e.target.value)}
            className="bg-neutral-50 border border-neutral-300 rounded-xl px-3 py-1 font-mono text-xs w-64"
          />
        </div>

        {refunds.length === 0 ? (
          <div className="p-8 text-center text-neutral-400 text-xs">
            No active refund requests in the queue.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-neutral-50 border-b border-neutral-200 text-[10px] font-bold uppercase text-neutral-500">
                <tr>
                  <th className="p-3">Request ID</th>
                  <th className="p-3">Guest Name</th>
                  <th className="p-3">Amount</th>
                  <th className="p-3">Reason</th>
                  <th className="p-3">Requester</th>
                  <th className="p-3">Status</th>
                  <th className="p-3 text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-neutral-100 font-mono text-[11px]">
                {refunds.map((r) => (
                  <tr key={r.id} className="hover:bg-neutral-50">
                    <td className="p-3 font-bold text-black">{r.id.slice(-6)}</td>
                    <td className="p-3 font-sans font-semibold text-neutral-900">{r.guestName}</td>
                    <td className="p-3 font-bold text-rose-600">₦{r.amount.toLocaleString()}</td>
                    <td className="p-3 font-sans text-neutral-600">{r.reason}</td>
                    <td className="p-3 text-neutral-500 font-sans">{r.requesterEmail}</td>
                    <td className="p-3">
                      {r.status === 'approved' ? (
                        <span className="px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200 text-[9px] font-bold font-sans">
                          Approved & Dispatched
                        </span>
                      ) : (
                        <span className="px-2 py-0.5 rounded-full bg-amber-50 text-amber-700 border border-amber-200 text-[9px] font-bold font-sans">
                          Pending Approval
                        </span>
                      )}
                    </td>
                    <td className="p-3 text-right font-sans">
                      {r.status === 'pending_approval' ? (
                        <button
                          onClick={() => handleApproveRefund(r.id)}
                          className="px-3 py-1 rounded-xl bg-black text-white text-[10px] font-bold hover:bg-neutral-800 cursor-pointer"
                        >
                          Approve Refund
                        </button>
                      ) : (
                        <span className="text-[10px] text-neutral-400">Settled</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* ─── REQUEST REFUND MODAL ─── */}
      {refundRequestModal && selectedFolio && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white border border-neutral-200 rounded-3xl p-6 sm:p-7 max-w-md w-full shadow-2xl space-y-4 animate-in zoom-in-95">
            <h3 className="text-base font-black text-black">Submit Caution Deposit / Refund Request</h3>
            <p className="text-xs text-neutral-500 leading-relaxed">
              Submits a formal refund request to the finance queue. Dual-control governance prevents self-approval.
            </p>

            <div className="space-y-3 text-xs">
              <div>
                <label className="text-[10px] font-bold text-neutral-600 uppercase tracking-wider block mb-1">
                  Refund Amount (₦)
                </label>
                <input
                  type="number"
                  value={refundAmount}
                  onChange={(e) => setRefundAmount(Number(e.target.value))}
                  className="w-full bg-neutral-50 border border-neutral-300 rounded-xl px-3 py-2 text-xs font-mono font-bold text-black focus:outline-none focus:border-black"
                />
              </div>

              <div>
                <label className="text-[10px] font-bold text-neutral-600 uppercase tracking-wider block mb-1">
                  Reason for Refund
                </label>
                <input
                  type="text"
                  value={refundReason}
                  onChange={(e) => setRefundReason(e.target.value)}
                  className="w-full bg-neutral-50 border border-neutral-300 rounded-xl px-3 py-2 text-xs text-black focus:outline-none focus:border-black font-medium"
                />
              </div>

              <div>
                <label className="text-[10px] font-bold text-neutral-600 uppercase tracking-wider block mb-1">
                  Staff Requester Email
                </label>
                <input
                  type="email"
                  value={refundRequester}
                  onChange={(e) => setRefundRequester(e.target.value)}
                  className="w-full bg-neutral-50 border border-neutral-300 rounded-xl px-3 py-2 text-xs font-mono text-black focus:outline-none focus:border-black"
                />
              </div>
            </div>

            <div className="flex justify-end gap-2 pt-2 border-t border-neutral-100">
              <button
                onClick={() => setRefundRequestModal(false)}
                className="px-4 py-2 rounded-xl text-neutral-600 hover:bg-neutral-100 text-xs font-bold"
              >
                Cancel
              </button>
              <button
                onClick={handleSubmitRefund}
                className="px-5 py-2.5 rounded-xl bg-black text-white text-xs font-bold hover:bg-neutral-800 cursor-pointer"
              >
                Submit Request
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
