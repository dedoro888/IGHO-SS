import React, { useState, useEffect } from 'react';
import {
  GraduationCap,
  Users,
  CheckCircle2,
  Clock,
  Search,
  Plus,
  ArrowLeft,
  ChevronLeft,
  ChevronRight,
  MapPin,
  XCircle,
  Building2,
  Mail,
  Phone,
  AlertCircle,
  Trash2,
  Check,
} from 'lucide-react';

interface ConsoleSchoolsViewProps {
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

const INITIAL_CLASSROOM_WAITLIST: WaitlistEntry[] = [
  {
    id: "wl-class-1",
    fullName: "Dele Alimi",
    email: "d.alimi@fountainacademic.com",
    phone: "+234 803 111 2222",
    orgName: "Fountain Academic College",
    institutionType: "Secondary School",
    city: "Ikeja",
    stateName: "Lagos State",
    additionalComments: "We have 1,200 students. We need robust offline term grading and parent Paystack portal.",
    product: "classroom",
    status: "pending",
    createdAt: "2026-09-10"
  },
  {
    id: "wl-class-2",
    fullName: "Amina Yusuf",
    email: "yusuf.a@greengardens.edu.ng",
    phone: "+234 812 333 4444",
    orgName: "Green Gardens Academy",
    institutionType: "Primary and Secondary school",
    city: "Kano",
    stateName: "Kano State",
    additionalComments: "Looking for biometric integration for student card tracking.",
    product: "classroom",
    status: "contacted",
    createdAt: "2026-09-15"
  }
];

export const ConsoleSchoolsView: React.FC<ConsoleSchoolsViewProps> = ({
  onNavigateBreadcrumb,
}) => {
  const [activeSubTab, setActiveSubTab] = useState<'directory' | 'waitlist'>('directory');
  const [schools, setSchools] = useState<any[]>([]);
  const [waitlist, setWaitlist] = useState<WaitlistEntry[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'pending' | 'contacted' | 'approved'>('all');
  const [currentPage, setCurrentPage] = useState(1);

  // Initialize and load waitlists
  useEffect(() => {
    try {
      const stored = localStorage.getItem('igho_waitlists');
      let parsed: WaitlistEntry[] = stored ? JSON.parse(stored) : [];
      
      // If no classroom waitlist entries exist, seed them
      const classEntries = parsed.filter(item => item.product === 'classroom');
      if (classEntries.length === 0) {
        // Merge initial seeds
        const otherEntries = parsed.filter(item => item.product !== 'classroom');
        const merged = [...otherEntries, ...INITIAL_CLASSROOM_WAITLIST];
        localStorage.setItem('igho_waitlists', JSON.stringify(merged));
        setWaitlist(INITIAL_CLASSROOM_WAITLIST);
      } else {
        setWaitlist(classEntries);
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
      setWaitlist(updated.filter(item => item.product === 'classroom'));
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
      setWaitlist(updated.filter(item => item.product === 'classroom'));
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
        <span className="text-neutral-900 font-bold">Academic Institutions (Schools)</span>
      </div>

      {/* Header */}
      <div className="bg-white border border-neutral-200 rounded-2xl p-5 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-3.5">
          <div className="w-11 h-11 rounded-xl bg-neutral-100 border border-neutral-200 text-neutral-900 flex items-center justify-center font-bold">
            <GraduationCap className="w-5 h-5" />
          </div>
          <div>
            <h1 className="text-2xl font-black tracking-tight text-black">
              IGHO Classroom Institutions
            </h1>
            <p className="text-xs text-neutral-500">
              Directory of educational institutions, colleges, and school organizations enrolled or waitlisted on the platform.
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
            Schools Directory
          </button>
          <button
            onClick={() => setActiveSubTab('waitlist')}
            className={`px-3.5 py-1.5 rounded-lg transition-all flex items-center gap-1.5 ${
              activeSubTab === 'waitlist'
                ? 'bg-black text-white shadow-xs'
                : 'text-neutral-500 hover:text-neutral-800'
            }`}
          >
            <span>Classroom Waitlist</span>
            {waitlist.filter(item => item.status === 'pending').length > 0 && (
              <span className="w-2 h-2 rounded-full bg-blue-500"></span>
            )}
          </button>
        </div>
      </div>

      {/* Metric Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3.5">
        <div className="bg-white border border-neutral-200 rounded-2xl p-4 shadow-xs">
          <span className="text-[10px] text-neutral-500 font-bold uppercase tracking-wider block">Total Schools</span>
          <div className="text-2xl font-black text-black mt-1">{schools.length}</div>
          <span className="text-[10px] text-neutral-400">Enrolled tenancies</span>
        </div>
        <div className="bg-white border border-neutral-200 rounded-2xl p-4 shadow-xs">
          <span className="text-[10px] text-neutral-500 font-bold uppercase tracking-wider block">Active Campuses</span>
          <div className="text-2xl font-black text-emerald-700 mt-1">0</div>
          <span className="text-[10px] text-neutral-400">Operational</span>
        </div>
        <div className="bg-white border border-neutral-200 rounded-2xl p-4 shadow-xs">
          <span className="text-[10px] text-neutral-500 font-bold uppercase tracking-wider block">Waitlist Intake</span>
          <div className="text-2xl font-black text-blue-600 mt-1">{waitlist.length}</div>
          <span className="text-[10px] text-neutral-400">Total early applications</span>
        </div>
        <div className="bg-white border border-neutral-200 rounded-2xl p-4 shadow-xs">
          <span className="text-[10px] text-neutral-500 font-bold uppercase tracking-wider block">Pending Intake</span>
          <div className="text-2xl font-black text-amber-600 mt-1">
            {waitlist.filter(w => w.status === 'pending').length}
          </div>
          <span className="text-[10px] text-neutral-400">Awaiting screening</span>
        </div>
      </div>

      {/* Main View Layout depending on Active Subtab */}
      {activeSubTab === 'directory' ? (
        <div className="bg-white border border-neutral-200 rounded-2xl p-12 text-center space-y-4 shadow-xs">
          <div className="w-12 h-12 rounded-2xl bg-neutral-100 border border-neutral-200 flex items-center justify-center mx-auto text-neutral-500">
            <GraduationCap className="w-6 h-6" />
          </div>
          <div className="space-y-1 max-w-md mx-auto">
            <h3 className="text-base font-bold text-black">No educational institutions enrolled yet</h3>
            <p className="text-xs text-neutral-500 leading-relaxed">
              All placeholder school records have been removed. As academic institutions complete onboarding via the IGHO Classroom system, their administration telemetry will appear here.
            </p>
          </div>
        </div>
      ) : (
        /* Classroom Waitlist Section */
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
                placeholder="Search Classroom waitlist..."
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
                      <th className="py-3 px-4">School & Applicant</th>
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
                          <p className="text-[10px] text-neutral-500 mt-0.5">Applicant: {item.fullName}</p>
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
