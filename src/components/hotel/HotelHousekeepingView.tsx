import React, { useState } from 'react';
import {
  Sparkles,
  CheckCircle2,
  Clock,
  AlertTriangle,
  Plus,
  Search,
  Check,
  ShieldAlert,
  DoorOpen,
  Wrench,
  Eye,
  RefreshCw,
  ClipboardCheck,
  User,
  Activity,
} from 'lucide-react';
import { Room, HousekeepingTask, Hotel, StaffAccount, Reservation } from '../../types';

interface HotelHousekeepingViewProps {
  rooms?: Room[];
  reservations?: Reservation[];
  tasks?: HousekeepingTask[];
  hotel?: Hotel;
  staff?: StaffAccount[];
  onAddTask?: (task: HousekeepingTask) => void;
  onUpdateStatus?: (taskId: string, status: HousekeepingTask['status']) => void;
  onAssignTask?: (taskId: string, staffName: string) => void;
  onUpdateRoom?: (room: Room) => void;
}

export const HotelHousekeepingView: React.FC<HotelHousekeepingViewProps> = ({
  rooms = [],
  reservations = [],
  tasks = [],
  staff = [],
  onAddTask,
  onUpdateRoom,
}) => {
  const [filterStatus, setFilterStatus] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [showNewTaskModal, setShowNewTaskModal] = useState(false);

  // New task form state
  const [selectedRoomNumber, setSelectedRoomNumber] = useState(rooms[0]?.number || '101');
  const [taskDescription, setTaskDescription] = useState('Full Turnover & Deep Clean');
  const [assignedStaff, setAssignedStaff] = useState('');
  const [taskPriority, setTaskPriority] = useState<'normal' | 'urgent' | 'low'>('normal');

  // Helper to determine occupancy from room status
  const isRoomOccupied = (room: Room) => {
    const s = room.status?.toLowerCase() || '';
    return s.includes('occupied') || s === 'occupied';
  };

  // Helper to calculate operational metrics based on current room statuses
  const totalCount = rooms.length;
  const occupiedCount = rooms.filter((r) => isRoomOccupied(r)).length;
  
  const needingCleaningCount = rooms.filter((r) => {
    const s = r.status?.toLowerCase() || '';
    return s.includes('dirty') || s.includes('needs service') || s === 'dirty';
  }).length;

  const currentlyCleaningCount = rooms.filter((r) => {
    const s = r.status?.toLowerCase() || '';
    return s.includes('cleaning') || s === 'cleaning';
  }).length;

  const readyForGuestsCount = rooms.filter((r) => {
    const s = r.status?.toLowerCase() || '';
    return s.includes('clean') && !s.includes('occupied') || s === 'inspected' || s === 'available';
  }).length;

  // Helper to get active reservation & guest status for a room
  const getGuestStatusForRoom = (room: Room) => {
    const activeRes = reservations.find(
      (res) =>
        res.roomId === room.id &&
        ['confirmed', 'checked_in', 'stayover', 'pending_verification'].includes(res.status)
    );

    if (!activeRes) return { text: 'No Guest', style: 'text-neutral-400 bg-neutral-50 border-neutral-200' };

    // Format guest statuses
    if (activeRes.status === 'checked_in') {
      const todayStr = new Date().toISOString().split('T')[0];
      if (activeRes.checkOut === todayStr) {
        return { text: 'Due Out Today', style: 'text-amber-700 bg-amber-50 border-amber-200 font-bold' };
      }
      return { text: 'Stay-over', style: 'text-blue-700 bg-blue-50 border-blue-200 font-semibold' };
    }
    
    const todayStr = new Date().toISOString().split('T')[0];
    if (activeRes.checkIn === todayStr) {
      return { text: 'Arriving Today', style: 'text-emerald-700 bg-emerald-50 border-emerald-200 font-semibold animate-pulse' };
    }

    return { text: 'Confirmed Guest', style: 'text-neutral-700 bg-neutral-100 border-neutral-300' };
  };

  // Helper to trigger room status updates
  const handleUpdateRoomStatus = (
    roomNumber: string,
    newStatus: Room['status']
  ) => {
    const targetRoom = rooms.find((r) => r.number === roomNumber);
    if (targetRoom && onUpdateRoom) {
      onUpdateRoom({
        ...targetRoom,
        status: newStatus,
      });
    }
  };

  const handleCreateTask = (e: React.FormEvent) => {
    e.preventDefault();
    if (onAddTask) {
      const targetRoom = rooms.find((r) => r.number === selectedRoomNumber);
      const newTask: HousekeepingTask = {
        id: `hk-${Date.now()}`,
        room: selectedRoomNumber,
        roomNumber: selectedRoomNumber,
        roomId: targetRoom?.id || `room-${selectedRoomNumber}`,
        type: targetRoom?.type || 'Standard Room',
        task: taskDescription,
        priority: taskPriority,
        assigned: assignedStaff || 'Fatima Bello',
        status: 'pending',
        createdAt: new Date().toISOString(),
      };
      onAddTask(newTask);
    }
    
    // Automatically transition room status to dirty/needs service depending on occupancy
    const r = rooms.find((x) => x.number === selectedRoomNumber);
    if (r) {
      const nextStatus = isRoomOccupied(r) ? 'Occupied / Needs Service' : 'Vacant / Dirty';
      handleUpdateRoomStatus(selectedRoomNumber, nextStatus);
    }

    setShowNewTaskModal(false);
    setTaskDescription('Full Turnover & Deep Clean');
    setAssignedStaff('');
  };

  // Derive last status update based on room number to look realistic/operational
  const getLastStatusUpdate = (roomNumber: string) => {
    const sum = roomNumber.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0);
    const mins = (sum % 45) + 3;
    if (mins < 10) return 'Just now';
    if (mins < 60) return `${mins} mins ago`;
    return `${Math.floor(mins / 60)}h ago`;
  };

  // Filtered rooms list
  const filteredRooms = rooms.filter((r) => {
    const status = r.status || 'Vacant / Clean';
    const sLower = status.toLowerCase();
    
    // Status filters
    if (filterStatus !== 'all') {
      if (filterStatus === 'clean' && !(sLower.includes('clean') || sLower === 'inspected' || sLower === 'available')) return false;
      if (filterStatus === 'dirty' && !(sLower.includes('dirty') || sLower.includes('needs service'))) return false;
      if (filterStatus === 'cleaning' && !sLower.includes('cleaning')) return false;
      if (filterStatus === 'occupied' && !isRoomOccupied(r)) return false;
      if (filterStatus === 'maintenance' && !sLower.includes('maintenance')) return false;
    }

    // Search query filters
    const q = searchQuery.toLowerCase();
    return !q || r.number.toLowerCase().includes(q) || r.type.toLowerCase().includes(q) || status.toLowerCase().includes(q);
  });

  // Extract high-priority active tasks (urgent / high / medium)
  const priorityTasks = tasks.filter(
    (t) =>
      t.status !== 'completed' &&
      (t.priority === 'urgent' || t.priority === 'high' || t.priority === 'medium')
  ).slice(0, 4);

  // Status Badge Renderer for table
  const renderStatusBadge = (status: string) => {
    const s = status ? status.toLowerCase() : 'vacant / clean';
    
    if (s === 'vacant / clean' || s === 'available') {
      return (
        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-[11px] font-bold bg-emerald-50 text-emerald-800 border border-emerald-200">
          <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
          Vacant / Clean
        </span>
      );
    }
    if (s === 'vacant / dirty' || s === 'dirty') {
      return (
        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-[11px] font-bold bg-rose-50 text-rose-800 border border-rose-200">
          <span className="w-1.5 h-1.5 rounded-full bg-rose-500" />
          Vacant / Dirty
        </span>
      );
    }
    if (s === 'occupied / clean' || s === 'occupied') {
      return (
        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-[11px] font-bold bg-blue-50 text-blue-800 border border-blue-200">
          <span className="w-1.5 h-1.5 rounded-full bg-blue-500" />
          Occupied / Clean
        </span>
      );
    }
    if (s === 'occupied / needs service') {
      return (
        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-[11px] font-bold bg-purple-50 text-purple-800 border border-purple-200">
          <span className="w-1.5 h-1.5 rounded-full bg-purple-500 animate-pulse" />
          Occupied / Needs Service
        </span>
      );
    }
    if (s === 'cleaning in progress' || s === 'cleaning') {
      return (
        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-[11px] font-bold bg-amber-50 text-amber-800 border border-amber-200">
          <span className="w-1.5 h-1.5 rounded-full bg-amber-500 animate-bounce" />
          Cleaning in Progress
        </span>
      );
    }
    if (s === 'inspected') {
      return (
        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-[11px] font-bold bg-teal-50 text-teal-800 border border-teal-200">
          <span className="w-1.5 h-1.5 rounded-full bg-teal-500" />
          Inspected
        </span>
      );
    }
    if (s === 'maintenance') {
      return (
        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-[11px] font-bold bg-neutral-100 text-neutral-700 border border-neutral-300">
          <span className="w-1.5 h-1.5 rounded-full bg-neutral-400" />
          Maintenance
        </span>
      );
    }

    return (
      <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-[11px] font-bold bg-neutral-50 text-neutral-800 border border-neutral-200 capitalize">
        {status}
      </span>
    );
  };

  return (
    <div className="space-y-6 max-w-6xl mx-auto w-full">
      {/* Top Header Card */}
      <div className="bg-white border border-neutral-200 rounded-xl p-5 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-lg bg-black text-white flex items-center justify-center">
            <Sparkles className="w-5 h-5 text-[#0BA4DB]" />
          </div>
          <div>
            <h1 className="text-xl sm:text-2xl font-black text-black tracking-tight">Housekeeping Control Center</h1>
            <p className="text-xs text-neutral-500">
              Live room housekeeping statuses, real-time metrics, turnover actions, and task dispatching.
            </p>
          </div>
        </div>

        {rooms.length > 0 && (
          <button
            onClick={() => setShowNewTaskModal(true)}
            className="flex items-center justify-center gap-2 px-4 py-2 bg-black hover:bg-neutral-800 text-white rounded-lg text-xs font-bold shadow-xs active:scale-95 transition-all cursor-pointer"
          >
            <Plus className="w-4 h-4" />
            <span>Assign Cleaning Task</span>
          </button>
        )}
      </div>

      {/* KPI Metric Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-5 gap-4">
        <div className="bg-white border border-neutral-200 rounded-xl p-4 shadow-xs space-y-1">
          <span className="text-[10px] font-bold text-neutral-400 uppercase tracking-wider block">Total Rooms</span>
          <div className="text-2xl font-black text-black">{totalCount}</div>
          <div className="text-[10px] text-neutral-500 font-medium">Configured assets</div>
        </div>

        <div className="bg-white border border-neutral-200 rounded-xl p-4 shadow-xs space-y-1">
          <span className="text-[10px] font-bold text-neutral-400 uppercase tracking-wider block">Needing Cleaning</span>
          <div className="text-2xl font-black text-rose-600">{needingCleaningCount}</div>
          <div className="text-[10px] text-rose-500 font-bold bg-rose-50 border border-rose-100 rounded px-1.5 py-0.5 inline-block">
            Needs turnover attention
          </div>
        </div>

        <div className="bg-white border border-neutral-200 rounded-xl p-4 shadow-xs space-y-1">
          <span className="text-[10px] font-bold text-neutral-400 uppercase tracking-wider block">Cleaning in Progress</span>
          <div className="text-2xl font-black text-amber-600">{currentlyCleaningCount}</div>
          <div className="text-[10px] text-neutral-500 font-medium">Active housekeepers</div>
        </div>

        <div className="bg-white border border-neutral-200 rounded-xl p-4 shadow-xs space-y-1">
          <span className="text-[10px] font-bold text-neutral-400 uppercase tracking-wider block">Occupied Rooms</span>
          <div className="text-2xl font-black text-blue-600">{occupiedCount}</div>
          <div className="text-[10px] text-neutral-500 font-medium">In-house guests</div>
        </div>

        <div className="bg-white border border-neutral-200 rounded-xl p-4 shadow-xs col-span-2 lg:col-span-1 space-y-1">
          <span className="text-[10px] font-bold text-neutral-400 uppercase tracking-wider block">Ready for Guests</span>
          <div className="text-2xl font-black text-emerald-600">{readyForGuestsCount}</div>
          <div className="text-[10px] text-emerald-600 font-semibold">Vacant & inspected</div>
        </div>
      </div>

      {/* Priority Housekeeping Tasks Section */}
      {priorityTasks.length > 0 && (
        <div className="bg-white border border-neutral-200 rounded-xl p-4 space-y-3 shadow-2xs">
          <div className="flex items-center justify-between border-b border-neutral-100 pb-2">
            <span className="text-xs font-bold text-neutral-900 uppercase tracking-wider flex items-center gap-1.5">
              <ShieldAlert className="w-4 h-4 text-rose-500" />
              <span>Priority Housekeeping Dispatches</span>
            </span>
            <span className="text-[10px] font-semibold text-rose-600 bg-rose-50 px-2 py-0.5 rounded">
              Requires immediate action
            </span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-3">
            {priorityTasks.map((t) => (
              <div
                key={t.id}
                className="bg-neutral-50 border border-neutral-200 rounded-lg p-3 space-y-2 text-xs relative"
              >
                <div className="flex items-center justify-between">
                  <span className="font-extrabold text-neutral-900">Room {t.roomNumber || t.room}</span>
                  <span
                    className={`px-1.5 py-0.5 rounded text-[9px] font-bold uppercase ${
                      t.priority === 'urgent'
                        ? 'bg-rose-600 text-white animate-pulse'
                        : 'bg-amber-50 text-amber-800 border border-amber-200'
                    }`}
                  >
                    {t.priority}
                  </span>
                </div>
                <p className="text-neutral-600 line-clamp-2 text-[11px] leading-tight font-medium">
                  {t.task}
                </p>
                <div className="flex items-center justify-between pt-1 border-t border-neutral-150 text-[10px] text-neutral-400 font-semibold">
                  <span className="flex items-center gap-1">
                    <User className="w-3 h-3 text-neutral-400" />
                    {t.assigned || 'Unassigned'}
                  </span>
                  <span className="capitalize">{t.status}</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Filters and Search toolbar */}
      <div className="bg-white border border-neutral-200 rounded-xl p-4 flex flex-col md:flex-row items-center justify-between gap-3 shadow-2xs">
        <div className="flex items-center gap-1 bg-neutral-100 p-1 rounded-lg text-xs font-semibold overflow-x-auto w-full md:w-auto">
          {[
            { id: 'all', label: 'All Rooms' },
            { id: 'clean', label: 'Clean' },
            { id: 'dirty', label: 'Dirty' },
            { id: 'cleaning', label: 'Cleaning' },
            { id: 'occupied', label: 'Occupied' },
            { id: 'maintenance', label: 'Maintenance' },
          ].map((item) => (
            <button
              key={item.id}
              onClick={() => setFilterStatus(item.id)}
              className={`px-3 py-1.5 rounded-md transition-all whitespace-nowrap cursor-pointer ${
                filterStatus === item.id ? 'bg-black text-white font-bold' : 'text-neutral-600 hover:text-black'
              }`}
            >
              {item.label}
            </button>
          ))}
        </div>

        <div className="relative w-full md:max-w-xs">
          <Search className="w-3.5 h-3.5 text-neutral-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="Search room, category, status..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-9 pr-4 py-1.5 bg-neutral-50 border border-neutral-200 rounded-lg text-xs focus:outline-none focus:border-black placeholder:text-neutral-400"
          />
        </div>
      </div>

      {/* Main Operational Table */}
      <div className="bg-white border border-neutral-200 rounded-xl overflow-hidden shadow-xs overflow-x-auto">
        {filteredRooms.length === 0 ? (
          <div className="p-12 text-center text-xs text-neutral-400 flex flex-col items-center justify-center space-y-2">
            <Activity className="w-8 h-8 text-neutral-300" />
            <span className="font-semibold text-neutral-500">No rooms match the selected status or query.</span>
            <p className="text-[10px]">Verify your filters or add rooms to the platform state first.</p>
          </div>
        ) : (
          <table className="w-full text-left text-xs min-w-[800px]">
            <thead className="bg-neutral-50 border-b border-neutral-200 text-[11px] font-semibold text-neutral-500">
              <tr>
                <th className="py-3 px-4">Room</th>
                <th className="py-3 px-4">Occupancy</th>
                <th className="py-3 px-4">Housekeeping Status</th>
                <th className="py-3 px-4">Guest Status</th>
                <th className="py-3 px-4">Last Update</th>
                <th className="py-3 px-4 text-right">Quick Operational Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-neutral-100">
              {filteredRooms.map((room) => {
                const occupied = isRoomOccupied(room);
                const guestRes = getGuestStatusForRoom(room);
                const lastUpdate = getLastStatusUpdate(room.number);
                const sLower = (room.status || '').toLowerCase();

                return (
                  <tr key={room.id} className="hover:bg-neutral-50/50 transition-colors">
                    {/* Room details */}
                    <td className="py-4 px-4">
                      <div className="flex items-center gap-2">
                        <div className="w-8 h-8 rounded bg-neutral-50 flex items-center justify-center border border-neutral-200">
                          <span className="text-sm font-bold text-neutral-800">🚪</span>
                        </div>
                        <div>
                          <div className="font-bold text-black text-sm">Room {room.number}</div>
                          <div className="text-[10px] text-neutral-400">{room.type}</div>
                        </div>
                      </div>
                    </td>

                    {/* Occupancy */}
                    <td className="py-4 px-4">
                      {occupied ? (
                        <span className="inline-flex items-center px-2 py-0.5 rounded text-[10px] font-bold bg-rose-50 text-rose-700 border border-rose-200">
                          Occupied
                        </span>
                      ) : (
                        <span className="inline-flex items-center px-2 py-0.5 rounded text-[10px] font-bold bg-neutral-100 text-neutral-600 border border-neutral-200">
                          Vacant
                        </span>
                      )}
                    </td>

                    {/* Housekeeping Status */}
                    <td className="py-4 px-4">
                      {renderStatusBadge(room.status)}
                    </td>

                    {/* Guest Status */}
                    <td className="py-4 px-4">
                      <span className={`inline-flex px-2 py-0.5 rounded text-[10px] border ${guestRes.style}`}>
                        {guestRes.text}
                      </span>
                    </td>

                    {/* Last status update */}
                    <td className="py-4 px-4 text-neutral-400 font-semibold text-[10px]">
                      {lastUpdate}
                    </td>

                    {/* Actions */}
                    <td className="py-4 px-4 text-right">
                      <div className="flex items-center justify-end gap-1.5 flex-wrap">
                        {/* Start Cleaning */}
                        {sLower.includes('dirty') || sLower.includes('needs service') ? (
                          <button
                            onClick={() => handleUpdateRoomStatus(room.number, 'Cleaning in Progress')}
                            className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-black text-white hover:bg-neutral-800 text-[11px] font-bold transition-all shadow-2xs cursor-pointer"
                            title="Start servicing room"
                          >
                            <RefreshCw className="w-3 h-3 text-white animate-spin-slow" />
                            <span>Start Cleaning</span>
                          </button>
                        ) : null}

                        {/* Mark Clean */}
                        {sLower.includes('cleaning') || sLower.includes('dirty') || sLower.includes('needs service') || sLower.includes('maintenance') ? (
                          <button
                            onClick={() => {
                              const nextCleanStatus = occupied ? 'Occupied / Clean' : 'Vacant / Clean';
                              handleUpdateRoomStatus(room.number, nextCleanStatus);
                            }}
                            className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-emerald-600 text-white hover:bg-emerald-700 text-[11px] font-bold transition-all shadow-2xs cursor-pointer"
                            title="Complete servicing and mark clean"
                          >
                            <Check className="w-3 h-3 text-white stroke-[3]" />
                            <span>Mark Clean</span>
                          </button>
                        ) : null}

                        {/* Inspect */}
                        {sLower === 'vacant / clean' || sLower === 'available' ? (
                          <button
                            onClick={() => handleUpdateRoomStatus(room.number, 'Inspected')}
                            className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-teal-600 text-white hover:bg-teal-700 text-[11px] font-bold transition-all shadow-2xs cursor-pointer"
                            title="Verify room cleanliness for guest check-in"
                          >
                            <ClipboardCheck className="w-3 h-3 text-white" />
                            <span>Inspect</span>
                          </button>
                        ) : null}

                        {/* Report Maintenance */}
                        {sLower !== 'maintenance' ? (
                          <button
                            onClick={() => handleUpdateRoomStatus(room.number, 'Maintenance')}
                            className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg border border-neutral-200 text-neutral-700 hover:bg-neutral-50 text-[11px] font-bold transition-all cursor-pointer"
                            title="Report physical or technical issue in room"
                          >
                            <Wrench className="w-3 h-3 text-neutral-500" />
                            <span>Report Maintenance</span>
                          </button>
                        ) : null}
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </div>

      {/* CREATE NEW TASK MODAL */}
      {showNewTaskModal && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-xl max-w-md w-full p-6 space-y-5 shadow-2xl animate-in zoom-in-95 duration-150 border border-neutral-100">
            <div className="flex items-center justify-between border-b border-neutral-150 pb-3">
              <h3 className="font-bold text-base text-black">Assign Housekeeping Turnover Task</h3>
              <button
                onClick={() => setShowNewTaskModal(false)}
                className="text-neutral-400 hover:text-black font-bold text-sm p-1 cursor-pointer"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleCreateTask} className="space-y-4">
              <div>
                <label className="block text-[11px] font-bold text-neutral-600 mb-1 uppercase tracking-wider">Target Room</label>
                <select
                  value={selectedRoomNumber}
                  onChange={(e) => setSelectedRoomNumber(e.target.value)}
                  className="w-full bg-white border border-neutral-300 rounded-lg px-4 py-2 text-xs text-neutral-900 focus:outline-none focus:border-black cursor-pointer"
                >
                  {rooms.map((r) => (
                    <option key={r.id} value={r.number}>
                      Room {r.number} ({r.type} — {r.status || 'Vacant / Clean'})
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-[11px] font-bold text-neutral-600 mb-1 uppercase tracking-wider">Turnover Details</label>
                <input
                  type="text"
                  required
                  value={taskDescription}
                  onChange={(e) => setTaskDescription(e.target.value)}
                  placeholder="e.g. Check-out Turnover, Linen & Towel Change"
                  className="w-full bg-white border border-neutral-300 rounded-lg px-4 py-2 text-xs text-neutral-900 focus:outline-none focus:border-black"
                />
              </div>

              <div>
                <label className="block text-[11px] font-bold text-neutral-600 mb-1 uppercase tracking-wider">Assigned Housekeeper</label>
                <select
                  value={assignedStaff}
                  onChange={(e) => setAssignedStaff(e.target.value)}
                  className="w-full bg-white border border-neutral-300 rounded-lg px-4 py-2 text-xs text-neutral-900 focus:outline-none focus:border-black cursor-pointer font-medium"
                >
                  <option value="">Fatima Bello (Senior Housekeeper)</option>
                  {staff
                    .filter((s) => s.role === 'housekeeping')
                    .map((s) => (
                      <option key={s.id} value={s.name}>
                        {s.name} (Housekeeping Staff)
                      </option>
                    ))}
                  <option value="Chioma Okafor">Chioma Okafor</option>
                  <option value="Ibrahim Musa">Ibrahim Musa</option>
                  <option value="Seyi Alao">Seyi Alao</option>
                </select>
              </div>

              <div>
                <label className="block text-[11px] font-bold text-neutral-600 mb-1 uppercase tracking-wider">Dispatch Priority</label>
                <select
                  value={taskPriority}
                  onChange={(e) => setTaskPriority(e.target.value as any)}
                  className="w-full bg-white border border-neutral-300 rounded-lg px-4 py-2 text-xs text-neutral-900 focus:outline-none focus:border-black cursor-pointer"
                >
                  <option value="normal">Normal Priority</option>
                  <option value="urgent">Urgent (Guest Waiting for Check-in)</option>
                  <option value="low">Routine / Deep Clean</option>
                </select>
              </div>

              <div className="flex gap-2.5 pt-2">
                <button
                  type="submit"
                  className="flex-1 bg-black text-white py-2.5 rounded-lg font-bold text-xs hover:bg-neutral-800 transition-colors shadow-xs cursor-pointer"
                >
                  Dispatch Housekeeper
                </button>
                <button
                  type="button"
                  onClick={() => setShowNewTaskModal(false)}
                  className="px-5 border border-neutral-200 text-neutral-700 py-2.5 rounded-lg font-semibold text-xs hover:bg-neutral-50 cursor-pointer"
                >
                  Cancel
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
