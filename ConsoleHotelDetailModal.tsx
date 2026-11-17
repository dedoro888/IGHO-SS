import React, { useState } from 'react';
import {
  X,
  Building2,
  MapPin,
  Mail,
  Phone,
  Calendar,
  Bed,
  Users,
  CreditCard,
  History,
  ShieldCheck,
  AlertCircle,
  ExternalLink,
  Edit2,
  Check,
} from 'lucide-react';
import {
  Hotel,
  Room,
  Reservation,
  StaffAccount,
  HotelSubscription,
  PlatformAuditLog,
} from '../../types';
import { formatHotelId } from '../../utils/hotelId';

interface ConsoleHotelDetailModalProps {
  hotel: Hotel | null;
  allRooms: Room[];
  allReservations: Reservation[];
  allStaff: StaffAccount[];
  subscription?: HotelSubscription;
  auditLogs: PlatformAuditLog[];
  onClose: () => void;
  onSuspend: (hotel: Hotel, reason: string) => void;
  onReactivate: (hotel: Hotel) => void;
  onDeleteRequest: (hotel: Hotel) => void;
  onRenameHotel?: (hotelId: string, newName: string) => void;
}

export const ConsoleHotelDetailModal: React.FC<ConsoleHotelDetailModalProps> = ({
  hotel,
  allRooms,
  allReservations,
  allStaff,
  subscription,
  auditLogs,
  onClose,
  onSuspend,
  onReactivate,
  onDeleteRequest,
  onRenameHotel,
}) => {
  const [activeTab, setActiveTab] = useState<
    'overview' | 'owner' | 'staff' | 'rooms' | 'reservations' | 'subscription' | 'activity'
  >('overview');
  const [isEditingName, setIsEditingName] = useState(false);
  const [editedName, setEditedName] = useState(hotel?.name || '');
  const [suspending, setSuspending] = useState(false);
  const [suspendReason, setSuspendReason] = useState('');
  const [suspendError, setSuspendError] = useState('');

  if (!hotel) return null;

  const hotelRooms = allRooms.filter(
    (r) => r.hotelId === hotel.id || r.branchId === hotel.id || (!r.hotelId && hotel.id === 'hotel-lava')
  );
  const hotelReservations = allReservations.filter((r) => r.hotelId === hotel.id);
  const hotelStaff = allStaff.filter((s) => s.hotelId === hotel.id);
  const hotelLogs = auditLogs.filter(
    (l) => l.target.includes(hotel.name) || l.target.includes(hotel.id)
  );

  const isSuspended = (hotel as any).isSuspended === true;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-6 bg-black/60 backdrop-blur-xs animate-in fade-in duration-150">
      <div className="bg-white border border-neutral-200 rounded-2xl w-full max-w-4xl max-h-[90vh] flex flex-col shadow-2xl overflow-hidden text-neutral-900">
        {/* Header */}
        <div className="px-6 py-4 border-b border-neutral-200 flex items-center justify-between bg-white">
          <div className="flex items-center gap-3.5 min-w-0">
            {hotel.coverImage ? (
              <img
                src={hotel.coverImage}
                alt={hotel.name}
                className="w-12 h-12 object-cover rounded-2xl border border-neutral-200 shrink-0"
              />
            ) : (
              <div className="w-12 h-12 rounded-2xl bg-neutral-100 border border-neutral-200 flex items-center justify-center shrink-0 text-neutral-600">
                <Building2 className="w-6 h-6" />
              </div>
            )}
            <div className="truncate">
              <div className="flex items-center gap-2 flex-wrap">
                {isEditingName ? (
                  <div className="flex items-center gap-1.5">
                    <input
                      type="text"
                      value={editedName}
                      onChange={(e) => setEditedName(e.target.value)}
                      className="px-2.5 py-1 rounded-lg border border-neutral-300 text-sm font-bold text-black bg-neutral-50 focus:outline-none focus:border-black"
                      placeholder="Organization Name"
                    />
                    <button
                      type="button"
                      onClick={() => {
                        if (editedName.trim() && onRenameHotel) {
                          onRenameHotel(hotel.id, editedName.trim());
                        }
                        setIsEditingName(false);
                      }}
                      className="p-1.5 rounded-lg bg-black text-white hover:bg-neutral-800 cursor-pointer"
                      title="Save Organization Name"
                    >
                      <Check className="w-3.5 h-3.5" />
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setEditedName(hotel.name);
                        setIsEditingName(false);
                      }}
                      className="p-1.5 rounded-lg border border-neutral-200 text-neutral-600 hover:bg-neutral-100 cursor-pointer"
                      title="Cancel"
                    >
                      <X className="w-3.5 h-3.5" />
                    </button>
                  </div>
                ) : (
                  <div className="flex items-center gap-1.5">
                    <h3 className="text-base font-bold text-black truncate">{hotel.name}</h3>
                    {onRenameHotel && (
                      <button
                        type="button"
                        onClick={() => {
                          setEditedName(hotel.name);
                          setIsEditingName(true);
                        }}
                        className="p-1 rounded-lg text-neutral-400 hover:text-black hover:bg-neutral-100 transition-colors cursor-pointer"
                        title="Edit Organization Name"
                      >
                        <Edit2 className="w-3.5 h-3.5" />
                      </button>
                    )}
                  </div>
                )}
                <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-neutral-100 border border-neutral-200 text-neutral-700">
                  ID: {formatHotelId(hotel.id)}
                </span>
                {isSuspended ? (
                  <span className="text-[10px] font-bold text-rose-700 bg-rose-50 border border-rose-200 px-2 py-0.5 rounded-full">
                    SUSPENDED
                  </span>
                ) : hotel.isLive ? (
                  <span className="text-[10px] font-bold text-emerald-700 bg-emerald-50 border border-emerald-200 px-2 py-0.5 rounded-full">
                    LIVE / ACTIVE
                  </span>
                ) : (
                  <span className="text-[10px] font-bold text-amber-700 bg-amber-50 border border-amber-200 px-2 py-0.5 rounded-full">
                    PENDING APPROVAL
                  </span>
                )}
              </div>
              <p className="text-xs text-neutral-500 truncate mt-0.5">
                {hotel.address ? `${hotel.address}, ` : ''}{hotel.city}, {hotel.state}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={onClose}
              className="p-2 rounded-full text-neutral-400 hover:text-black hover:bg-neutral-100 transition-colors cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Tab Navigation */}
        <div className="flex items-center gap-1 px-6 border-b border-neutral-200 bg-white text-xs font-semibold overflow-x-auto py-2">
          {[
            { id: 'overview', label: 'Overview' },
            { id: 'owner', label: 'Owner' },
            { id: 'staff', label: `Staff (${hotelStaff.length})` },
            { id: 'rooms', label: `Rooms (${hotelRooms.length})` },
            { id: 'reservations', label: `Reservations (${hotelReservations.length})` },
            { id: 'subscription', label: 'Subscription' },
            { id: 'activity', label: 'Audit Activity' },
          ].map((t) => (
            <button
              key={t.id}
              onClick={() => setActiveTab(t.id as any)}
              className={`px-3 py-1.5 rounded-xl transition-colors shrink-0 ${
                activeTab === t.id
                  ? 'bg-black text-white font-bold shadow-xs'
                  : 'text-neutral-600 hover:text-black hover:bg-neutral-100'
              }`}
            >
              {t.label}
            </button>
          ))}
        </div>

        {/* Content Body */}
        <div className="p-6 overflow-y-auto space-y-6 flex-1 bg-neutral-50 text-xs text-neutral-800">
          {/* TAB 1: OVERVIEW */}
          {activeTab === 'overview' && (
            <div className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div className="p-4 bg-white rounded-2xl border border-neutral-200 shadow-xs space-y-1">
                  <span className="text-[10px] uppercase font-bold text-neutral-500">Total Rooms</span>
                  <div className="text-xl font-black text-black">{hotel.roomCount || hotelRooms.length}</div>
                </div>
                <div className="p-4 bg-white rounded-2xl border border-neutral-200 shadow-xs space-y-1">
                  <span className="text-[10px] uppercase font-bold text-neutral-500">Total Reservations</span>
                  <div className="text-xl font-black text-black">{hotelReservations.length}</div>
                </div>
                <div className="p-4 bg-white rounded-2xl border border-neutral-200 shadow-xs space-y-1">
                  <span className="text-[10px] uppercase font-bold text-neutral-500">Authorized Staff</span>
                  <div className="text-xl font-black text-black">{hotelStaff.length}</div>
                </div>
              </div>

              <div className="bg-white rounded-2xl border border-neutral-200 p-5 shadow-xs space-y-3">
                <h4 className="font-bold text-sm text-black">Property Details</h4>
                <div className="grid grid-cols-2 gap-3 text-xs">
                  <div>
                    <span className="text-neutral-500 block text-[10px] uppercase font-bold">Email</span>
                    <span className="font-medium text-neutral-900">{hotel.email || 'None registered'}</span>
                  </div>
                  <div>
                    <span className="text-neutral-500 block text-[10px] uppercase font-bold">Phone</span>
                    <span className="font-medium text-neutral-900">{hotel.phone || 'None registered'}</span>
                  </div>
                  <div>
                    <span className="text-neutral-500 block text-[10px] uppercase font-bold">Address</span>
                    <span className="font-medium text-neutral-900">{hotel.address || 'N/A'}</span>
                  </div>
                  <div>
                    <span className="text-neutral-500 block text-[10px] uppercase font-bold">State & City</span>
                    <span className="font-medium text-neutral-900">{hotel.city}, {hotel.state}</span>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* TAB 2: OWNER */}
          {activeTab === 'owner' && (
            <div className="bg-white rounded-2xl border border-neutral-200 p-5 shadow-xs space-y-3">
              <h4 className="font-bold text-sm text-black">Hotel Primary Owner / Administrator</h4>
              <p className="text-neutral-600 leading-relaxed">
                Contact: <span className="font-bold text-black">{hotel.email || 'Pending registration'}</span>
              </p>
            </div>
          )}

          {/* TAB 3: STAFF */}
          {activeTab === 'staff' && (
            <div className="bg-white rounded-2xl border border-neutral-200 shadow-xs overflow-hidden">
              {hotelStaff.length === 0 ? (
                <div className="p-8 text-center text-neutral-500">No staff accounts registered for this property yet.</div>
              ) : (
                <table className="w-full text-left">
                  <thead className="bg-neutral-50 border-b border-neutral-200 text-[10px] font-bold uppercase text-neutral-500">
                    <tr>
                      <th className="p-3">Name</th>
                      <th className="p-3">Email</th>
                      <th className="p-3">Role</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-neutral-100">
                    {hotelStaff.map((s) => (
                      <tr key={s.id}>
                        <td className="p-3 font-bold text-black">{s.name}</td>
                        <td className="p-3 font-mono">{s.email}</td>
                        <td className="p-3 capitalize">{s.role}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>
          )}

          {/* TAB 4: ROOMS */}
          {activeTab === 'rooms' && (
            <div className="space-y-4">
              {/* Rooms Summary Bar */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
                <div className="bg-white border border-neutral-200 rounded-xl p-3 shadow-xs">
                  <span className="text-[10px] uppercase font-bold text-neutral-400 block">Total Rooms</span>
                  <span className="text-lg font-black text-black font-mono">{hotelRooms.length}</span>
                </div>
                <div className="bg-white border border-neutral-200 rounded-xl p-3 shadow-xs">
                  <span className="text-[10px] uppercase font-bold text-emerald-600 block">Available</span>
                  <span className="text-lg font-black text-emerald-700 font-mono">
                    {hotelRooms.filter((r) => r.status === 'available' || r.status === 'Vacant / Clean').length}
                  </span>
                </div>
                <div className="bg-white border border-neutral-200 rounded-xl p-3 shadow-xs">
                  <span className="text-[10px] uppercase font-bold text-rose-600 block">Occupied</span>
                  <span className="text-lg font-black text-rose-700 font-mono">
                    {hotelRooms.filter((r) => r.status === 'occupied' || (typeof r.status === 'string' && r.status.startsWith('Occupied'))).length}
                  </span>
                </div>
                <div className="bg-white border border-neutral-200 rounded-xl p-3 shadow-xs">
                  <span className="text-[10px] uppercase font-bold text-blue-600 block">Reserved / Other</span>
                  <span className="text-lg font-black text-blue-700 font-mono">
                    {hotelRooms.filter((r) => r.status === 'reserved' || r.status === 'cleaning' || r.status === 'maintenance').length}
                  </span>
                </div>
              </div>

              {/* Room Cards Grid */}
              <div className="bg-white rounded-2xl border border-neutral-200 shadow-xs p-4">
                {hotelRooms.length === 0 ? (
                  <div className="p-8 text-center text-neutral-500">No rooms configured for this property yet.</div>
                ) : (
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                    {hotelRooms.map((r) => {
                      const roomNum = r.number || r.id.replace('room-', '');
                      const isOccupied = r.status === 'occupied' || (typeof r.status === 'string' && r.status.startsWith('Occupied'));
                      const isAvailable = r.status === 'available' || r.status === 'Vacant / Clean';
                      const isReserved = r.status === 'reserved';
                      const isCleaning = r.status === 'cleaning' || (typeof r.status === 'string' && r.status.includes('Cleaning'));

                      return (
                        <div
                          key={r.id}
                          className="p-3.5 rounded-xl border border-neutral-200 bg-neutral-50/70 hover:bg-neutral-50 transition-colors flex flex-col justify-between gap-2.5"
                        >
                          <div className="flex items-start justify-between gap-2">
                            <div className="flex items-center gap-2">
                              <span className="px-2.5 py-1 rounded-lg bg-black text-white font-mono font-black text-xs shadow-xs">
                                Room {roomNum}
                              </span>
                              {r.floor && (
                                <span className="text-[10px] font-mono text-neutral-500 font-semibold">
                                  Fl. {r.floor}
                                </span>
                              )}
                            </div>
                            <span
                              className={`text-[10px] font-bold px-2 py-0.5 rounded-full border font-mono ${
                                isOccupied
                                  ? 'bg-rose-50 text-rose-700 border-rose-200'
                                  : isAvailable
                                  ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                                  : isReserved
                                  ? 'bg-blue-50 text-blue-700 border-blue-200'
                                  : isCleaning
                                  ? 'bg-amber-50 text-amber-700 border-amber-200'
                                  : 'bg-neutral-100 text-neutral-700 border-neutral-200'
                              }`}
                            >
                              {r.status}
                            </span>
                          </div>

                          <div>
                            <div className="font-bold text-xs text-black line-clamp-1">{r.typeName || r.type}</div>
                            <div className="text-[10px] text-neutral-500 mt-0.5 flex items-center gap-2">
                              {r.beds && <span>{r.beds}</span>}
                              {r.view && <span>• {r.view}</span>}
                            </div>
                          </div>

                          <div className="pt-2 border-t border-neutral-200 flex items-center justify-between">
                            <span className="text-[10px] text-neutral-400 font-medium">Rate / Night</span>
                            <span className="text-xs font-black font-mono text-black">
                              ₦{r.pricePerNight?.toLocaleString()}
                            </span>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            </div>
          )}

          {/* TAB 5: RESERVATIONS */}
          {activeTab === 'reservations' && (
            <div className="bg-white rounded-2xl border border-neutral-200 shadow-xs overflow-hidden">
              {hotelReservations.length === 0 ? (
                <div className="p-8 text-center text-neutral-500">No bookings recorded yet.</div>
              ) : (
                <table className="w-full text-left">
                  <thead className="bg-neutral-50 border-b border-neutral-200 text-[10px] font-bold uppercase text-neutral-500">
                    <tr>
                      <th className="p-3">Code</th>
                      <th className="p-3">Guest</th>
                      <th className="p-3">Total</th>
                      <th className="p-3">Status</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-neutral-100">
                    {hotelReservations.map((res) => (
                      <tr key={res.id}>
                        <td className="p-3 font-mono font-bold text-black">{res.confirmationCode}</td>
                        <td className="p-3">{res.guestName}</td>
                        <td className="p-3 font-mono">₦{res.totalAmount?.toLocaleString()}</td>
                        <td className="p-3 capitalize">{res.status}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>
          )}

          {/* TAB 6: SUBSCRIPTION */}
          {activeTab === 'subscription' && (
            <div className="bg-white rounded-2xl border border-neutral-200 p-5 shadow-xs space-y-3">
              <h4 className="font-bold text-sm text-black">Subscription Status</h4>
              <p className="text-neutral-600">
                Current Plan: <span className="font-bold text-black">{subscription?.planName || 'Standard / Trial'}</span>
              </p>
            </div>
          )}

          {/* TAB 7: ACTIVITY */}
          {activeTab === 'activity' && (
            <div className="bg-white rounded-2xl border border-neutral-200 p-5 shadow-xs space-y-3">
              <h4 className="font-bold text-sm text-black">Audit History</h4>
              {hotelLogs.length === 0 ? (
                <p className="text-neutral-500">No audit events recorded for this property yet.</p>
              ) : (
                <div className="divide-y divide-neutral-100">
                  {hotelLogs.map((log) => (
                    <div key={log.id} className="py-2 flex items-center justify-between">
                      <span className="font-mono text-black font-semibold">{log.action}</span>
                      <span className="text-neutral-500 font-mono text-[10px]">{log.timestamp}</span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>

        {/* Inline Suspension Confirmation Panel */}
        {suspending && !isSuspended && (
          <div className="px-6 py-4 border-t border-amber-200 bg-amber-50/70 space-y-2.5 text-xs">
            <div className="font-bold text-amber-950">Provide Suspension Reason:</div>
            <input
              type="text"
              value={suspendReason}
              onChange={(e) => {
                setSuspendReason(e.target.value);
                if (suspendError) setSuspendError('');
              }}
              placeholder="e.g., Policy violation, overdue subscription, unverified documentation..."
              className="w-full px-3 py-2 rounded-xl border border-amber-300 bg-white text-neutral-900 focus:outline-none focus:border-black"
            />
            {suspendError && (
              <div className="text-rose-700 font-semibold text-[11px]">{suspendError}</div>
            )}
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => {
                  if (!suspendReason.trim()) {
                    setSuspendError('Please enter a reason before suspending this hotel.');
                    return;
                  }
                  onSuspend(hotel, suspendReason.trim());
                  setSuspending(false);
                  setSuspendReason('');
                }}
                className="px-3.5 py-1.5 rounded-xl bg-amber-600 text-white font-bold hover:bg-amber-700 transition-colors cursor-pointer"
              >
                Confirm Suspension
              </button>
              <button
                type="button"
                onClick={() => {
                  setSuspending(false);
                  setSuspendError('');
                }}
                className="px-3.5 py-1.5 rounded-xl border border-neutral-300 bg-white text-neutral-700 font-semibold hover:bg-neutral-100 cursor-pointer"
              >
                Cancel
              </button>
            </div>
          </div>
        )}

        {/* Footer Actions */}
        <div className="px-6 py-4 border-t border-neutral-200 bg-white flex flex-col sm:flex-row items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            {isSuspended ? (
              <button
                onClick={() => onReactivate(hotel)}
                className="px-3.5 py-2 rounded-xl bg-emerald-600 text-white font-bold text-xs hover:bg-emerald-700 transition-colors shadow-xs"
              >
                Reactivate Hotel Access
              </button>
            ) : (
              <button
                onClick={() => {
                  setSuspending(true);
                  setSuspendReason('');
                  setSuspendError('');
                }}
                className="px-3.5 py-2 rounded-xl border border-amber-300 bg-amber-50 text-amber-800 font-bold text-xs hover:bg-amber-100 transition-colors"
              >
                Suspend Hotel
              </button>
            )}

            <button
              onClick={() => onDeleteRequest(hotel)}
              className="px-3.5 py-2 rounded-xl border border-rose-300 bg-rose-50 text-rose-700 font-bold text-xs hover:bg-rose-100 transition-colors"
            >
              Delete Hotel...
            </button>
          </div>

          <button
            onClick={onClose}
            className="px-4 py-2 rounded-full bg-neutral-100 hover:bg-neutral-200 border border-neutral-200 text-neutral-900 font-bold text-xs transition-colors"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
};
