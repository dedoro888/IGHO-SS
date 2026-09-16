import React, { useState } from 'react';
import {
  Sparkles,
  CheckCircle2,
  Clock,
  AlertTriangle,
  Plus,
  Filter,
  User,
  Search,
  Check,
  RotateCcw,
  ShieldAlert,
  DoorOpen,
  ArrowRight,
} from 'lucide-react';
import { Room, HousekeepingTask, Hotel, StaffAccount } from '../../types';

interface HotelHousekeepingViewProps {
  rooms?: Room[];
  tasks?: HousekeepingTask[];
  hotel?: Hotel;
  staff?: StaffAccount[];
  onAddTask?: (task: HousekeepingTask) => void;
  onUpdateStatus?: (taskId: string, status: HousekeepingTask['status']) => void;
  onAssignTask?: (taskId: string, staffName: string) => void;
}

export const HotelHousekeepingView: React.FC<HotelHousekeepingViewProps> = ({
  rooms = [],
  tasks = [],
  staff = [],
  onAddTask,
  onUpdateStatus,
  onAssignTask,
}) => {
  const [filterStatus, setFilterStatus] = useState<string>('all');
  const [filterPriority, setFilterPriority] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [showNewTaskModal, setShowNewTaskModal] = useState(false);

  // New task form state
  const [selectedRoomNumber, setSelectedRoomNumber] = useState(rooms[0]?.number || '101');
  const [taskDescription, setTaskDescription] = useState('Full Turnover & Deep Clean');
  const [assignedStaff, setAssignedStaff] = useState('Fatima Bello');
  const [taskPriority, setTaskPriority] = useState<'normal' | 'urgent' | 'low'>('normal');

  // Operational Room Cleaning Status State (derived & local)
  const [roomStatuses, setRoomStatuses] = useState<Record<string, 'clean' | 'dirty' | 'in_progress' | 'inspected' | 'out_of_service'>>(() => {
    const initial: Record<string, 'clean' | 'dirty' | 'in_progress' | 'inspected' | 'out_of_service'> = {};
    rooms.forEach((r, i) => {
      initial[r.number] = i % 3 === 0 ? 'dirty' : i % 4 === 0 ? 'in_progress' : 'clean';
    });
    return initial;
  });

  const handleUpdateRoomStatus = (roomNumber: string, status: 'clean' | 'dirty' | 'in_progress' | 'inspected' | 'out_of_service') => {
    setRoomStatuses((prev) => ({ ...prev, [roomNumber]: status }));
  };

  const handleCreateTask = (e: React.FormEvent) => {
    e.preventDefault();
    if (onAddTask) {
      const newTask: HousekeepingTask = {
        id: `hk-${Date.now()}`,
        room: selectedRoomNumber,
        type: rooms.find((r) => r.number === selectedRoomNumber)?.type || 'Standard Room',
        task: taskDescription,
        assigned: assignedStaff,
        status: 'pending',
      };
      onAddTask(newTask);
    }
    handleUpdateRoomStatus(selectedRoomNumber, 'dirty');
    setShowNewTaskModal(false);
  };

  // KPIs
  const total = rooms.length;
  const cleanCount = Object.values(roomStatuses).filter((s) => s === 'clean' || s === 'inspected').length;
  const dirtyCount = Object.values(roomStatuses).filter((s) => s === 'dirty').length;
  const inProgressCount = Object.values(roomStatuses).filter((s) => s === 'in_progress').length;
  const outOfServiceCount = Object.values(roomStatuses).filter((s) => s === 'out_of_service').length;

  const filteredRooms = rooms.filter((r) => {
    const status = roomStatuses[r.number] || 'clean';
    if (filterStatus !== 'all' && status !== filterStatus) return false;
    const q = searchQuery.toLowerCase();
    return !q || r.number.toLowerCase().includes(q) || r.type.toLowerCase().includes(q);
  });

  return (
    <div className="space-y-6 max-w-6xl">
      {/* Top Header */}
      <div className="bg-white border border-neutral-200 rounded-2xl p-5 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-black text-white flex items-center justify-center">
            <Sparkles className="w-5 h-5" />
          </div>
          <div>
            <h1 className="text-2xl font-black text-black tracking-tight">Housekeeping Operations</h1>
            <p className="text-xs text-neutral-500">
              Live room turnover, cleanliness status tracking, and housekeeping staff assignments.
            </p>
          </div>
        </div>

        <button
          onClick={() => setShowNewTaskModal(true)}
          className="flex items-center gap-2 px-4 py-2 bg-black hover:bg-neutral-800 text-white rounded-full text-xs font-bold shadow-xs active:scale-95 transition-all"
        >
          <Plus className="w-4 h-4" />
          <span>New Cleaning Task</span>
        </button>
      </div>

      {/* KPI Metric Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white border border-neutral-200 rounded-2xl p-4 shadow-xs space-y-1">
          <span className="text-[10px] font-bold text-neutral-400 uppercase tracking-wider block">Clean & Inspected</span>
          <div className="text-2xl font-black text-emerald-700">{cleanCount}</div>
          <div className="text-[11px] text-neutral-500 font-medium">Ready for immediate guest check-in</div>
        </div>

        <div className="bg-white border border-neutral-200 rounded-2xl p-4 shadow-xs space-y-1">
          <span className="text-[10px] font-bold text-neutral-400 uppercase tracking-wider block">Dirty / Turnover</span>
          <div className="text-2xl font-black text-rose-700">{dirtyCount}</div>
          <div className="text-[11px] text-neutral-500 font-medium">Requires housekeeping attention</div>
        </div>

        <div className="bg-white border border-neutral-200 rounded-2xl p-4 shadow-xs space-y-1">
          <span className="text-[10px] font-bold text-neutral-400 uppercase tracking-wider block">In Progress</span>
          <div className="text-2xl font-black text-amber-700">{inProgressCount}</div>
          <div className="text-[11px] text-neutral-500 font-medium">Housekeeper currently servicing</div>
        </div>

        <div className="bg-white border border-neutral-200 rounded-2xl p-4 shadow-xs space-y-1">
          <span className="text-[10px] font-bold text-neutral-400 uppercase tracking-wider block">Out of Service</span>
          <div className="text-2xl font-black text-neutral-700">{outOfServiceCount}</div>
          <div className="text-[11px] text-neutral-500 font-medium">Maintenance / offline</div>
        </div>
      </div>

      {/* Filter Tabs & Search */}
      <div className="bg-white border border-neutral-200 rounded-2xl p-4 shadow-xs flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-1.5 bg-neutral-100 p-1 rounded-full text-xs font-semibold overflow-x-auto">
          {['all', 'clean', 'dirty', 'in_progress', 'inspected', 'out_of_service'].map((st) => (
            <button
              key={st}
              onClick={() => setFilterStatus(st)}
              className={`px-3.5 py-1.5 rounded-full capitalize transition-colors whitespace-nowrap ${
                filterStatus === st ? 'bg-black text-white shadow-xs font-bold' : 'text-neutral-600 hover:text-black'
              }`}
            >
              {st.replace('_', ' ')}
            </button>
          ))}
        </div>

        <div className="relative min-w-[200px] max-w-xs">
          <Search className="w-3.5 h-3.5 text-neutral-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="Search room number..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-9 pr-4 py-1.5 bg-neutral-50 border border-neutral-200 rounded-full text-xs focus:outline-none focus:border-black"
          />
        </div>
      </div>

      {/* Operational Rooms Grid */}
      <div className="bg-white border border-neutral-200 rounded-2xl overflow-hidden shadow-xs">
        {filteredRooms.length === 0 ? (
          <div className="p-12 text-center text-xs text-neutral-400">
            No rooms match the selected housekeeping filter.
          </div>
        ) : (
          <table className="w-full text-left text-xs">
            <thead className="bg-neutral-50 border-b border-neutral-200 text-[11px] font-semibold text-neutral-500">
              <tr>
                <th className="py-3 px-4">Room</th>
                <th className="py-3 px-4">Category</th>
                <th className="py-3 px-4">Floor</th>
                <th className="py-3 px-4">Cleanliness Status</th>
                <th className="py-3 px-4">Housekeeper</th>
                <th className="py-3 px-4 text-right">Quick Operational Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-neutral-100">
              {filteredRooms.map((r) => {
                const currentStatus = roomStatuses[r.number] || 'clean';
                return (
                  <tr key={r.id} className="hover:bg-neutral-50/70 transition-colors">
                    <td className="py-3 px-4 font-bold text-black text-sm">Room {r.number}</td>
                    <td className="py-3 px-4 text-neutral-700">{r.type}</td>
                    <td className="py-3 px-4 text-neutral-500">Floor {r.floor || '1'}</td>
                    <td className="py-3 px-4">
                      <span
                        className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold border uppercase tracking-wider ${
                          currentStatus === 'clean' || currentStatus === 'inspected'
                            ? 'bg-emerald-50 text-emerald-800 border-emerald-200'
                            : currentStatus === 'dirty'
                            ? 'bg-rose-50 text-rose-800 border-rose-200'
                            : currentStatus === 'in_progress'
                            ? 'bg-amber-50 text-amber-900 border-amber-200'
                            : 'bg-neutral-100 text-neutral-700 border-neutral-300'
                        }`}
                      >
                        {currentStatus.replace('_', ' ')}
                      </span>
                    </td>
                    <td className="py-3 px-4 text-neutral-600">
                      {currentStatus === 'in_progress' ? 'Fatima Bello' : '—'}
                    </td>
                    <td className="py-3 px-4 text-right space-x-1.5">
                      {currentStatus !== 'clean' && (
                        <button
                          onClick={() => handleUpdateRoomStatus(r.number, 'clean')}
                          className="px-3 py-1 bg-emerald-600 hover:bg-emerald-700 text-white text-[11px] font-semibold rounded-full shadow-2xs transition-colors"
                        >
                          Mark Clean
                        </button>
                      )}
                      {currentStatus === 'dirty' && (
                        <button
                          onClick={() => handleUpdateRoomStatus(r.number, 'in_progress')}
                          className="px-3 py-1 bg-black text-white text-[11px] font-semibold rounded-full hover:bg-neutral-800 transition-colors"
                        >
                          Start Cleaning
                        </button>
                      )}
                      {currentStatus !== 'dirty' && (
                        <button
                          onClick={() => handleUpdateRoomStatus(r.number, 'dirty')}
                          className="px-3 py-1 border border-neutral-200 hover:bg-neutral-100 text-neutral-700 text-[11px] font-semibold rounded-full transition-colors"
                        >
                          Mark Dirty
                        </button>
                      )}
                      {currentStatus !== 'out_of_service' && (
                        <button
                          onClick={() => handleUpdateRoomStatus(r.number, 'out_of_service')}
                          className="px-3 py-1 border border-neutral-200 text-rose-600 hover:bg-rose-50 text-[11px] font-semibold rounded-full transition-colors"
                        >
                          OOS
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

      {/* CREATE NEW TASK MODAL */}
      {showNewTaskModal && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 space-y-5 shadow-2xl animate-in zoom-in-95 duration-150">
            <div className="flex items-center justify-between border-b border-neutral-100 pb-3">
              <h3 className="font-bold text-base text-black">Create Housekeeping Task</h3>
              <button
                onClick={() => setShowNewTaskModal(false)}
                className="text-neutral-400 hover:text-black font-bold text-sm p-1"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleCreateTask} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-neutral-700 mb-1">Target Room</label>
                <select
                  value={selectedRoomNumber}
                  onChange={(e) => setSelectedRoomNumber(e.target.value)}
                  className="w-full bg-white border border-neutral-300 rounded-full px-4 py-2 text-xs text-neutral-900 focus:outline-none focus:border-black"
                >
                  {rooms.map((r) => (
                    <option key={r.id} value={r.number}>
                      Room {r.number} ({r.type})
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-neutral-700 mb-1">Task Type</label>
                <input
                  type="text"
                  required
                  value={taskDescription}
                  onChange={(e) => setTaskDescription(e.target.value)}
                  placeholder="e.g. Check-out Turnover & Linen Replacement"
                  className="w-full bg-white border border-neutral-300 rounded-full px-4 py-2 text-xs text-neutral-900 focus:outline-none focus:border-black"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-neutral-700 mb-1">Assigned Housekeeper</label>
                <input
                  type="text"
                  required
                  value={assignedStaff}
                  onChange={(e) => setAssignedStaff(e.target.value)}
                  placeholder="e.g. Fatima Bello"
                  className="w-full bg-white border border-neutral-300 rounded-full px-4 py-2 text-xs text-neutral-900 focus:outline-none focus:border-black"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-neutral-700 mb-1">Priority</label>
                <select
                  value={taskPriority}
                  onChange={(e) => setTaskPriority(e.target.value as any)}
                  className="w-full bg-white border border-neutral-300 rounded-full px-4 py-2 text-xs text-neutral-900 focus:outline-none focus:border-black"
                >
                  <option value="normal">Normal</option>
                  <option value="urgent">Urgent (Guest Waiting)</option>
                  <option value="low">Low (Routine Check)</option>
                </select>
              </div>

              <div className="flex gap-2.5 pt-2">
                <button
                  type="submit"
                  className="flex-1 bg-black text-white py-2.5 rounded-full font-bold text-xs hover:bg-neutral-800 transition-colors shadow-xs"
                >
                  Assign & Dispatch Task
                </button>
                <button
                  type="button"
                  onClick={() => setShowNewTaskModal(false)}
                  className="px-5 border border-neutral-200 text-neutral-700 py-2.5 rounded-full font-semibold text-xs hover:bg-neutral-50"
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
