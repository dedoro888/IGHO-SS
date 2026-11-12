import React, { useState, useEffect } from 'react';
import {
  Wallet,
  ArrowDownLeft,
  ArrowUpRight,
  CreditCard,
  Building,
  CheckCircle2,
  AlertTriangle,
  History,
  Lock,
  Unlock,
  UserCheck,
  FileSpreadsheet,
} from 'lucide-react';
import { Hotel, CashierShift } from '../../types';

interface CashierShiftViewProps {
  hotel: Hotel;
}

export const CashierShiftView: React.FC<CashierShiftViewProps> = ({ hotel }) => {
  const [shifts, setShifts] = useState<CashierShift[]>([]);
  const [activeShift, setActiveShift] = useState<CashierShift | null>(null);
  const [openShiftModal, setOpenShiftModal] = useState(false);
  const [closeShiftModal, setCloseShiftModal] = useState(false);

  // Form states
  const [openingFloatInput, setOpeningFloatInput] = useState<number>(20000);
  const [terminalInput, setTerminalInput] = useState('POS-FRONTDESK-01');
  const [cashierNameInput, setCashierNameInput] = useState('Tunde Adebayo');
  const [actualCashInput, setActualCashInput] = useState<number>(20000);
  const [handoverToInput, setHandoverToInput] = useState('Ngozi Eze');
  const [handoverNotesInput, setHandoverNotesInput] = useState('Night shift handover completed. Cash counted and POS roll matched.');

  const fetchShifts = async () => {
    try {
      const res = await fetch(`/api/hotels/${hotel.id}/cashier-shifts`);
      if (res.ok) {
        const data = await res.json();
        setActiveShift(data.activeShift);
        setShifts(data.shifts || []);
      }
    } catch (e) {
      console.error(e);
    }
  };

  useEffect(() => {
    fetchShifts();
  }, [hotel.id]);

  const handleOpenShift = async () => {
    try {
      const res = await fetch(`/api/hotels/${hotel.id}/cashier-shifts/open`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          cashierEmail: 'tunde@lavahotel.ng',
          cashierName: cashierNameInput,
          openingFloat: openingFloatInput,
          terminalId: terminalInput,
        }),
      });
      if (res.ok) {
        setOpenShiftModal(false);
        fetchShifts();
      }
    } catch (e) {
      console.error(e);
    }
  };

  const handleCloseShift = async () => {
    if (!activeShift) return;
    try {
      const res = await fetch(`/api/hotels/${hotel.id}/cashier-shifts/close`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          shiftId: activeShift.id,
          closingCashCount: actualCashInput,
          handoverTo: handoverToInput,
          handoverNotes: handoverNotesInput,
        }),
      });
      if (res.ok) {
        setCloseShiftModal(false);
        fetchShifts();
      }
    } catch (e) {
      console.error(e);
    }
  };

  const expectedCashInDrawer = activeShift
    ? activeShift.openingFloat + activeShift.cashIn - activeShift.cashOut
    : 0;
  const currentVariance = actualCashInput - expectedCashInDrawer;

  return (
    <div className="space-y-6 text-neutral-900 pb-12">
      {/* Shift Drawer Header Banner */}
      <div className="bg-white border border-neutral-200 rounded-3xl p-6 sm:p-7 shadow-3xs flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <span className="text-[10px] font-bold text-neutral-400 uppercase tracking-widest block font-mono">
            Cashier Shift Governance & Float Drawer
          </span>
          <h2 className="text-xl font-black text-black">
            Front Desk Cashier Drawer & Float Reconciliation
          </h2>
          <p className="text-xs text-neutral-500 mt-0.5">
            Individual cashier float accountability, cash movements, handover records, and variance auditing.
          </p>
        </div>

        <div>
          {activeShift ? (
            <button
              onClick={() => {
                setActualCashInput(expectedCashInDrawer);
                setCloseShiftModal(true);
              }}
              className="flex items-center gap-2 px-5 py-2.5 rounded-full bg-rose-600 hover:bg-rose-700 text-white font-bold text-xs transition-all shadow-sm active:scale-95 cursor-pointer"
            >
              <Lock className="w-3.5 h-3.5" />
              <span>Close Shift & Handover</span>
            </button>
          ) : (
            <button
              onClick={() => setOpenShiftModal(true)}
              className="flex items-center gap-2 px-5 py-2.5 rounded-full bg-black hover:bg-neutral-800 text-white font-bold text-xs transition-all shadow-sm active:scale-95 cursor-pointer"
            >
              <Unlock className="w-3.5 h-3.5" />
              <span>Open New Cashier Shift</span>
            </button>
          )}
        </div>
      </div>

      {/* Active Shift Overview */}
      {activeShift ? (
        <div className="bg-emerald-50/50 border border-emerald-200/80 rounded-3xl p-6 shadow-3xs space-y-5">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2 border-b border-emerald-200/60 pb-3">
            <div className="flex items-center gap-2.5">
              <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-ping" />
              <h3 className="text-base font-black text-emerald-950">
                Active Shift: {activeShift.cashierName} ({activeShift.terminalId})
              </h3>
            </div>
            <span className="text-[11px] font-mono text-emerald-800 font-semibold">
              Opened: {new Date(activeShift.openedAt).toLocaleTimeString()} · Float: ₦{activeShift.openingFloat.toLocaleString()}
            </span>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3.5 text-xs">
            <div className="p-3.5 bg-white border border-emerald-200 rounded-2xl shadow-3xs">
              <span className="text-[10px] text-neutral-400 font-bold uppercase block">Starting Float</span>
              <div className="text-xl font-black text-black font-mono mt-0.5">
                ₦{activeShift.openingFloat.toLocaleString()}
              </div>
            </div>

            <div className="p-3.5 bg-white border border-emerald-200 rounded-2xl shadow-3xs">
              <span className="text-[10px] text-emerald-700 font-bold uppercase block">+ Cash Collected</span>
              <div className="text-xl font-black text-emerald-700 font-mono mt-0.5">
                ₦{activeShift.cashIn.toLocaleString()}
              </div>
            </div>

            <div className="p-3.5 bg-white border border-emerald-200 rounded-2xl shadow-3xs">
              <span className="text-[10px] text-rose-700 font-bold uppercase block">- Cash Paid Out</span>
              <div className="text-xl font-black text-rose-700 font-mono mt-0.5">
                ₦{activeShift.cashOut.toLocaleString()}
              </div>
            </div>

            <div className="p-3.5 bg-white border border-black rounded-2xl shadow-3xs">
              <span className="text-[10px] text-neutral-500 font-bold uppercase block">Expected In Drawer</span>
              <div className="text-xl font-black text-black font-mono mt-0.5">
                ₦{expectedCashInDrawer.toLocaleString()}
              </div>
            </div>
          </div>
        </div>
      ) : (
        <div className="bg-neutral-50 border border-dashed border-neutral-300 rounded-3xl p-8 text-center space-y-3">
          <Wallet className="w-10 h-10 text-neutral-400 mx-auto" />
          <h4 className="text-sm font-bold text-neutral-800">No Cashier Shift Currently Active</h4>
          <p className="text-xs text-neutral-500 max-w-md mx-auto">
            Opening a cashier shift creates an individual float record, allowing the front desk to accept cash, record petty cash pay-outs, and log POS settlements.
          </p>
          <button
            onClick={() => setOpenShiftModal(true)}
            className="px-5 py-2.5 rounded-full bg-black text-white text-xs font-bold hover:bg-neutral-800 transition-colors cursor-pointer"
          >
            Open Float Drawer
          </button>
        </div>
      )}

      {/* ─── OPEN SHIFT MODAL ─── */}
      {openShiftModal && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white border border-neutral-200 rounded-3xl p-6 sm:p-7 max-w-md w-full shadow-2xl space-y-4 animate-in zoom-in-95">
            <h3 className="text-base font-black text-black">Open Front Desk Cashier Shift</h3>
            <p className="text-xs text-neutral-500 leading-relaxed">
              Verify your opening cash float before accepting transactions. The float is counted and signed into your custody.
            </p>

            <div className="space-y-3 text-xs">
              <div>
                <label className="text-[10px] font-bold text-neutral-600 uppercase tracking-wider block mb-1">
                  Cashier Full Name
                </label>
                <input
                  type="text"
                  value={cashierNameInput}
                  onChange={(e) => setCashierNameInput(e.target.value)}
                  className="w-full bg-neutral-50 border border-neutral-300 rounded-xl px-3 py-2 text-xs font-bold text-black focus:outline-none focus:border-black"
                />
              </div>

              <div>
                <label className="text-[10px] font-bold text-neutral-600 uppercase tracking-wider block mb-1">
                  Opening Cash Float (₦)
                </label>
                <input
                  type="number"
                  value={openingFloatInput}
                  onChange={(e) => setOpeningFloatInput(Number(e.target.value))}
                  className="w-full bg-neutral-50 border border-neutral-300 rounded-xl px-3 py-2 text-xs font-bold font-mono text-black focus:outline-none focus:border-black"
                />
              </div>

              <div>
                <label className="text-[10px] font-bold text-neutral-600 uppercase tracking-wider block mb-1">
                  Terminal ID
                </label>
                <input
                  type="text"
                  value={terminalInput}
                  onChange={(e) => setTerminalInput(e.target.value)}
                  className="w-full bg-neutral-50 border border-neutral-300 rounded-xl px-3 py-2 text-xs font-mono text-black focus:outline-none focus:border-black"
                />
              </div>
            </div>

            <div className="flex justify-end gap-2 pt-2 border-t border-neutral-100">
              <button
                onClick={() => setOpenShiftModal(false)}
                className="px-4 py-2 rounded-xl text-neutral-600 hover:bg-neutral-100 text-xs font-bold"
              >
                Cancel
              </button>
              <button
                onClick={handleOpenShift}
                className="px-5 py-2.5 rounded-xl bg-black text-white text-xs font-bold hover:bg-neutral-800 cursor-pointer"
              >
                Sign In Float & Open
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ─── CLOSE SHIFT & VARIANCE REVIEW MODAL ─── */}
      {closeShiftModal && activeShift && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white border border-neutral-200 rounded-3xl p-6 sm:p-7 max-w-lg w-full shadow-2xl space-y-4 animate-in zoom-in-95">
            <h3 className="text-base font-black text-black">Close Shift & Reconcile Float Variance</h3>
            <p className="text-xs text-neutral-500 leading-relaxed">
              Count all physical currency notes in the drawer. The system compares physical cash with expected revenue to identify any cash over/short variance.
            </p>

            <div className="p-3.5 bg-neutral-50 border border-neutral-200 rounded-2xl grid grid-cols-2 gap-2 text-xs">
              <div>
                <span className="text-[10px] text-neutral-400 font-bold uppercase block">Expected Cash</span>
                <strong className="text-base font-mono text-black font-black">
                  ₦{expectedCashInDrawer.toLocaleString()}
                </strong>
              </div>
              <div>
                <span className="text-[10px] text-neutral-400 font-bold uppercase block">Variance (Over / Short)</span>
                <strong
                  className={`text-base font-mono font-black ${
                    currentVariance === 0
                      ? 'text-emerald-700'
                      : currentVariance > 0
                      ? 'text-blue-700'
                      : 'text-rose-700'
                  }`}
                >
                  {currentVariance >= 0 ? `+₦${currentVariance.toLocaleString()}` : `-₦${Math.abs(currentVariance).toLocaleString()}`}
                </strong>
              </div>
            </div>

            <div className="space-y-3 text-xs">
              <div>
                <label className="text-[10px] font-bold text-neutral-600 uppercase tracking-wider block mb-1">
                  Actual Physical Cash Counted (₦)
                </label>
                <input
                  type="number"
                  value={actualCashInput}
                  onChange={(e) => setActualCashInput(Number(e.target.value))}
                  className="w-full bg-neutral-50 border border-neutral-300 rounded-xl px-3 py-2 text-xs font-bold font-mono text-black focus:outline-none focus:border-black"
                />
              </div>

              <div>
                <label className="text-[10px] font-bold text-neutral-600 uppercase tracking-wider block mb-1">
                  Handover To (Next Shift Cashier)
                </label>
                <input
                  type="text"
                  value={handoverToInput}
                  onChange={(e) => setHandoverToInput(e.target.value)}
                  className="w-full bg-neutral-50 border border-neutral-300 rounded-xl px-3 py-2 text-xs font-medium text-black focus:outline-none focus:border-black"
                />
              </div>

              <div>
                <label className="text-[10px] font-bold text-neutral-600 uppercase tracking-wider block mb-1">
                  Handover & Variance Explanation Notes
                </label>
                <textarea
                  rows={2}
                  value={handoverNotesInput}
                  onChange={(e) => setHandoverNotesInput(e.target.value)}
                  className="w-full bg-neutral-50 border border-neutral-300 rounded-xl p-2.5 text-xs text-black focus:outline-none focus:border-black"
                />
              </div>
            </div>

            <div className="flex justify-end gap-2 pt-2 border-t border-neutral-100">
              <button
                onClick={() => setCloseShiftModal(false)}
                className="px-4 py-2 rounded-xl text-neutral-600 hover:bg-neutral-100 text-xs font-bold"
              >
                Cancel
              </button>
              <button
                onClick={handleCloseShift}
                className="px-5 py-2.5 rounded-xl bg-black text-white text-xs font-bold hover:bg-neutral-800 cursor-pointer"
              >
                Sign Off & Close Shift
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Historical Shifts Table */}
      <div className="bg-white border border-neutral-200 rounded-3xl p-6 shadow-3xs space-y-4">
        <h3 className="text-base font-bold text-black flex items-center gap-2">
          <History className="w-4 h-4 text-neutral-500" />
          <span>Shift Archive & Variance Audit Log</span>
        </h3>

        {shifts.length === 0 ? (
          <div className="p-8 text-center text-neutral-400 text-xs">
            No historical shift records logged yet.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-neutral-50 border-b border-neutral-200 text-[10px] font-bold uppercase text-neutral-500">
                <tr>
                  <th className="p-3">Shift ID</th>
                  <th className="p-3">Cashier</th>
                  <th className="p-3">Float</th>
                  <th className="p-3">Counted</th>
                  <th className="p-3">Variance</th>
                  <th className="p-3">Handover To</th>
                  <th className="p-3">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-neutral-100 font-mono text-[11px]">
                {shifts.map((s) => (
                  <tr key={s.id} className="hover:bg-neutral-50">
                    <td className="p-3 font-bold text-black">{s.id.slice(-8)}</td>
                    <td className="p-3 text-neutral-800 font-sans font-semibold">{s.cashierName}</td>
                    <td className="p-3 text-neutral-600">₦{s.openingFloat.toLocaleString()}</td>
                    <td className="p-3 text-neutral-900 font-bold">
                      {s.closingCashCount !== undefined ? `₦${s.closingCashCount.toLocaleString()}` : '—'}
                    </td>
                    <td className="p-3">
                      {s.variance !== undefined ? (
                        <span
                          className={`font-bold ${
                            s.variance === 0
                              ? 'text-emerald-700'
                              : s.variance > 0
                              ? 'text-blue-700'
                              : 'text-rose-700'
                          }`}
                        >
                          {s.variance >= 0 ? `+₦${s.variance.toLocaleString()}` : `-₦${Math.abs(s.variance).toLocaleString()}`}
                        </span>
                      ) : (
                        <span className="text-neutral-400">In Progress</span>
                      )}
                    </td>
                    <td className="p-3 text-neutral-700 font-sans">{s.handoverTo || '—'}</td>
                    <td className="p-3">
                      {s.status === 'open' ? (
                        <span className="px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200 text-[9px] font-bold font-sans">
                          Active
                        </span>
                      ) : (
                        <span className="px-2 py-0.5 rounded-full bg-neutral-100 text-neutral-700 border border-neutral-200 text-[9px] font-bold font-sans">
                          Closed
                        </span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
};
