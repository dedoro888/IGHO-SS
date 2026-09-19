import React, { useState, useEffect } from 'react';
import {
  Search,
  Building2,
  CheckCircle2,
  Clock,
  FlaskConical,
  XCircle,
  MoreVertical,
  MapPin,
  ArrowUpRight,
  Plus,
  ArrowLeft,
  ChevronLeft,
  ChevronRight,
  Eye,
  AlertTriangle,
  Trash2,
  ShieldAlert,
  SlidersHorizontal,
  AlertCircle,
} from 'lucide-react';
import {
  Hotel,
  Room,
  Reservation,
  StaffAccount,
  HotelSubscription,
  PlatformAuditLog,
} from '../../types';
import { ConsoleHotelDetailModal } from './ConsoleHotelDetailModal';

interface DemoRequestEntry {
  id: string;
  fullName: string;
  email: string;
  phone: string;
  orgName: string;
  orgType: string;
  productInterested: string;
  demoDate: string;
  demoTime: string;
  message: string;
  status: 'pending' | 'scheduled' | 'completed' | 'cancelled';
  createdAt: string;
}

const INITIAL_DEMO_REQUESTS: DemoRequestEntry[] = [
  {
    id: "demo-stay-1",
    fullName: "Alhaji Bello",
    email: "bello@grandpalace.ng",
    phone: "+234 802 222 3333",
    orgName: "The Grand Palace Hotel",
    orgType: "Hotel & Hospitality",
    productInterested: "stay",
    demoDate: "2026-09-24",
    demoTime: "14:00",
    message: "We have 85 luxury rooms in Victoria Island and want to inspect Paystack split settlements and guest portal walkthrough.",
    status: "pending",
    createdAt: "2026-09-16"
  },
  {
    id: "demo-stay-2",
    fullName: "Engr. Victoria Adebayo",
    email: "v.adebayo@hilton-annex.com.ng",
    phone: "+234 815 444 5555",
    orgName: "Transcorp Hilton Annex",
    orgType: "Hotel & Hospitality",
    productInterested: "stay",
    demoDate: "2026-09-22",
    demoTime: "11:00",
    message: "Requires deep PMS APIs and automated housekeeping scheduling demonstration.",
    status: "scheduled",
    createdAt: "2026-09-18"
  }
];

interface ConsoleHotelsViewProps {
  hotels: Hotel[];
  rooms: Room[];
  reservations: Reservation[];
  staff: StaffAccount[];
  subscriptions: HotelSubscription[];
  auditLogs: PlatformAuditLog[];
  onSuspendHotel: (hotelId: string, reason: string) => void;
  onReactivateHotel: (hotelId: string) => void;
  onDeleteHotel: (hotelId: string) => void;
  onNavigateBreadcrumb?: () => void;
}

