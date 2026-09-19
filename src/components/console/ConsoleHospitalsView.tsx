import React, { useState, useEffect } from 'react';
import {
  Cross,
  CheckCircle2,
  Clock,
  Search,
  Plus,
  ArrowLeft,
  ChevronLeft,
  ChevronRight,
  MapPin,
  XCircle,
  Stethoscope,
  Building2,
  Mail,
  Phone,
  AlertCircle,
  Trash2,
  Check,
} from 'lucide-react';

interface ConsoleHospitalsViewProps {
  onNavigateBreadcrumb?: () => void;
}

interface WaitlistEntry {
  id: string;
  fullName: string;
  email: string;
  phone: string;
  orgName: string;
  institutionType: string;
  city: string;
  stateName: string;
  additionalComments: string;
  product: string;
  status: 'pending' | 'contacted' | 'approved';
  createdAt: string;
}

const INITIAL_MEDBAY_WAITLIST: WaitlistEntry[] = [
  {
    id: "wl-med-1",
    fullName: "Dr. Chinedu Okafor",
    email: "c.okafor@cityhealth.ng",
    phone: "+234 805 555 6666",
    orgName: "City Health Specialist Clinic",
    institutionType: "Clinic",
    city: "Enugu",
    stateName: "Enugu State",
    additionalComments: "Need EHR for patient charts and direct pharmacy prescription API integration.",
    product: "medbay",
    status: "pending",
    createdAt: "2026-09-12"
  },
  {
    id: "wl-med-2",
    fullName: "Fatimah Umar",
    email: "f.umar@medbayhospital.org",
    phone: "+234 809 777 8888",
    orgName: "MedBay Specialist Hospital",
    institutionType: "Hospital",
    city: "Wuse",
    stateName: "Abuja (FCT)",
    additionalComments: "Requires inpatient bed management with nurse dashboard sync.",
    product: "medbay",
    status: "approved",
    createdAt: "2026-09-18"
  }
];

