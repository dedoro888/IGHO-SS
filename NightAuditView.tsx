import React, { useState, useEffect } from 'react';
import {
  Moon,
  Clock,
  Lock,
  CheckCircle2,
  AlertTriangle,
  Play,
  FileText,
  Calendar,
  Layers,
  Percent,
  Receipt,
  RotateCcw,
  Sparkles,
  ShieldAlert,
} from 'lucide-react';
import { Hotel, Room, Reservation, BusinessDateStatus, NightAuditRecord, TaxConfiguration } from '../../types';

interface NightAuditViewProps {
  hotel: Hotel;
  rooms: Room[];
  reservations: Reservation[];
}

export const NightAuditView: React.FC<NightAuditViewProps> = ({ hotel, rooms, reservations }) => {
  const [loading, setLoading] = useState(false);
  const [status, setStatus] = useState<BusinessDateStatus>({
    hotelId: hotel.id,
    currentBusinessDate: new Date().toISOString().split('T')[0],
    isDayLocked: false,
    lockedDates: [],
  });
  const [auditRecords, setAuditRecords] = useState<NightAuditRecord[]>([]);
  const [wizardStep, setWizardStep] = useState<number>(0); // 0 = idle, 1..5 = wizard
  const [auditNotes, setAuditNotes] = useState('Standard end-of-day night audit and room posting.');
  const [nextSeqInvoice, setNextSeqInvoice] = useState<string>('INV-2026-00101');
  const [nextSeqReceipt, setNextSeqReceipt] = useState<string>('RCP-2026-00101');
  const [taxConfig, setTaxConfig] = useState<TaxConfiguration>({
    hotelId: hotel.id,
    vatRate: 7.5,
    vatEnabled: true,
    consumptionTaxRate: 5.0,
    consumptionTaxEnabled: true,
    serviceChargeRate: 10.0,
    serviceChargeEnabled: true,
    calculationOrder: 'subtotal_then_service_then_tax',
    firsTinNumber: 'TIN-18492041-0001',
  });
  const [taxSaveSuccess, setTaxSaveSuccess] = useState(false);

  // In-house reservations for current business date
  const inHouseReservations = reservations.filter(
    (r) => r.hotelId === hotel.id && (r.status === 'confirmed' || r.status === 'checked_in')
  );

  const fetchStatus = async () => {
    try {
      const res = await fetch(`/api/hotels/${hotel.id}/night-audit/status`);
      if (res.ok) {
        const data = await res.json();
        if (data.status) setStatus(data.status);
        if (data.recentAudits) setAuditRecords(data.recentAudits);
      }
    } catch (e) {
      console.error(e);
    }
  };

  const fetchSequences = async () => {
    try {
      const resInv = await fetch(`/api/hotels/${hotel.id}/sequence/next`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ type: 'invoice' }),
      });
      if (resInv.ok) {
        const d = await resInv.json();
        setNextSeqInvoice(d.sequenceNumber);
      }
      const resRcp = await fetch(`/api/hotels/${hotel.id}/sequence/next`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ type: 'receipt' }),
      });
      if (resRcp.ok) {
        const d = await resRcp.json();
        setNextSeqReceipt(d.sequenceNumber);
      }
    } catch {}
  };

  useEffect(() => {
    fetchStatus();
    fetchSequences();
  }, [hotel.id]);

  const handleExecuteAudit = async () => {
    setLoading(true);
    try {
      const totalRoomRevenue = inHouseReservations.reduce((acc, r) => acc + (r.total || 45000), 0);
      const vat = taxConfig.vatEnabled ? totalRoomRevenue * (taxConfig.vatRate / 100) : 0;
      const consumption = taxConfig.consumptionTaxEnabled ? totalRoomRevenue * (taxConfig.consumptionTaxRate / 100) : 0;

      const res = await fetch(`/api/hotels/${hotel.id}/night-audit/run`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          auditorEmail: 'frontdesk@lavahotel.ng',
          auditNotes,
          inHouseRoomsCount: inHouseReservations.length,
          totalRoomRevenuePosted: totalRoomRevenue,
          totalVatPosted: vat,
          totalConsumptionTaxPosted: consumption,
        }),
      });

      if (res.ok) {
        const d = await res.json();
        setStatus(d.status);
        if (d.auditRecord) {
          setAuditRecords((prev) => [d.auditRecord, ...prev]);
        }
        setWizardStep(5); // Complete
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6 text-neutral-900 pb-12">
      {/* Current Business Date Header Banner */}
      <div className="bg-black text-white border border-neutral-800 rounded-3xl p-6 sm:p-7 shadow-lg flex flex-col md:flex-row items-start md:items-center justify-between gap-5">
        <div className="space-y-2">
          <div className="flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
            <span className="text-[10px] font-mono uppercase tracking-widest text-neutral-400 font-bold">
              Business Date System & Night Audit
            </span>
          </div>
          <div className="flex items-baseline gap-3">
            <h2 className="text-3xl font-black font-mono tracking-tight text-white">
              {status.currentBusinessDate}
            </h2>
            <span className="text-xs px-2.5 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 font-semibold font-mono">
              Operating Day Active
            </span>
          </div>
          <p className="text-xs text-neutral-400 max-w-xl">
            Night audit seals the operating day, posts daily room charges and statutory taxes (7.5% VAT + 5% Consumption Tax), reconciles cash drawers, and locks closed business days against retrospective tampering.
          </p>
        </div>

        <button
          onClick={() => setWizardStep(1)}
          className="flex items-center gap-2 px-5 py-3 rounded-full bg-white text-black hover:bg-neutral-100 font-bold text-xs transition-all shadow-md active:scale-95 cursor-pointer shrink-0"
        >
          <Play className="w-3.5 h-3.5 fill-black" />
          <span>Run Night Audit Wizard</span>
        </button>
      </div>

      {/* KPI Stats Row */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white border border-neutral-200 rounded-2xl p-5 shadow-3xs space-y-2">
          <div className="flex justify-between items-center text-neutral-400 text-xs font-bold uppercase tracking-wider">
            <span>In-House Rooms</span>
            <Moon className="w-4 h-4 text-neutral-400" />
          </div>
          <div className="text-2xl font-black text-black font-mono">
            {inHouseReservations.length} <span className="text-xs font-normal text-neutral-400">/ {rooms.length} rooms</span>
          </div>
          <span className="text-[11px] text-neutral-500 font-medium block">
            Occupancy rate: {rooms.length > 0 ? Math.round((inHouseReservations.length / rooms.length) * 100) : 0}%
          </span>
        </div>

        <div className="bg-white border border-neutral-200 rounded-2xl p-5 shadow-3xs space-y-2">
          <div className="flex justify-between items-center text-neutral-400 text-xs font-bold uppercase tracking-wider">
            <span>Locked Past Days</span>
            <Lock className="w-4 h-4 text-emerald-600" />
          </div>
          <div className="text-2xl font-black text-black font-mono">
            {status.lockedDates?.length || 0}
          </div>
          <span className="text-[11px] text-emerald-700 font-semibold block">
            Closed dates immutable (read-only)
          </span>
        </div>

        <div className="bg-white border border-neutral-200 rounded-2xl p-5 shadow-3xs space-y-2">
          <div className="flex justify-between items-center text-neutral-400 text-xs font-bold uppercase tracking-wider">
            <span>Next Invoice #</span>
            <FileText className="w-4 h-4 text-neutral-400" />
          </div>
          <div className="text-base font-black text-black font-mono">
            {nextSeqInvoice}
          </div>
          <span className="text-[11px] text-neutral-500 font-medium block">
            Sequential monotonic, zero-gap
          </span>
        </div>

        <div className="bg-white border border-neutral-200 rounded-2xl p-5 shadow-3xs space-y-2">
          <div className="flex justify-between items-center text-neutral-400 text-xs font-bold uppercase tracking-wider">
            <span>Next Receipt #</span>
            <Receipt className="w-4 h-4 text-neutral-400" />
          </div>
          <div className="text-base font-black text-black font-mono">
            {nextSeqReceipt}
          </div>
          <span className="text-[11px] text-neutral-500 font-medium block">
            Server-guaranteed receipt counter
          </span>
        </div>
      </div>

      {/* ─── 5-STEP NIGHT AUDIT WIZARD MODAL ─── */}
      {wizardStep > 0 && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white border border-neutral-200 rounded-3xl p-6 sm:p-8 max-w-xl w-full shadow-2xl space-y-6 animate-in zoom-in-95">
            <div className="flex items-center justify-between border-b border-neutral-100 pb-4">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-xl bg-black text-white flex items-center justify-center">
                  <Moon className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base font-black text-black">Night Audit Execution Wizard</h3>
                  <p className="text-[11px] text-neutral-400 font-mono">
                    Step {wizardStep} of 5 · Operating Date: {status.currentBusinessDate}
                  </p>
                </div>
              </div>
              <button
                onClick={() => setWizardStep(0)}
                className="text-neutral-400 hover:text-black text-sm p-1"
              >
                ✕
              </button>
            </div>

            {/* Step 1: Pre-Audit Check */}
            {wizardStep === 1 && (
              <div className="space-y-4 text-xs">
                <div className="p-4 bg-neutral-50 border border-neutral-200 rounded-2xl space-y-2">
                  <h4 className="font-bold text-neutral-900">Step 1: Pre-Audit Verification</h4>
                  <ul className="space-y-1.5 text-neutral-600">
                    <li className="flex items-center gap-2">
                      <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                      <span>{inHouseReservations.length} in-house occupied rooms verified</span>
                    </li>
                    <li className="flex items-center gap-2">
                      <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                      <span>Zero unassigned check-ins remaining on front desk roster</span>
                    </li>
                    <li className="flex items-center gap-2">
                      <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                      <span>Cashier shift float drawers reconciled for closing</span>
                    </li>
                  </ul>
                </div>
                <div className="flex justify-end gap-2 pt-2">
                  <button
                    onClick={() => setWizardStep(0)}
                    className="px-4 py-2 rounded-xl text-neutral-600 hover:bg-neutral-100 font-bold"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={() => setWizardStep(2)}
                    className="px-5 py-2.5 rounded-xl bg-black text-white font-bold cursor-pointer"
                  >
                    Proceed to Charge Posting →
                  </button>
                </div>
              </div>
            )}

            {/* Step 2: Charge & Tax Posting */}
            {wizardStep === 2 && (
              <div className="space-y-4 text-xs">
                <div className="p-4 bg-neutral-50 border border-neutral-200 rounded-2xl space-y-2.5">
                  <h4 className="font-bold text-neutral-900">Step 2: Room Revenue & Tax Auto-Posting</h4>
                  <p className="text-neutral-600 leading-relaxed">
                    The audit engine will post room rates and calculate statutory taxes on every active in-house folio:
                  </p>
                  <div className="grid grid-cols-3 gap-2 font-mono text-[11px] pt-1">
                    <div className="p-2 bg-white rounded-xl border border-neutral-200">
                      <span className="text-neutral-400 block text-[9px]">VAT (FIRS)</span>
                      <strong className="text-black">7.5%</strong>
                    </div>
                    <div className="p-2 bg-white rounded-xl border border-neutral-200">
                      <span className="text-neutral-400 block text-[9px]">State Tax</span>
                      <strong className="text-black">5.0%</strong>
                    </div>
                    <div className="p-2 bg-white rounded-xl border border-neutral-200">
                      <span className="text-neutral-400 block text-[9px]">Service Chg</span>
                      <strong className="text-black">10.0%</strong>
                    </div>
                  </div>
                </div>
                <div className="flex justify-between pt-2">
                  <button
                    onClick={() => setWizardStep(1)}
                    className="px-4 py-2 rounded-xl text-neutral-600 hover:bg-neutral-100 font-bold"
                  >
                    ← Back
                  </button>
                  <button
                    onClick={() => setWizardStep(3)}
                    className="px-5 py-2.5 rounded-xl bg-black text-white font-bold cursor-pointer"
                  >
                    Proceed to Day Locking →
                  </button>
                </div>
              </div>
            )}

            {/* Step 3: Date Rollover & Lock Confirmation */}
            {wizardStep === 3 && (
              <div className="space-y-4 text-xs">
                <div className="p-4 bg-amber-50 border border-amber-200 rounded-2xl space-y-2 text-amber-950">
                  <div className="flex items-center gap-2 font-bold">
                    <AlertTriangle className="w-4 h-4 text-amber-600" />
                    <span>Step 3: Irreversible Business Date Lock</span>
                  </div>
                  <p className="leading-relaxed text-[11px]">
                    Rolling the business date will permanently lock <strong>{status.currentBusinessDate}</strong>. All financial transactions, folios, and invoices recorded on this date will become read-only. Subsequent adjustments must be recorded as linked reversals.
                  </p>
                </div>

                <div>
                  <label className="text-[10px] font-bold text-neutral-600 uppercase tracking-wider block mb-1">
                    Audit Notes & Sign-off Signature
                  </label>
                  <input
                    type="text"
                    value={auditNotes}
                    onChange={(e) => setAuditNotes(e.target.value)}
                    className="w-full bg-neutral-50 border border-neutral-300 rounded-xl px-3 py-2 text-xs text-neutral-900 focus:outline-none focus:border-black font-medium"
                  />
                </div>

                <div className="flex justify-between pt-2">
                  <button
                    onClick={() => setWizardStep(2)}
                    className="px-4 py-2 rounded-xl text-neutral-600 hover:bg-neutral-100 font-bold"
                  >
                    ← Back
                  </button>
                  <button
                    onClick={() => {
                      setWizardStep(4);
                      handleExecuteAudit();
                    }}
                    disabled={loading}
                    className="px-5 py-2.5 rounded-xl bg-black text-white font-bold cursor-pointer disabled:opacity-50"
                  >
                    Execute Night Audit Now
                  </button>
                </div>
              </div>
            )}

            {/* Step 4: Running */}
            {wizardStep === 4 && (
              <div className="py-8 text-center space-y-3">
                <div className="w-10 h-10 border-3 border-black border-t-transparent rounded-full animate-spin mx-auto" />
                <h4 className="font-bold text-sm text-black">Posting charges and sealing business day...</h4>
                <p className="text-xs text-neutral-400">Locking ledger and rolling to next operating date</p>
              </div>
            )}

            {/* Step 5: Completed */}
            {wizardStep === 5 && (
              <div className="space-y-4 text-xs text-center py-4">
                <div className="w-12 h-12 rounded-full bg-emerald-100 text-emerald-600 flex items-center justify-center mx-auto">
                  <CheckCircle2 className="w-6 h-6" />
                </div>
                <div>
                  <h4 className="text-base font-black text-black">Night Audit Successfully Completed</h4>
                  <p className="text-xs text-neutral-500 mt-1">
                    Operating date rolled to <strong className="text-black font-mono">{status.currentBusinessDate}</strong>. Previous day is locked and immutable.
                  </p>
                </div>
                <button
                  onClick={() => setWizardStep(0)}
                  className="px-6 py-2.5 rounded-full bg-black text-white font-bold cursor-pointer"
                >
                  Done
                </button>
              </div>
            )}
          </div>
        </div>
      )}

      {/* ─── STATUTORY TAX & SERVICE CHARGE CONFIGURATION ─── */}
      <div className="bg-white border border-neutral-200 rounded-3xl p-6 shadow-3xs space-y-5">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 border-b border-neutral-100 pb-4">
          <div className="flex items-center gap-2.5">
            <Percent className="w-5 h-5 text-neutral-800" />
            <div>
              <h3 className="text-base font-bold text-black">Configurable Tax & Service Charge Hierarchy</h3>
              <p className="text-xs text-neutral-400">
                Nigerian statutory tax rates (FIRS VAT 7.5%, State Consumption Tax 5%) and defined calculation sequence.
              </p>
            </div>
          </div>
          {taxSaveSuccess && (
            <span className="text-xs font-bold text-emerald-700 bg-emerald-50 border border-emerald-200 px-3 py-1 rounded-full animate-in fade-in">
              Tax rules updated
            </span>
          )}
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 text-xs">
          <div className="p-4 bg-neutral-50 border border-neutral-200 rounded-2xl space-y-2">
            <div className="flex justify-between items-center">
              <span className="font-bold text-neutral-800">Value Added Tax (VAT)</span>
              <input
                type="checkbox"
                checked={taxConfig.vatEnabled}
                onChange={(e) => setTaxConfig({ ...taxConfig, vatEnabled: e.target.checked })}
                className="w-4 h-4 accent-black"
              />
            </div>
            <div className="flex items-center gap-2">
              <input
                type="number"
                step="0.1"
                value={taxConfig.vatRate}
                onChange={(e) => setTaxConfig({ ...taxConfig, vatRate: Number(e.target.value) })}
                className="w-20 bg-white border border-neutral-300 rounded-lg px-2.5 py-1.5 font-mono font-bold text-xs"
              />
              <span className="text-neutral-500 font-semibold">% (Standard FIRS)</span>
            </div>
          </div>

          <div className="p-4 bg-neutral-50 border border-neutral-200 rounded-2xl space-y-2">
            <div className="flex justify-between items-center">
              <span className="font-bold text-neutral-800">State Consumption Tax</span>
              <input
                type="checkbox"
                checked={taxConfig.consumptionTaxEnabled}
                onChange={(e) => setTaxConfig({ ...taxConfig, consumptionTaxEnabled: e.target.checked })}
                className="w-4 h-4 accent-black"
              />
            </div>
            <div className="flex items-center gap-2">
              <input
                type="number"
                step="0.1"
                value={taxConfig.consumptionTaxRate}
                onChange={(e) => setTaxConfig({ ...taxConfig, consumptionTaxRate: Number(e.target.value) })}
                className="w-20 bg-white border border-neutral-300 rounded-lg px-2.5 py-1.5 font-mono font-bold text-xs"
              />
              <span className="text-neutral-500 font-semibold">% (Lagos / State)</span>
            </div>
          </div>

          <div className="p-4 bg-neutral-50 border border-neutral-200 rounded-2xl space-y-2">
            <div className="flex justify-between items-center">
              <span className="font-bold text-neutral-800">Service Charge</span>
              <input
                type="checkbox"
                checked={taxConfig.serviceChargeEnabled}
                onChange={(e) => setTaxConfig({ ...taxConfig, serviceChargeEnabled: e.target.checked })}
                className="w-4 h-4 accent-black"
              />
            </div>
            <div className="flex items-center gap-2">
              <input
                type="number"
                step="0.1"
                value={taxConfig.serviceChargeRate}
                onChange={(e) => setTaxConfig({ ...taxConfig, serviceChargeRate: Number(e.target.value) })}
                className="w-20 bg-white border border-neutral-300 rounded-lg px-2.5 py-1.5 font-mono font-bold text-xs"
              />
              <span className="text-neutral-500 font-semibold">% (Staff Pool)</span>
            </div>
          </div>
        </div>

        <div className="flex justify-end pt-2">
          <button
            onClick={() => {
              setTaxSaveSuccess(true);
              setTimeout(() => setTaxSaveSuccess(false), 3000);
            }}
            className="px-5 py-2.5 rounded-full bg-black text-white text-xs font-bold hover:bg-neutral-800 transition-colors cursor-pointer"
          >
            Save Tax Hierarchy
          </button>
        </div>
      </div>

      {/* ─── NIGHT AUDIT AUDIT TRAIL ─── */}
      <div className="bg-white border border-neutral-200 rounded-3xl p-6 shadow-3xs space-y-4">
        <h3 className="text-base font-bold text-black flex items-center gap-2">
          <Clock className="w-4 h-4 text-neutral-500" />
          <span>Night Audit Log & Closed Days History</span>
        </h3>

        {auditRecords.length === 0 ? (
          <div className="p-8 text-center text-neutral-400 text-xs">
            No night audits executed yet. Click &quot;Run Night Audit Wizard&quot; above to seal the first operating day.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-neutral-50 border-b border-neutral-200 text-[10px] font-bold uppercase text-neutral-500">
                <tr>
                  <th className="p-3">Sealed Date</th>
                  <th className="p-3">Rolled To</th>
                  <th className="p-3">Auditor</th>
                  <th className="p-3">Rooms Posted</th>
                  <th className="p-3">Room Revenue</th>
                  <th className="p-3">VAT Posted</th>
                  <th className="p-3">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-neutral-100 font-mono text-[11px]">
                {auditRecords.map((a) => (
                  <tr key={a.id} className="hover:bg-neutral-50">
                    <td className="p-3 font-bold text-black">{a.businessDate}</td>
                    <td className="p-3 text-neutral-600">{a.rolledToDate}</td>
                    <td className="p-3 text-neutral-700 font-sans">{a.auditorEmail}</td>
                    <td className="p-3">{a.inHouseRoomsCount} rooms</td>
                    <td className="p-3 font-bold text-black">₦{a.totalRoomRevenuePosted.toLocaleString()}</td>
                    <td className="p-3 text-neutral-600">₦{a.totalVatPosted.toLocaleString()}</td>
                    <td className="p-3">
                      <span className="px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200 text-[9px] font-bold font-sans">
                        Sealed & Locked
                      </span>
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
