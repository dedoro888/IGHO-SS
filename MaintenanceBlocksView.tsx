import React, { useState, useEffect } from 'react';
import {
  Wrench,
  AlertTriangle,
  Calendar,
  CheckCircle2,
  Clock,
  Plus,
  Bed,
  ArrowRightLeft,
  ShieldAlert,
  Hammer,
  User,
  Filter,
} from 'lucide-react';
import { Hotel, Room, Reservation, MaintenanceWorkOrder } from '../../types';

interface MaintenanceBlocksViewProps {
  hotel: Hotel;
  rooms: Room[];
  reservations: Reservation[];
  onRoomMoved?: (reservationId: string, newRoomId: string) => void;
}

export const MaintenanceBlocksView: React.FC<MaintenanceBlocksViewProps> = ({
  hotel,
  rooms,
  reservations,
  onRoomMoved,
}) => {
  const [orders, setOrders] = useState<MaintenanceWorkOrder[]>([]);
  const [modalOpen, setModalOpen] = useState(false);
  const [roomMoveModal, setRoomMoveModal] = useState(false);
  const [conflictAlert, setConflictAlert] = useState<string | null>(null);

  // Form states
  const [selectedRoomId, setSelectedRoomId] = useState<string>(rooms[0]?.id || 'room-101');
  const [category, setCategory] = useState<'hvac' | 'plumbing' | 'electrical' | 'carpentry' | 'painting' | 'furniture' | 'other'>('hvac');
  const [title, setTitle] = useState('AC Compressor Replacement');
  const [description, setDescription] = useState('Air conditioning not cooling below 24C. Requires replacement of outdoor unit condenser fan.');
  const [priority, setPriority] = useState<'critical' | 'urgent' | 'routine'>('urgent');
  const [startDate, setStartDate] = useState(new Date().toISOString().split('T')[0]);
  const [endDate, setEndDate] = useState(
    new Date(Date.now() + 2 * 86400000).toISOString().split('T')[0]
  );
  const [blocksRoom, setBlocksRoom] = useState(true);

  // Room move state
  const [movingReservation, setMovingReservation] = useState<Reservation | null>(null);
  const [targetRoomId, setTargetRoomId] = useState<string>('');
  const [doubleBookingCheckResult, setDoubleBookingCheckResult] = useState<string | null>(null);

  const fetchOrders = async () => {
    try {
      const res = await fetch(`/api/hotels/${hotel.id}/maintenance`);
      if (res.ok) {
        const d = await res.json();
        setOrders(d.orders || []);
      }
    } catch (e) {
      console.error(e);
    }
  };

  useEffect(() => {
    fetchOrders();
  }, [hotel.id]);

  // Seed sample work order if empty
  useEffect(() => {
    if (orders.length === 0 && rooms.length > 0) {
      const sampleOrders: MaintenanceWorkOrder[] = [
        {
          id: 'maint-001',
          hotelId: hotel.id,
          roomId: rooms[0]?.id || 'room-101',
          roomNumber: rooms[0]?.number || '101',
          category: 'plumbing',
          title: 'Jacuzzi Jet Pressure Inspection',
          description: 'Routine maintenance of ensuite jacuzzi whirlpool pump.',
          priority: 'routine',
          status: 'open',
          reportedBy: 'Housekeeping Lead',
          assignedTechnician: 'Emeka Nwosu (Engineering)',
          startDate: new Date().toISOString().split('T')[0],
          expectedEndDate: new Date(Date.now() + 86400000).toISOString().split('T')[0],
          blocksRoom: false,
          guestConflictChecked: true,
          createdAt: new Date().toISOString(),
        },
      ];
      setOrders(sampleOrders);
    }
  }, [rooms, orders.length]);

  const handleCreateWorkOrder = async () => {
    setConflictAlert(null);
    const targetRoom = rooms.find((r) => r.id === selectedRoomId);
    try {
      const res = await fetch(`/api/hotels/${hotel.id}/maintenance`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          roomId: selectedRoomId,
          roomNumber: targetRoom?.number || '101',
          category,
          title,
          description,
          priority,
          startDate,
          expectedEndDate: endDate,
          blocksRoom,
          reportedBy: 'Operations Desk',
        }),
      });

      const d = await res.json();
      if (!res.ok) {
        // GUEST CONFLICT DETECTED BEFORE ROOM CAN BE BLOCKED!
        if (d.error === 'GUEST_CONFLICT_DETECTED') {
          setConflictAlert(d.message);
          if (d.conflictingGuest) {
            setMovingReservation(d.conflictingGuest);
          }
        } else {
          setConflictAlert(d.message || 'Failed to register maintenance order.');
        }
      } else {
        setModalOpen(false);
        fetchOrders();
      }
    } catch (e: any) {
      setConflictAlert(e.message);
    }
  };

  // Server-side double booking check for room moves
  const handleVerifyRoomMove = async () => {
    if (!movingReservation || !targetRoomId) return;
    try {
      const res = await fetch(`/api/hotels/${hotel.id}/bookings/check-conflict`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          roomId: targetRoomId,
          checkIn: movingReservation.checkIn,
          checkOut: movingReservation.checkOut,
          excludeReservationId: movingReservation.id,
        }),
      });
      const data = await res.json();
      if (data.hasConflict) {
        setDoubleBookingCheckResult(data.message);
      } else {
        setDoubleBookingCheckResult('SUCCESS_CLEAR');
      }
    } catch (e: any) {
      setDoubleBookingCheckResult(e.message);
    }
  };

  const [moveSuccessBanner, setMoveSuccessBanner] = useState<string | null>(null);

  const handleExecuteRoomMove = () => {
    if (!movingReservation || !targetRoomId) return;
    if (onRoomMoved) {
      onRoomMoved(movingReservation.id, targetRoomId);
    }
    const movedName = movingReservation.guestName;
    setRoomMoveModal(false);
    setConflictAlert(null);
    setMovingReservation(null);
    setMoveSuccessBanner(`Guest ${movedName} successfully moved to target room.`);
    setTimeout(() => setMoveSuccessBanner(null), 5000);
  };

  return (
    <div className="space-y-6 text-neutral-900 pb-12">
      {moveSuccessBanner && (
        <div className="p-3.5 bg-emerald-50 border border-emerald-200 rounded-2xl text-emerald-900 text-xs font-semibold flex items-center justify-between">
          <span>{moveSuccessBanner}</span>
          <button type="button" onClick={() => setMoveSuccessBanner(null)} className="text-emerald-700 font-bold hover:text-emerald-950">✕</button>
        </div>
      )}
      {/* Header Banner */}
      <div className="bg-white border border-neutral-200 rounded-3xl p-6 sm:p-7 shadow-3xs flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <span className="text-[10px] font-bold text-neutral-400 uppercase tracking-widest block font-mono">
            Facility Governance & Asset Maintenance
          </span>
          <h2 className="text-xl font-black text-black">
            Maintenance Work Orders & Out-of-Order Room Blocks
          </h2>
          <p className="text-xs text-neutral-500 mt-0.5">
            Strict pre-block conflict detection prevents placing rooms out of service if active guest bookings exist.
          </p>
        </div>

        <button
          onClick={() => {
            setConflictAlert(null);
            setModalOpen(true);
          }}
          className="flex items-center gap-2 px-5 py-2.5 rounded-full bg-black hover:bg-neutral-800 text-white font-bold text-xs transition-all shadow-sm active:scale-95 cursor-pointer shrink-0"
        >
          <Plus className="w-3.5 h-3.5" />
          <span>New Work Order / Block</span>
        </button>
      </div>

      {/* Conflict Alert Banner if guest was booked */}
      {conflictAlert && (
        <div className="p-4 bg-rose-50 border border-rose-200 rounded-2xl text-rose-950 text-xs space-y-3 animate-in fade-in">
          <div className="flex items-start gap-2.5 font-bold">
            <ShieldAlert className="w-5 h-5 text-rose-600 shrink-0" />
            <div className="space-y-1">
              <span className="text-sm font-black">Pre-Block Conflict Blocked: Guest Currently Booked</span>
              <p className="font-normal text-rose-800 leading-relaxed text-[11px]">{conflictAlert}</p>
            </div>
          </div>

          {movingReservation && (
            <div className="pt-2 border-t border-rose-200/60 flex items-center justify-between">
              <span className="text-[11px] font-semibold text-rose-900">
                Would you like to initiate a Room Move for {movingReservation.guestName}?
              </span>
              <button
                onClick={() => setRoomMoveModal(true)}
                className="px-4 py-1.5 rounded-xl bg-rose-600 text-white font-bold text-xs hover:bg-rose-700 transition-colors cursor-pointer"
              >
                Initiate Room Move →
              </button>
            </div>
          )}
        </div>
      )}

      {/* Orders Grid */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {orders.map((o) => (
          <div key={o.id} className="bg-white border border-neutral-200 rounded-2xl p-5 shadow-3xs space-y-3 flex flex-col justify-between">
            <div className="space-y-2">
              <div className="flex items-start justify-between">
                <span className="px-2.5 py-1 rounded-lg bg-black text-white font-mono font-black text-xs">
                  Room {o.roomNumber}
                </span>
                <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full border uppercase ${
                  o.priority === 'critical'
                    ? 'bg-rose-50 text-rose-700 border-rose-200'
                    : o.priority === 'urgent'
                    ? 'bg-amber-50 text-amber-700 border-amber-200'
                    : 'bg-neutral-100 text-neutral-700 border-neutral-200'
                }`}>
                  {o.priority}
                </span>
              </div>

              <div>
                <h4 className="text-sm font-bold text-black">{o.title}</h4>
                <p className="text-[11px] text-neutral-500 mt-0.5 line-clamp-2">{o.description}</p>
              </div>
            </div>

            <div className="pt-3 border-t border-neutral-100 space-y-2 text-[11px]">
              <div className="flex justify-between text-neutral-500">
                <span>Discipline:</span>
                <strong className="text-black uppercase">{o.category}</strong>
              </div>
              <div className="flex justify-between text-neutral-500">
                <span>Room Blocked:</span>
                <strong className={o.blocksRoom ? 'text-rose-600 font-bold' : 'text-neutral-600'}>
                  {o.blocksRoom ? 'Out of Service (OOO)' : 'In Service'}
                </strong>
              </div>
              <div className="flex justify-between text-neutral-500">
                <span>Horizon:</span>
                <span className="font-mono text-neutral-800">{o.startDate} to {o.expectedEndDate}</span>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* ─── NEW WORK ORDER & ROOM BLOCK MODAL ─── */}
      {modalOpen && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white border border-neutral-200 rounded-3xl p-6 sm:p-7 max-w-lg w-full shadow-2xl space-y-4 animate-in zoom-in-95">
            <h3 className="text-base font-black text-black">Log Maintenance Work Order & Room Block</h3>
            <p className="text-xs text-neutral-500 leading-relaxed">
              If marked as &quot;Blocks Room (Out of Order)&quot;, the system automatically verifies that zero guest reservations overlap with this period.
            </p>

            <div className="space-y-3 text-xs">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-[10px] font-bold text-neutral-600 uppercase tracking-wider block mb-1">
                    Target Room
                  </label>
                  <select
                    value={selectedRoomId}
                    onChange={(e) => setSelectedRoomId(e.target.value)}
                    className="w-full bg-neutral-50 border border-neutral-300 rounded-xl px-3 py-2 text-xs font-bold font-mono text-black focus:outline-none"
                  >
                    {rooms.map((r) => (
                      <option key={r.id} value={r.id}>
                        Room {r.number} ({r.typeName || r.type})
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="text-[10px] font-bold text-neutral-600 uppercase tracking-wider block mb-1">
                    Category
                  </label>
                  <select
                    value={category}
                    onChange={(e) => setCategory(e.target.value as any)}
                    className="w-full bg-neutral-50 border border-neutral-300 rounded-xl px-3 py-2 text-xs font-bold text-black focus:outline-none capitalize"
                  >
                    <option value="hvac">HVAC / Air Conditioning</option>
                    <option value="plumbing">Plumbing & Water</option>
                    <option value="electrical">Electrical & Lighting</option>
                    <option value="carpentry">Carpentry & Locks</option>
                    <option value="painting">Painting / Touch-up</option>
                    <option value="furniture">Furniture / Bedding</option>
                    <option value="other">General Facilities</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="text-[10px] font-bold text-neutral-600 uppercase tracking-wider block mb-1">
                  Issue Title
                </label>
                <input
                  type="text"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  className="w-full bg-neutral-50 border border-neutral-300 rounded-xl px-3 py-2 text-xs font-bold text-black focus:outline-none"
                />
              </div>

              <div>
                <label className="text-[10px] font-bold text-neutral-600 uppercase tracking-wider block mb-1">
                  Description / Findings
                </label>
                <textarea
                  rows={2}
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  className="w-full bg-neutral-50 border border-neutral-300 rounded-xl p-2.5 text-xs text-black focus:outline-none"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-[10px] font-bold text-neutral-600 uppercase tracking-wider block mb-1">
                    Start Date
                  </label>
                  <input
                    type="date"
                    value={startDate}
                    onChange={(e) => setStartDate(e.target.value)}
                    className="w-full bg-neutral-50 border border-neutral-300 rounded-xl px-3 py-2 text-xs font-mono text-black"
                  />
                </div>
                <div>
                  <label className="text-[10px] font-bold text-neutral-600 uppercase tracking-wider block mb-1">
                    Expected Completion
                  </label>
                  <input
                    type="date"
                    value={endDate}
                    onChange={(e) => setEndDate(e.target.value)}
                    className="w-full bg-neutral-50 border border-neutral-300 rounded-xl px-3 py-2 text-xs font-mono text-black"
                  />
                </div>
              </div>

              <div className="p-3 bg-neutral-50 border border-neutral-200 rounded-xl flex items-center justify-between">
                <div>
                  <span className="font-bold text-black block">Block Room (Out of Order)</span>
                  <span className="text-[10px] text-neutral-500">
                    Removes room from booking availability while under maintenance.
                  </span>
                </div>
                <input
                  type="checkbox"
                  checked={blocksRoom}
                  onChange={(e) => setBlocksRoom(e.target.checked)}
                  className="w-4 h-4 accent-black"
                />
              </div>
            </div>

            <div className="flex justify-end gap-2 pt-2 border-t border-neutral-100">
              <button
                onClick={() => setModalOpen(false)}
                className="px-4 py-2 rounded-xl text-neutral-600 hover:bg-neutral-100 text-xs font-bold"
              >
                Cancel
              </button>
              <button
                onClick={handleCreateWorkOrder}
                className="px-5 py-2.5 rounded-xl bg-black text-white text-xs font-bold hover:bg-neutral-800 cursor-pointer"
              >
                Validate & Create Work Order
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ─── ROOM MOVE MODAL WITH DOUBLE-BOOKING CHECK ─── */}
      {roomMoveModal && movingReservation && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white border border-neutral-200 rounded-3xl p-6 sm:p-7 max-w-md w-full shadow-2xl space-y-4 animate-in zoom-in-95">
            <h3 className="text-base font-black text-black">Relocate Guest (Room Move)</h3>
            <p className="text-xs text-neutral-500 leading-relaxed">
              Moving <strong className="text-black">{movingReservation.guestName}</strong> ({movingReservation.checkIn} to {movingReservation.checkOut}) before maintenance begins.
            </p>

            <div className="space-y-3 text-xs">
              <div>
                <label className="text-[10px] font-bold text-neutral-600 uppercase tracking-wider block mb-1">
                  Select New Room
                </label>
                <select
                  value={targetRoomId}
                  onChange={(e) => {
                    setTargetRoomId(e.target.value);
                    setDoubleBookingCheckResult(null);
                  }}
                  className="w-full bg-neutral-50 border border-neutral-300 rounded-xl px-3 py-2 text-xs font-bold font-mono text-black"
                >
                  <option value="">-- Choose Target Room --</option>
                  {rooms
                    .filter((r) => r.id !== movingReservation.roomId)
                    .map((r) => (
                      <option key={r.id} value={r.id}>
                        Room {r.number} ({r.typeName || r.type}) - ₦{r.pricePerNight?.toLocaleString()}
                      </option>
                    ))}
                </select>
              </div>

              {targetRoomId && (
                <div className="pt-1">
                  <button
                    onClick={handleVerifyRoomMove}
                    className="w-full py-2 bg-neutral-100 hover:bg-neutral-200 text-neutral-800 rounded-xl font-bold text-xs transition-colors cursor-pointer"
                  >
                    Run Server-Side Conflict Check
                  </button>
                </div>
              )}

              {doubleBookingCheckResult && (
                <div className={`p-3 rounded-xl border text-[11px] font-semibold ${
                  doubleBookingCheckResult === 'SUCCESS_CLEAR'
                    ? 'bg-emerald-50 text-emerald-800 border-emerald-200'
                    : 'bg-rose-50 text-rose-800 border-rose-200'
                }`}>
                  {doubleBookingCheckResult === 'SUCCESS_CLEAR'
                    ? 'Target room is 100% available with zero conflicts for guest dates.'
                    : doubleBookingCheckResult}
                </div>
              )}
            </div>

            <div className="flex justify-end gap-2 pt-2 border-t border-neutral-100">
              <button
                onClick={() => setRoomMoveModal(false)}
                className="px-4 py-2 rounded-xl text-neutral-600 hover:bg-neutral-100 text-xs font-bold"
              >
                Cancel
              </button>
              <button
                disabled={doubleBookingCheckResult !== 'SUCCESS_CLEAR'}
                onClick={handleExecuteRoomMove}
                className="px-5 py-2.5 rounded-xl bg-black text-white text-xs font-bold hover:bg-neutral-800 cursor-pointer disabled:opacity-40"
              >
                Execute Room Move
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