export const ConsoleHotelsView: React.FC<ConsoleHotelsViewProps> = ({
  hotels,
  rooms,
  reservations,
  staff,
  subscriptions,
  auditLogs,
  onSuspendHotel,
  onReactivateHotel,
  onDeleteHotel,
  onNavigateBreadcrumb,
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [locationFilter, setLocationFilter] = useState('all');
  const [currentPage, setCurrentPage] = useState(1);
  const [selectedRows, setSelectedRows] = useState<string[]>([]);
  const [inspectingHotel, setInspectingHotel] = useState<Hotel | null>(null);

  // Destructive Delete State
  const [deletingHotel, setDeletingHotel] = useState<Hotel | null>(null);
  const [typedConfirmation, setTypedConfirmation] = useState('');

  // Sub-tab state
  const [activeSubTab, setActiveSubTab] = useState<'directory' | 'demo_requests'>('directory');
  const [demoRequests, setDemoRequests] = useState<DemoRequestEntry[]>([]);
  const [demoSearchQuery, setDemoSearchQuery] = useState('');
  const [demoStatusFilter, setDemoStatusFilter] = useState('all');
  const [demoCurrentPage, setDemoCurrentPage] = useState(1);

  useEffect(() => {
    try {
      const stored = localStorage.getItem('igho_demo_requests');
      let parsed = stored ? JSON.parse(stored) : [];
      const stayDemos = parsed.filter((item: any) => item.productInterested === 'stay' || item.productInterested === 'hotel' || !item.productInterested);
      if (stayDemos.length === 0) {
        const otherDemos = parsed.filter((item: any) => item.productInterested !== 'stay');
        const merged = [...otherDemos, ...INITIAL_DEMO_REQUESTS];
        localStorage.setItem('igho_demo_requests', JSON.stringify(merged));
        setDemoRequests(INITIAL_DEMO_REQUESTS);
      } else {
        setDemoRequests(parsed);
      }
    } catch (e) {
      console.error(e);
    }
  }, []);

  const handleUpdateDemoStatus = (id: string, newStatus: 'pending' | 'scheduled' | 'completed' | 'cancelled') => {
    try {
      const stored = localStorage.getItem('igho_demo_requests');
      const parsed = stored ? JSON.parse(stored) : [];
      const updated = parsed.map((item: any) => item.id === id ? { ...item, status: newStatus } : item);
      localStorage.setItem('igho_demo_requests', JSON.stringify(updated));
      setDemoRequests(updated);
    } catch (e) {
      console.error(e);
    }
  };

  const handleDeleteDemo = (id: string) => {
    if (!window.confirm('Are you sure you want to delete this demo request? This action is irreversible.')) {
      return;
    }
    try {
      const stored = localStorage.getItem('igho_demo_requests');
      const parsed = stored ? JSON.parse(stored) : [];
      const updated = parsed.filter((item: any) => item.id !== id);
      localStorage.setItem('igho_demo_requests', JSON.stringify(updated));
      setDemoRequests(updated);
    } catch (e) {
      console.error(e);
    }
  };

  // Dynamic real metrics
  const totalHotels = hotels.length;
  const activeHotels = hotels.filter((h) => h.isLive && (h as any).approvalStatus !== 'rejected').length;
  const pendingHotels = hotels.filter((h) => (h as any).approvalStatus === 'pending' || !h.isLive).length;
  const trialHotels = subscriptions.filter((s) => s.status === 'trial').length;
  const suspendedHotels = hotels.filter((h) => (h as any).isSuspended === true).length;

  // Filter list
  const filteredHotels = hotels.filter((h) => {
    const q = searchQuery.toLowerCase();
    const matchesSearch =
      !q ||
      h.name.toLowerCase().includes(q) ||
      (h.city && h.city.toLowerCase().includes(q)) ||
      (h.state && h.state.toLowerCase().includes(q)) ||
      (h.email && h.email.toLowerCase().includes(q));

    const isLive = h.isLive;
    const matchesStatus =
      statusFilter === 'all' ||
      (statusFilter === 'active' && isLive) ||
      (statusFilter === 'pending' && !isLive) ||
      (statusFilter === 'suspended' && (h as any).isSuspended);

    const matchesLocation =
      locationFilter === 'all' ||
      (h.state && h.state.toLowerCase() === locationFilter.toLowerCase()) ||
      (h.city && h.city.toLowerCase() === locationFilter.toLowerCase());

    return matchesSearch && matchesStatus && matchesLocation;
  });

  const pageSize = 10;
  const totalPages = Math.ceil(filteredHotels.length / pageSize) || 1;
  const paginatedHotels = filteredHotels.slice(
    (currentPage - 1) * pageSize,
    currentPage * pageSize
  );

  const toggleSelectAll = () => {
    if (selectedRows.length === paginatedHotels.length && paginatedHotels.length > 0) {
      setSelectedRows([]);
    } else {
      setSelectedRows(paginatedHotels.map((h) => h.id));
    }
  };

  const toggleSelectRow = (id: string) => {
    setSelectedRows((prev) =>
      prev.includes(id) ? prev.filter((item) => item !== id) : [...prev, id]
    );
  };

  return (
    <div className="space-y-6 text-neutral-900">
      {/* Breadcrumb */}
      <div className="flex items-center gap-2 text-xs text-neutral-500">
        <button
          onClick={onNavigateBreadcrumb}
          className="hover:text-black flex items-center gap-1 transition-colors font-medium"
        >
          <ArrowLeft className="w-3.5 h-3.5" />
          <span>Organizations</span>
        </button>
        <span className="text-neutral-300">/</span>
        <span className="text-neutral-900 font-bold">Hotels</span>
      </div>

      {/* Page Header (Matching Hotel Admin Portal style) */}
      <div className="bg-white border border-neutral-200 rounded-2xl p-5 shadow-xs flex flex-col lg:flex-row lg:items-center justify-between gap-4">
        <div className="flex items-center gap-3.5">
          <div className="w-11 h-11 rounded-xl bg-neutral-100 border border-neutral-200 text-neutral-900 flex items-center justify-center font-bold">
            <Building2 className="w-5 h-5" />
          </div>
          <div>
            <h1 className="text-2xl font-black tracking-tight text-black">Hotels & Properties</h1>
            <p className="text-xs text-neutral-500">
              Manage all hotel organizations and property accounts registered on the IGHO platform.
            </p>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          {/* Sub-tab switcher */}
          <div className="flex bg-neutral-100 p-1 rounded-xl border border-neutral-200 text-xs font-semibold">
            <button
              onClick={() => {
                setActiveSubTab('directory');
                setCurrentPage(1);
              }}
              className={`px-3.5 py-1.5 rounded-lg transition-all ${
                activeSubTab === 'directory'
                  ? 'bg-white text-black shadow-xs'
                  : 'text-neutral-500 hover:text-neutral-800'
              }`}
            >
              Hotel Directory
            </button>
            <button
              onClick={() => {
                setActiveSubTab('demo_requests');
                setDemoCurrentPage(1);
              }}
              className={`px-3.5 py-1.5 rounded-lg transition-all flex items-center gap-1.5 ${
                activeSubTab === 'demo_requests'
                  ? 'bg-black text-white shadow-xs'
                  : 'text-neutral-500 hover:text-neutral-800'
              }`}
            >
              <span>Stay Demo Requests</span>
              {demoRequests.filter((d: any) => d.status === 'pending').length > 0 && (
                <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
              )}
            </button>
          </div>

          <button
            onClick={() => alert('Hotels register via the onboarding portal or can be added via the registrations review queue.')}
            className="px-4 py-2.5 rounded-xl bg-black hover:bg-neutral-800 text-white font-bold text-xs transition-all flex items-center gap-1.5 shadow-sm active:scale-95"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>Register Hotel</span>
          </button>
        </div>
      </div>

      {activeSubTab === 'directory' ? (
        <>
          {/* 5 KPI Metric Cards in a row */}
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3.5">
        {/* 1. Total Hotels */}
        <div className="bg-white border border-neutral-200 rounded-2xl p-4 shadow-xs flex items-center justify-between">
          <div>
            <div className="text-[10px] text-neutral-500 font-bold uppercase tracking-wider">Total Hotels</div>
            <div className="text-2xl font-black text-black mt-0.5">{totalHotels}</div>
            <div className="text-[10px] text-neutral-400 mt-0.5">Platform total</div>
          </div>
          <div className="w-9 h-9 rounded-xl bg-neutral-100 border border-neutral-200 text-neutral-700 flex items-center justify-center">
            <Building2 className="w-4 h-4" />
          </div>
        </div>

        {/* 2. Active Hotels */}
        <div className="bg-white border border-neutral-200 rounded-2xl p-4 shadow-xs flex items-center justify-between">
          <div>
            <div className="text-[10px] text-neutral-500 font-bold uppercase tracking-wider">Active Hotels</div>
            <div className="text-2xl font-black text-black mt-0.5">{activeHotels}</div>
            <div className="text-[10px] text-emerald-700 font-medium mt-0.5">Live & accepting guests</div>
          </div>
          <div className="w-9 h-9 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-700 flex items-center justify-center">
            <CheckCircle2 className="w-4 h-4" />
          </div>
        </div>

        {/* 3. Pending Approval */}
        <div className="bg-white border border-neutral-200 rounded-2xl p-4 shadow-xs flex items-center justify-between">
          <div>
            <div className="text-[10px] text-neutral-500 font-bold uppercase tracking-wider">Pending Review</div>
            <div className="text-2xl font-black text-black mt-0.5">{pendingHotels}</div>
            <div className="text-[10px] text-amber-700 font-medium mt-0.5">Awaiting verification</div>
          </div>
          <div className="w-9 h-9 rounded-xl bg-amber-50 border border-amber-200 text-amber-700 flex items-center justify-center">
            <Clock className="w-4 h-4" />
          </div>
        </div>

        {/* 4. Trial Hotels */}
        <div className="bg-white border border-neutral-200 rounded-2xl p-4 shadow-xs flex items-center justify-between">
          <div>
            <div className="text-[10px] text-neutral-500 font-bold uppercase tracking-wider">Trial Accounts</div>
            <div className="text-2xl font-black text-black mt-0.5">{trialHotels}</div>
            <div className="text-[10px] text-neutral-500 mt-0.5">14-day evaluation</div>
          </div>
          <div className="w-9 h-9 rounded-xl bg-neutral-100 border border-neutral-200 text-neutral-700 flex items-center justify-center">
            <FlaskConical className="w-4 h-4" />
          </div>
        </div>

        {/* 5. Suspended Hotels */}
        <div className="bg-white border border-neutral-200 rounded-2xl p-4 shadow-xs flex items-center justify-between">
          <div>
            <div className="text-[10px] text-neutral-500 font-bold uppercase tracking-wider">Suspended</div>
            <div className={`text-2xl font-black mt-0.5 ${suspendedHotels > 0 ? 'text-rose-600' : 'text-neutral-400'}`}>
              {suspendedHotels}
            </div>
            <div className="text-[10px] text-neutral-400 mt-0.5">Policy enforcement</div>
          </div>
          <div className="w-9 h-9 rounded-xl bg-rose-50 border border-rose-200 text-rose-600 flex items-center justify-center">
            <XCircle className="w-4 h-4" />
          </div>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="bg-white border border-neutral-200 rounded-2xl p-4 shadow-xs flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2 flex-1 min-w-[240px] max-w-md">
          <div className="relative w-full">
            <Search className="w-4 h-4 text-neutral-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => {
                setSearchQuery(e.target.value);
                setCurrentPage(1);
              }}
              placeholder="Search by hotel name, city, state, or email..."
              className="w-full bg-neutral-50 border border-neutral-200 rounded-xl pl-9 pr-3 py-2 text-xs text-neutral-900 placeholder:text-neutral-400 focus:outline-none focus:border-black focus:bg-white transition-colors"
            />
          </div>
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          <select
            value={statusFilter}
            onChange={(e) => {
              setStatusFilter(e.target.value);
              setCurrentPage(1);
            }}
            className="bg-neutral-50 border border-neutral-200 rounded-xl px-3 py-2 text-xs text-neutral-800 font-medium focus:outline-none focus:border-black"
          >
            <option value="all">All Statuses</option>
            <option value="active">Active (Live)</option>
            <option value="pending">Pending Review</option>
            <option value="suspended">Suspended</option>
          </select>

          {selectedRows.length > 0 && (
            <div className="flex items-center gap-2 pl-2 border-l border-neutral-200">
              <span className="text-xs text-neutral-500 font-medium">
                {selectedRows.length} selected
              </span>
              <button
                onClick={() => {
                  selectedRows.forEach((id) => onSuspendHotel(id, 'Bulk admin suspension'));
                  setSelectedRows([]);
                }}
                className="px-2.5 py-1.5 rounded-lg bg-amber-50 text-amber-800 border border-amber-200 text-xs font-bold hover:bg-amber-100 transition-colors"
              >
                Suspend
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Main Table or Empty State */}
      {filteredHotels.length === 0 ? (
        <div className="bg-white border border-neutral-200 rounded-2xl p-12 text-center space-y-4 shadow-xs">
          <div className="w-12 h-12 rounded-2xl bg-neutral-100 border border-neutral-200 flex items-center justify-center mx-auto text-neutral-500">
            <Building2 className="w-6 h-6" />
          </div>
          <div className="space-y-1 max-w-md mx-auto">
            <h3 className="text-base font-bold text-black">No hotels registered yet</h3>
            <p className="text-xs text-neutral-500 leading-relaxed">
              All placeholder hotels and mock data have been cleared from the database. When hotels register or onboard through IGHO Stay, they will be listed here with comprehensive telemetry.
            </p>
          </div>
        </div>
      ) : (
        <div className="bg-white border border-neutral-200 rounded-2xl shadow-xs overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-neutral-50 border-b border-neutral-200 text-[10px] font-bold uppercase tracking-wider text-neutral-500">
                  <th className="p-4 w-8">
                    <input
                      type="checkbox"
                      checked={selectedRows.length === paginatedHotels.length && paginatedHotels.length > 0}
                      onChange={toggleSelectAll}
                      className="rounded border-neutral-300 text-black focus:ring-0 cursor-pointer"
                    />
                  </th>
                  <th className="p-4">Hotel Name</th>
                  <th className="p-4">Location</th>
                  <th className="p-4">Rooms</th>
                  <th className="p-4">Status</th>
                  <th className="p-4">Contact</th>
                  <th className="p-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-neutral-100 text-xs text-neutral-800">
                {paginatedHotels.map((hotel) => (
                  <tr
                    key={hotel.id}
                    className="hover:bg-neutral-50/80 transition-colors"
                  >
                    <td className="p-4">
                      <input
                        type="checkbox"
                        checked={selectedRows.includes(hotel.id)}
                        onChange={() => toggleSelectRow(hotel.id)}
                        className="rounded border-neutral-300 text-black focus:ring-0 cursor-pointer"
                      />
                    </td>
                    <td className="p-4">
                      <div className="font-bold text-neutral-900">{hotel.name}</div>
                      <div className="text-[10px] text-neutral-400 font-mono">{hotel.id}</div>
                    </td>
                    <td className="p-4">
                      <div className="flex items-center gap-1 text-neutral-700">
                        <MapPin className="w-3.5 h-3.5 text-neutral-400 shrink-0" />
                        <span>{hotel.city || 'N/A'}, {hotel.state || 'N/A'}</span>
                      </div>
                    </td>
                    <td className="p-4 font-mono font-medium">
                      {hotel.roomCount || 0} rooms
                    </td>
                    <td className="p-4">
                      {hotel.isLive ? (
                        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
                          <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                          Active
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-amber-50 text-amber-700 border border-amber-200">
                          <span className="w-1.5 h-1.5 rounded-full bg-amber-500" />
                          Pending
                        </span>
                      )}
                    </td>
                    <td className="p-4 text-neutral-600 font-mono text-[11px]">
                      {hotel.email || hotel.phone || '—'}
                    </td>
                    <td className="p-4 text-right">
                      <div className="flex items-center justify-end gap-1.5">
                        <button
                          onClick={() => setInspectingHotel(hotel)}
                          className="p-1.5 rounded-lg hover:bg-neutral-100 text-neutral-600 hover:text-black transition-colors"
                          title="View Details"
                        >
                          <Eye className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => {
                            if (hotel.isLive) {
                              onSuspendHotel(hotel.id, 'Super Admin Manual Action');
                            } else {
                              onReactivateHotel(hotel.id);
                            }
                          }}
                          className={`p-1.5 rounded-lg transition-colors ${
                            hotel.isLive
                              ? 'text-amber-600 hover:bg-amber-50'
                              : 'text-emerald-600 hover:bg-emerald-50'
                          }`}
                          title={hotel.isLive ? 'Suspend' : 'Reactivate'}
                        >
                          <ShieldAlert className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => {
                            setDeletingHotel(hotel);
                            setTypedConfirmation('');
                          }}
                          className="p-1.5 rounded-lg hover:bg-rose-50 text-neutral-400 hover:text-rose-600 transition-colors"
                          title="Delete Hotel"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="p-4 border-t border-neutral-200 flex items-center justify-between text-xs text-neutral-600">
              <div>
                Showing {(currentPage - 1) * pageSize + 1} to {Math.min(currentPage * pageSize, filteredHotels.length)} of {filteredHotels.length} properties
              </div>
              <div className="flex items-center gap-1">
                <button
                  onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                  disabled={currentPage === 1}
                  className="p-1.5 rounded-lg border border-neutral-200 hover:bg-neutral-50 disabled:opacity-40"
                >
                  <ChevronLeft className="w-4 h-4" />
                </button>
                <span className="px-3 font-semibold text-neutral-900">
                  {currentPage} / {totalPages}
                </span>
                <button
                  onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                  disabled={currentPage === totalPages}
                  className="p-1.5 rounded-lg border border-neutral-200 hover:bg-neutral-50 disabled:opacity-40"
                >
                  <ChevronRight className="w-4 h-4" />
                </button>
              </div>
            </div>
          )}
        </div>
      )}
        </>
      ) : (
        /* Stay Demo Requests Sub-dashboard */
        <div className="space-y-4">
          {/* KPI Mini-row for demo requests */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3.5">
            <div className="bg-white border border-neutral-200 rounded-2xl p-4 shadow-xs">
              <span className="text-[10px] text-neutral-500 font-bold uppercase tracking-wider block">Total Demos</span>
              <div className="text-2xl font-black text-black mt-1">{demoRequests.length}</div>
              <span className="text-[10px] text-neutral-400">Total requests logged</span>
            </div>
            <div className="bg-white border border-neutral-200 rounded-2xl p-4 shadow-xs">
              <span className="text-[10px] text-neutral-500 font-bold uppercase tracking-wider block">Pending Review</span>
              <div className="text-2xl font-black text-amber-600 mt-1">
                {demoRequests.filter((d: any) => d.status === 'pending').length}
              </div>
              <span className="text-[10px] text-neutral-400">Needs contact scheduling</span>
            </div>
            <div className="bg-white border border-neutral-200 rounded-2xl p-4 shadow-xs">
              <span className="text-[10px] text-neutral-500 font-bold uppercase tracking-wider block">Scheduled Demos</span>
              <div className="text-2xl font-black text-blue-600 mt-1">
                {demoRequests.filter((d: any) => d.status === 'scheduled').length}
              </div>
              <span className="text-[10px] text-neutral-400">Booked walkthroughs</span>
            </div>
            <div className="bg-white border border-neutral-200 rounded-2xl p-4 shadow-xs">
              <span className="text-[10px] text-neutral-500 font-bold uppercase tracking-wider block">Completed</span>
              <div className="text-2xl font-black text-emerald-700 mt-1">
                {demoRequests.filter((d: any) => d.status === 'completed').length}
              </div>
              <span className="text-[10px] text-neutral-400">Demos successfully run</span>
            </div>
          </div>

          {/* Controls Bar */}
          <div className="flex flex-col md:flex-row gap-3 justify-between items-center bg-white p-4 rounded-xl border border-neutral-200">
            {/* Search */}
            <div className="relative w-full md:max-w-md">
              <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-neutral-400">
                <Search className="w-4 h-4" />
              </span>
              <input
                type="text"
                placeholder="Search demo requests..."
                value={demoSearchQuery}
                onChange={(e) => setDemoSearchQuery(e.target.value)}
                className="w-full h-10 pl-10 pr-4 rounded-xl bg-neutral-50 border border-neutral-200 text-xs focus:outline-none focus:border-black transition-colors"
              />
            </div>

            {/* Filters */}
            <div className="flex gap-2 w-full md:w-auto text-xs">
              <select
                value={demoStatusFilter}
                onChange={(e) => setDemoStatusFilter(e.target.value)}
                className="h-10 px-3.5 rounded-xl border border-neutral-200 bg-neutral-50 text-neutral-700 focus:outline-none font-semibold cursor-pointer"
              >
                <option value="all">All Demo Statuses</option>
                <option value="pending">Pending</option>
                <option value="scheduled">Scheduled</option>
                <option value="completed">Completed</option>
                <option value="cancelled">Cancelled</option>
              </select>
            </div>
          </div>

          {/* Demo Requests List */}
          {demoRequests.filter((d: any) => {
            const q = demoSearchQuery.toLowerCase();
            const matchesSearch = 
              !q ||
              d.fullName.toLowerCase().includes(q) ||
              d.email.toLowerCase().includes(q) ||
              d.orgName.toLowerCase().includes(q) ||
              (d.message && d.message.toLowerCase().includes(q));

            const matchesStatus = demoStatusFilter === 'all' || d.status === demoStatusFilter;
            return matchesSearch && matchesStatus;
          }).length === 0 ? (
            <div className="bg-white border border-neutral-200 rounded-2xl p-10 text-center space-y-3 shadow-xs">
              <AlertCircle className="w-8 h-8 text-neutral-400 mx-auto" />
              <div>
                <h4 className="text-sm font-bold text-black">No matching demo requests found</h4>
                <p className="text-xs text-neutral-500 mt-0.5">
                  Try adjusting your search criteria or status filter tags.
                </p>
              </div>
            </div>
          ) : (
            <div className="bg-white border border-neutral-200 rounded-2xl overflow-hidden shadow-xs">
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse text-xs">
                  <thead>
                    <tr className="bg-neutral-50 border-b border-neutral-200 text-neutral-500 font-bold">
                      <th className="py-3 px-4">Organization & Requester</th>
                      <th className="py-3 px-4">Contact Detail</th>
                      <th className="py-3 px-4">Scheduled Slot (WAT)</th>
                      <th className="py-3 px-4">Message / PMS Info</th>
                      <th className="py-3 px-4">Status</th>
                      <th className="py-3 px-4 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-neutral-100">
                    {demoRequests
                      .filter((d: any) => {
                        const q = demoSearchQuery.toLowerCase();
                        const matchesSearch = 
                          !q ||
                          d.fullName.toLowerCase().includes(q) ||
                          d.email.toLowerCase().includes(q) ||
                          d.orgName.toLowerCase().includes(q) ||
                          (d.message && d.message.toLowerCase().includes(q));

                        const matchesStatus = demoStatusFilter === 'all' || d.status === demoStatusFilter;
                        return matchesSearch && matchesStatus;
                      })
                      .slice((demoCurrentPage - 1) * 5, demoCurrentPage * 5)
                      .map((item: any) => (
                        <tr key={item.id} className="hover:bg-neutral-50/50 transition-colors">
                          <td className="py-4 px-4 font-sans">
                            <div className="font-extrabold text-neutral-900 flex items-center gap-1.5">
                              <Building2 className="w-3.5 h-3.5 text-neutral-500" />
                              <span>{item.orgName}</span>
                            </div>
                            <p className="text-[10px] text-neutral-500 mt-0.5">Contact: {item.fullName}</p>
                          </td>
                          <td className="py-4 px-4">
                            <div className="flex flex-col gap-1 text-[11px]">
                              <span className="text-neutral-600">{item.email}</span>
                              <span className="text-neutral-500 font-mono text-[10px]">{item.phone}</span>
                            </div>
                          </td>
                          <td className="py-4 px-4 font-mono font-semibold">
                            <div>{item.demoDate || 'TBD'}</div>
                            <div className="text-[10px] text-neutral-400">{item.demoTime ? `${item.demoTime} WAT` : ''}</div>
                          </td>
                          <td className="py-4 px-4 max-w-xs">
                            <p className="text-neutral-500 truncate" title={item.message || item.additionalComments}>
                              {item.message || item.additionalComments || '—'}
                            </p>
                            <span className="text-[9px] text-neutral-400 block mt-0.5 font-mono">
                              Requested: {item.createdAt}
                            </span>
                          </td>
                          <td className="py-4 px-4">
                            <span
                              className={`inline-block px-2.5 py-0.5 rounded-full font-bold text-[9px] uppercase tracking-wider ${
                                item.status === 'completed'
                                  ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                                  : item.status === 'scheduled'
                                  ? 'bg-blue-50 text-blue-700 border border-blue-200'
                                  : item.status === 'cancelled'
                                  ? 'bg-neutral-100 text-neutral-500 border border-neutral-200'
                                  : 'bg-amber-50 text-amber-700 border border-amber-200'
                              }`}
                            >
                              {item.status}
                            </span>
                          </td>
                          <td className="py-4 px-4 text-right">
                            <div className="flex justify-end gap-1.5">
                              {item.status === 'pending' && (
                                <button
                                  onClick={() => handleUpdateDemoStatus(item.id, 'scheduled')}
                                  className="p-1 text-blue-600 hover:bg-blue-50 rounded-md transition-colors font-bold text-[10px] px-2 border border-blue-200"
                                  title="Schedule Date"
                                >
                                  Schedule
                                </button>
                              )}
                              {item.status === 'scheduled' && (
                                <button
                                  onClick={() => handleUpdateDemoStatus(item.id, 'completed')}
                                  className="p-1 text-emerald-600 hover:bg-emerald-50 rounded-md transition-colors font-bold text-[10px] px-2 border border-emerald-200"
                                  title="Mark Completed"
                                >
                                  Complete
                                </button>
                              )}
                              {item.status !== 'cancelled' && item.status !== 'completed' && (
                                <button
                                  onClick={() => handleUpdateDemoStatus(item.id, 'cancelled')}
                                  className="p-1 text-neutral-500 hover:text-red-600 hover:bg-red-50 rounded-md transition-colors font-bold text-[10px] px-2 border border-neutral-200"
                                  title="Cancel Demo"
                                >
                                  Cancel
                                </button>
                              )}
                              <button
                                onClick={() => handleDeleteDemo(item.id)}
                                className="p-1 text-neutral-400 hover:text-red-600 hover:bg-red-50 rounded-md transition-colors"
                                title="Delete Record"
                              >
                                <Trash2 className="w-4 h-4" />
                              </button>
                            </div>
                          </td>
                        </tr>
                      ))}
                  </tbody>
                </table>
              </div>

              {/* Pagination */}
              <div className="bg-neutral-50 border-t border-neutral-200 px-4 py-3.5 flex items-center justify-between text-xs">
                <span className="text-neutral-500 font-mono">
                  Page {demoCurrentPage} of {Math.ceil(demoRequests.filter((d: any) => {
                    const q = demoSearchQuery.toLowerCase();
                    const matchesSearch = 
                      !q ||
                      d.fullName.toLowerCase().includes(q) ||
                      d.email.toLowerCase().includes(q) ||
                      d.orgName.toLowerCase().includes(q) ||
                      (d.message && d.message.toLowerCase().includes(q));

                    const matchesStatus = demoStatusFilter === 'all' || d.status === demoStatusFilter;
                    return matchesSearch && matchesStatus;
                  }).length / 5) || 1}
                </span>
                <div className="flex gap-1.5">
                  <button
                    onClick={() => setDemoCurrentPage(prev => Math.max(1, prev - 1))}
                    disabled={demoCurrentPage === 1}
                    className="p-1 px-2.5 rounded-lg border border-neutral-200 bg-white hover:bg-neutral-50 disabled:opacity-50 text-neutral-600"
                  >
                    Prev
                  </button>
                  <button
                    onClick={() => setDemoCurrentPage(prev => Math.min(Math.ceil(demoRequests.filter((d: any) => {
                      const q = demoSearchQuery.toLowerCase();
                      const matchesSearch = 
                        !q ||
                        d.fullName.toLowerCase().includes(q) ||
                        d.email.toLowerCase().includes(q) ||
                        d.orgName.toLowerCase().includes(q) ||
                        (d.message && d.message.toLowerCase().includes(q));

                      const matchesStatus = demoStatusFilter === 'all' || d.status === demoStatusFilter;
                      return matchesSearch && matchesStatus;
                    }).length / 5), prev + 1))}
                    disabled={demoCurrentPage === Math.ceil(demoRequests.filter((d: any) => {
                      const q = demoSearchQuery.toLowerCase();
                      const matchesSearch = 
                        !q ||
                        d.fullName.toLowerCase().includes(q) ||
                        d.email.toLowerCase().includes(q) ||
                        d.orgName.toLowerCase().includes(q) ||
                        (d.message && d.message.toLowerCase().includes(q));

                      const matchesStatus = demoStatusFilter === 'all' || d.status === demoStatusFilter;
                      return matchesSearch && matchesStatus;
                    }).length / 5)}
                    className="p-1 px-2.5 rounded-lg border border-neutral-200 bg-white hover:bg-neutral-50 disabled:opacity-40 text-neutral-600"
                  >
                    Next
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {deletingHotel && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white border border-neutral-200 rounded-2xl p-6 sm:p-8 max-w-md w-full shadow-2xl space-y-4">
            <div className="w-12 h-12 rounded-2xl bg-rose-50 border border-rose-200 text-rose-600 flex items-center justify-center">
              <AlertTriangle className="w-6 h-6" />
            </div>
            <div>
              <h3 className="text-lg font-bold text-neutral-900">Delete Property Account</h3>
              <p className="text-xs text-neutral-500 mt-1 leading-relaxed">
                This action is permanent. Type <span className="font-mono font-bold text-black">{deletingHotel.name}</span> to confirm deletion of this organization.
              </p>
            </div>
            <input
              type="text"
              value={typedConfirmation}
              onChange={(e) => setTypedConfirmation(e.target.value)}
              placeholder="Type hotel name exactly"
              className="w-full bg-neutral-50 border border-neutral-300 rounded-xl px-3 py-2 text-xs text-neutral-900 focus:outline-none focus:border-rose-500"
            />
            <div className="flex items-center justify-end gap-2 pt-2">
              <button
                onClick={() => setDeletingHotel(null)}
                className="px-4 py-2 rounded-xl text-xs font-semibold text-neutral-700 hover:bg-neutral-100"
              >
                Cancel
              </button>
              <button
                disabled={typedConfirmation !== deletingHotel.name}
                onClick={() => {
                  onDeleteHotel(deletingHotel.id);
                  setDeletingHotel(null);
                }}
                className="px-4 py-2 rounded-xl bg-rose-600 text-white text-xs font-bold hover:bg-rose-700 disabled:opacity-40 shadow-sm"
              >
                Permanently Delete
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Inspect Hotel Modal */}
      {inspectingHotel && (
        <ConsoleHotelDetailModal
          hotel={inspectingHotel}
          onClose={() => setInspectingHotel(null)}
          allRooms={rooms.filter((r) => r.hotelId === inspectingHotel.id)}
          allReservations={reservations.filter((res) => res.hotelId === inspectingHotel.id)}
          allStaff={staff.filter((s) => s.hotelId === inspectingHotel.id)}
          subscription={subscriptions.find((s) => s.hotelId === inspectingHotel.id)}
          auditLogs={auditLogs}
          onSuspend={() => {
            onSuspendHotel(inspectingHotel.id, 'Manual super admin audit');
            setInspectingHotel(null);
          }}
          onReactivate={() => {
            onReactivateHotel(inspectingHotel.id);
            setInspectingHotel(null);
          }}
          onDeleteRequest={() => {
            onDeleteHotel(inspectingHotel.id);
            setInspectingHotel(null);
          }}
        />
      )}
    </div>
  );
};