export const ConsoleHospitalsView: React.FC<ConsoleHospitalsViewProps> = ({
  onNavigateBreadcrumb,
}) => {
  const [activeSubTab, setActiveSubTab] = useState<'directory' | 'waitlist'>('directory');
  const [hospitals, setHospitals] = useState<any[]>([]);
  const [waitlist, setWaitlist] = useState<WaitlistEntry[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'pending' | 'contacted' | 'approved'>('all');
  const [currentPage, setCurrentPage] = useState(1);

  // Initialize and load waitlists
  useEffect(() => {
    try {
      const stored = localStorage.getItem('igho_waitlists');
      let parsed: WaitlistEntry[] = stored ? JSON.parse(stored) : [];
      
      // If no medbay waitlist entries exist, seed them
      const medEntries = parsed.filter(item => item.product === 'medbay');
      if (medEntries.length === 0) {
        // Merge initial seeds
        const otherEntries = parsed.filter(item => item.product !== 'medbay');
        const merged = [...otherEntries, ...INITIAL_MEDBAY_WAITLIST];
        localStorage.setItem('igho_waitlists', JSON.stringify(merged));
        setWaitlist(INITIAL_MEDBAY_WAITLIST);
      } else {
        setWaitlist(medEntries);
      }
    } catch (err) {
      console.error(err);
    }
  }, []);

  // Update status of a waitlist entry
  const handleUpdateStatus = (id: string, newStatus: 'pending' | 'contacted' | 'approved') => {
    try {
      const stored = localStorage.getItem('igho_waitlists');
      const parsed: WaitlistEntry[] = stored ? JSON.parse(stored) : [];
      const updated = parsed.map(item => item.id === id ? { ...item, status: newStatus } : item);
      localStorage.setItem('igho_waitlists', JSON.stringify(updated));
      setWaitlist(updated.filter(item => item.product === 'medbay'));
    } catch (err) {
      console.error(err);
    }
  };

  // Delete waitlist entry
  const handleDeleteEntry = (id: string) => {
    if (!window.confirm('Are you sure you want to delete this waitlist entry? This action is irreversible.')) {
      return;
    }
    try {
      const stored = localStorage.getItem('igho_waitlists');
      const parsed: WaitlistEntry[] = stored ? JSON.parse(stored) : [];
      const updated = parsed.filter(item => item.id !== id);
      localStorage.setItem('igho_waitlists', JSON.stringify(updated));
      setWaitlist(updated.filter(item => item.product === 'medbay'));
    } catch (err) {
      console.error(err);
    }
  };

  // Filter list
  const filteredWaitlist = waitlist.filter(item => {
    const q = searchQuery.toLowerCase();
    const matchesSearch = 
      !q ||
      item.fullName.toLowerCase().includes(q) ||
      item.email.toLowerCase().includes(q) ||
      item.orgName.toLowerCase().includes(q) ||
      item.city.toLowerCase().includes(q) ||
      item.stateName.toLowerCase().includes(q);

    const matchesStatus = statusFilter === 'all' || item.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  const pageSize = 5;
  const totalPages = Math.ceil(filteredWaitlist.length / pageSize) || 1;
  const paginatedWaitlist = filteredWaitlist.slice(
    (currentPage - 1) * pageSize,
    currentPage * pageSize
  );

  return (
    <div className="space-y-6 text-neutral-900">
      {/* Breadcrumb */}
      <div className="flex items-center gap-2 text-xs text-neutral-500">
        <button
          onClick={onNavigateBreadcrumb}
          className="hover:text-black flex items-center gap-1 transition-colors font-medium"
        >
          <ArrowLeft className="w-3.5 h-3.5" />
          <span>Dashboard</span>
        </button>
        <span className="text-neutral-300">/</span>
        <span className="text-neutral-900 font-bold">Healthcare Centers (Hospitals)</span>
      </div>

      {/* Header */}
      <div className="bg-white border border-neutral-200 rounded-2xl p-5 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-3.5">
          <div className="w-11 h-11 rounded-xl bg-neutral-100 border border-neutral-200 text-neutral-900 flex items-center justify-center font-bold">
            <Cross className="w-5 h-5 text-rose-600" />
          </div>
          <div>
            <h1 className="text-2xl font-black tracking-tight text-black">
              IGHO MedBay Healthcare Facilities
            </h1>
            <p className="text-xs text-neutral-500">
              Directory of hospitals, clinical tenancies, and healthcare complexes active or waitlisted on IGHO MedBay.
            </p>
          </div>
        </div>

        {/* Sub-tab switcher to toggle Directory vs Waitlist */}
        <div className="flex bg-neutral-100 p-1 rounded-xl border border-neutral-200 self-start sm:self-auto text-xs font-semibold">
          <button
            onClick={() => setActiveSubTab('directory')}
            className={`px-3.5 py-1.5 rounded-lg transition-all ${
              activeSubTab === 'directory'
                ? 'bg-white text-black shadow-xs'
                : 'text-neutral-500 hover:text-neutral-800'
            }`}
          >
            Hospitals Directory
          </button>
          <button
            onClick={() => setActiveSubTab('waitlist')}
            className={`px-3.5 py-1.5 rounded-lg transition-all flex items-center gap-1.5 ${
              activeSubTab === 'waitlist'
                ? 'bg-black text-white shadow-xs'
                : 'text-neutral-500 hover:text-neutral-800'
            }`}
          >
            <span>MedBay Waitlist</span>
            {waitlist.filter(item => item.status === 'pending').length > 0 && (
              <span className="w-2 h-2 rounded-full bg-rose-500"></span>
            )}
          </button>
        </div>
      </div>

      {/* Metric Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3.5">
        <div className="bg-white border border-neutral-200 rounded-2xl p-4 shadow-xs">
          <span className="text-[10px] text-neutral-500 font-bold uppercase tracking-wider block">Total Facilities</span>
          <div className="text-2xl font-black text-black mt-1">{hospitals.length}</div>
          <span className="text-[10px] text-neutral-400">Enrolled centers</span>
        </div>
        <div className="bg-white border border-neutral-200 rounded-2xl p-4 shadow-xs">
          <span className="text-[10px] text-neutral-500 font-bold uppercase tracking-wider block">Active Clinics</span>
          <div className="text-2xl font-black text-emerald-700 mt-1">0</div>
          <span className="text-[10px] text-neutral-400">Operational</span>
        </div>
        <div className="bg-white border border-neutral-200 rounded-2xl p-4 shadow-xs">
          <span className="text-[10px] text-neutral-500 font-bold uppercase tracking-wider block">Waitlist Intake</span>
          <div className="text-2xl font-black text-rose-600 mt-1">{waitlist.length}</div>
          <span className="text-[10px] text-neutral-400">Total early integrations</span>
        </div>
        <div className="bg-white border border-neutral-200 rounded-2xl p-4 shadow-xs">
          <span className="text-[10px] text-neutral-500 font-bold uppercase tracking-wider block">Pending Screening</span>
          <div className="text-2xl font-black text-amber-600 mt-1">
            {waitlist.filter(w => w.status === 'pending').length}
          </div>
          <span className="text-[10px] text-neutral-400">Awaiting dispatch</span>
        </div>
      </div>

      {/* Main View Layout depending on Active Subtab */}
      {activeSubTab === 'directory' ? (
        <div className="bg-white border border-neutral-200 rounded-2xl p-12 text-center space-y-4 shadow-xs">
          <div className="w-12 h-12 rounded-2xl bg-neutral-100 border border-neutral-200 flex items-center justify-center mx-auto text-neutral-500">
            <Cross className="w-6 h-6 text-rose-600" />
          </div>
          <div className="space-y-1 max-w-md mx-auto">
            <h3 className="text-base font-bold text-black">No healthcare facilities registered yet</h3>
            <p className="text-xs text-neutral-500 leading-relaxed">
              All placeholder hospital records have been removed. When clinical organizations complete setup on the IGHO MedBay ERP, they will be listed here.
            </p>
          </div>
        </div>
      ) : (
        /* MedBay Waitlist Section */
        <div className="space-y-4">
          {/* Controls Panel */}
          <div className="flex flex-col md:flex-row gap-3 justify-between items-center bg-white p-4 rounded-xl border border-neutral-200">
            {/* Search Input */}
            <div className="relative w-full md:max-w-md">
              <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-neutral-400">
                <Search className="w-4 h-4" />
              </span>
              <input
                type="text"
                placeholder="Search MedBay waitlist..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full h-10 pl-10 pr-4 rounded-xl bg-neutral-50 border border-neutral-200 text-xs focus:outline-none focus:border-black transition-colors"
              />
            </div>

            {/* Filters */}
            <div className="flex gap-2 w-full md:w-auto text-xs">
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value as any)}
                className="h-10 px-3.5 rounded-xl border border-neutral-200 bg-neutral-50 text-neutral-700 focus:outline-none font-semibold cursor-pointer"
              >
                <option value="all">All Statuses</option>
                <option value="pending">Pending Review</option>
                <option value="contacted">Contacted</option>
                <option value="approved">Approved & Invited</option>
              </select>
            </div>
          </div>

          {/* Waitlist Grid / Table */}
          {filteredWaitlist.length === 0 ? (
            <div className="bg-white border border-neutral-200 rounded-2xl p-10 text-center space-y-3 shadow-xs">
              <AlertCircle className="w-8 h-8 text-neutral-400 mx-auto" />
              <div>
                <h4 className="text-sm font-bold text-black">No matching waitlist signups found</h4>
                <p className="text-xs text-neutral-500 mt-0.5">
                  Try adjusting your search keywords or status filter options.
                </p>
              </div>
            </div>
          ) : (
            <div className="bg-white border border-neutral-200 rounded-2xl overflow-hidden shadow-xs">
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse text-xs">
                  <thead>
                    <tr className="bg-neutral-50 border-b border-neutral-200 text-neutral-500 font-bold">
                      <th className="py-3 px-4">Hospital & Practitioner</th>
                      <th className="py-3 px-4">Contact Info</th>
                      <th className="py-3 px-4">Location & Type</th>
                      <th className="py-3 px-4">Submission Notes</th>
                      <th className="py-3 px-4">Status</th>
                      <th className="py-3 px-4 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-neutral-100">
                    {paginatedWaitlist.map((item) => (
                      <tr key={item.id} className="hover:bg-neutral-50/50 transition-colors">
                        <td className="py-4 px-4 font-sans">
                          <div className="font-extrabold text-neutral-900 flex items-center gap-1.5">
                            <Building2 className="w-3.5 h-3.5 text-neutral-500" />
                            <span>{item.orgName}</span>
                          </div>
                          <p className="text-[10px] text-neutral-500 mt-0.5">Practitioner: {item.fullName}</p>
                        </td>
                        <td className="py-4 px-4">
                          <div className="flex flex-col gap-1 text-[11px]">
                            <span className="flex items-center gap-1 text-neutral-600">
                              <Mail className="w-3 h-3 text-neutral-400" /> {item.email}
                            </span>
                            <span className="flex items-center gap-1 text-neutral-600">
                              <Phone className="w-3 h-3 text-neutral-400" /> {item.phone}
                            </span>
                          </div>
                        </td>
                        <td className="py-4 px-4">
                          <div className="flex flex-col gap-0.5">
                            <span className="font-bold text-neutral-800">{item.institutionType}</span>
                            <span className="text-[10px] text-neutral-400 flex items-center gap-0.5">
                              <MapPin className="w-3 h-3 text-neutral-300" /> {item.city}, {item.stateName}
                            </span>
                          </div>
                        </td>
                        <td className="py-4 px-4 max-w-xs">
                          <p className="text-neutral-500 truncate" title={item.additionalComments}>
                            {item.additionalComments || 'N/A'}
                          </p>
                          <span className="text-[9px] text-neutral-400 block mt-0.5 font-mono">
                            Submitted: {item.createdAt}
                          </span>
                        </td>
                        <td className="py-4 px-4">
                          <span
                            className={`inline-block px-2.5 py-0.5 rounded-full font-bold text-[9px] uppercase tracking-wider ${
                              item.status === 'approved'
                                ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                                : item.status === 'contacted'
                                ? 'bg-blue-50 text-blue-700 border border-blue-200'
                                : 'bg-amber-50 text-amber-700 border border-amber-200'
                            }`}
                          >
                            {item.status === 'approved'
                              ? 'Approved & Invited'
                              : item.status === 'contacted'
                              ? 'Contacted'
                              : 'Pending Screening'}
                          </span>
                        </td>
                        <td className="py-4 px-4 text-right">
                          <div className="flex justify-end gap-1.5">
                            {item.status !== 'approved' && (
                              <button
                                onClick={() => handleUpdateStatus(item.id, 'approved')}
                                className="p-1 text-emerald-600 hover:bg-emerald-50 rounded-md transition-colors"
                                title="Approve & Send Invitation"
                              >
                                <CheckCircle2 className="w-4 h-4" />
                              </button>
                            )}
                            {item.status === 'pending' && (
                              <button
                                onClick={() => handleUpdateStatus(item.id, 'contacted')}
                                className="p-1 text-blue-600 hover:bg-blue-50 rounded-md transition-colors"
                                title="Mark as Contacted"
                              >
                                <Clock className="w-4 h-4" />
                              </button>
                            )}
                            <button
                              onClick={() => handleDeleteEntry(item.id)}
                              className="p-1 text-neutral-400 hover:text-red-600 hover:bg-red-50 rounded-md transition-colors"
                              title="Delete Signup"
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

              {/* Pagination bar */}
              <div className="bg-neutral-50 border-t border-neutral-200 px-4 py-3.5 flex items-center justify-between text-xs">
                <span className="text-neutral-500 font-mono">
                  Showing {Math.min(filteredWaitlist.length, (currentPage - 1) * pageSize + 1)} to{' '}
                  {Math.min(filteredWaitlist.length, currentPage * pageSize)} of {filteredWaitlist.length} requests
                </span>
                <div className="flex gap-1.5">
                  <button
                    onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
                    disabled={currentPage === 1}
                    className="p-1 px-2.5 rounded-lg border border-neutral-200 bg-white hover:bg-neutral-50 disabled:opacity-50 text-neutral-600"
                  >
                    Prev
                  </button>
                  <button
                    onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))}
                    disabled={currentPage === totalPages}
                    className="p-1 px-2.5 rounded-lg border border-neutral-200 bg-white hover:bg-neutral-50 disabled:opacity-50 text-neutral-600"
                  >
                    Next
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
};
