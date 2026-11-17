import React, { useState, useEffect } from 'react';
import {
  GraduationCap,
  Cross,
  Search,
  Filter,
  CheckCircle2,
  Clock,
  Mail,
  Phone,
  Building2,
  MapPin,
  Trash2,
  Download,
  Eye,
  X,
  MessageSquare,
  Sparkles,
  Layers,
  ChevronRight,
} from 'lucide-react';
import { WaitlistEntry } from '../../types';
import { BackButton } from '../BackButton';
import { getAuthHeaders } from '../../utils/storageUpload';

interface ConsoleWaitlistsViewProps {
  onNavigateBreadcrumb?: () => void;
}

export const ConsoleWaitlistsView: React.FC<ConsoleWaitlistsViewProps> = ({
  onNavigateBreadcrumb,
}) => {
  const [waitlist, setWaitlist] = useState<WaitlistEntry[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [productFilter, setProductFilter] = useState<'all' | 'classroom' | 'medbay'>('all');
  const [statusFilter, setStatusFilter] = useState<'all' | 'pending' | 'contacted' | 'approved' | 'rejected'>('all');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [inspectingEntry, setInspectingEntry] = useState<WaitlistEntry | null>(null);
  const [currentPage, setCurrentPage] = useState<number>(1);
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);
  const [waitlistBanner, setWaitlistBanner] = useState<string | null>(null);
  const pageSize = 10;

  // Load waitlist from server and localStorage
  const loadWaitlists = async () => {
    try {
      // 1. First load from server
      const res = await fetch('/api/waitlists');
      if (res.ok) {
        const data = await res.json();
        if (data.success && Array.isArray(data.waitlists) && data.waitlists.length > 0) {
          setWaitlist(data.waitlists);
          localStorage.setItem('igho_waitlists', JSON.stringify(data.waitlists));
          setLoading(false);
          return;
        }
      }
    } catch (err) {
      console.warn('Could not fetch waitlist from /api/waitlists, falling back to local store:', err);
    }

    // 2. Fallback to localStorage
    try {
      const stored = localStorage.getItem('igho_waitlists');
      if (stored) {
        const parsed: WaitlistEntry[] = JSON.parse(stored);
        setWaitlist(parsed);
      } else {
        setWaitlist([]);
      }
    } catch {
      setWaitlist([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadWaitlists();

    const handleUpdate = () => {
      loadWaitlists();
    };
    window.addEventListener('igho_waitlists_updated', handleUpdate);
    return () => window.removeEventListener('igho_waitlists_updated', handleUpdate);
  }, []);

  // Update entry status
  const handleUpdateStatus = async (id: string, newStatus: WaitlistEntry['status']) => {
    try {
      const headers = await getAuthHeaders({ 'Content-Type': 'application/json' });
      await fetch(`/api/waitlists/${encodeURIComponent(id)}`, {
        method: 'PATCH',
        headers,
        body: JSON.stringify({ status: newStatus }),
      });
    } catch (err) {
      console.error('Error updating status on server:', err);
    }

    setWaitlist((prev) => {
      const updated = prev.map((item) =>
        item.id === id ? { ...item, status: newStatus, updatedAt: new Date().toISOString() } : item
      );
      localStorage.setItem('igho_waitlists', JSON.stringify(updated));
      return updated;
    });

    if (inspectingEntry?.id === id) {
      setInspectingEntry((prev) => (prev ? { ...prev, status: newStatus } : null));
    }
  };

  // Delete waitlist entry
  const handleDeleteEntry = async (id: string) => {
    setConfirmDeleteId(null);
    try {
      const headers = await getAuthHeaders();
      await fetch(`/api/waitlists/${encodeURIComponent(id)}`, {
        method: 'DELETE',
        headers,
      });
    } catch (err) {
      console.error('Error deleting waitlist on server:', err);
    }

    setWaitlist((prev) => {
      const updated = prev.filter((item) => item.id !== id);
      localStorage.setItem('igho_waitlists', JSON.stringify(updated));
      return updated;
    });

    if (inspectingEntry?.id === id) {
      setInspectingEntry(null);
    }
  };

  // Export to CSV
  const handleExportCsv = () => {
    if (waitlist.length === 0) {
      setWaitlistBanner('No waitlist entries to export.');
      setTimeout(() => setWaitlistBanner(null), 3000);
      return;
    }
    const headers = ['ID', 'Product', 'Full Name', 'Email', 'Phone', 'Organization', 'Type', 'City', 'State', 'Status', 'Submitted At', 'Comments'];
    const rows = waitlist.map((w) => [
      w.id,
      w.product,
      `"${w.fullName.replace(/"/g, '""')}"`,
      w.email,
      `"${w.phone}"`,
      `"${w.orgName.replace(/"/g, '""')}"`,
      `"${w.institutionType.replace(/"/g, '""')}"`,
      `"${w.city}"`,
      `"${w.stateName}"`,
      w.status,
      w.createdAt,
      `"${(w.additionalComments || '').replace(/"/g, '""')}"`,
    ]);

    const csvContent = 'data:text/csv;charset=utf-8,' + [headers.join(','), ...rows.map((e) => e.join(','))].join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `igo_waitlists_${new Date().toISOString().split('T')[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // Filtering
  const filteredWaitlist = waitlist.filter((item) => {
    const matchesProduct = productFilter === 'all' || item.product === productFilter;
    const matchesStatus = statusFilter === 'all' || item.status === statusFilter;
    const q = searchQuery.toLowerCase().trim();
    const matchesSearch =
      !q ||
      item.fullName.toLowerCase().includes(q) ||
      item.email.toLowerCase().includes(q) ||
      item.phone.toLowerCase().includes(q) ||
      item.orgName.toLowerCase().includes(q) ||
      item.city.toLowerCase().includes(q) ||
      item.stateName.toLowerCase().includes(q);

    return matchesProduct && matchesStatus && matchesSearch;
  });

  const totalPages = Math.ceil(filteredWaitlist.length / pageSize) || 1;
  const paginatedWaitlist = filteredWaitlist.slice((currentPage - 1) * pageSize, currentPage * pageSize);

  // Counts
  const totalCount = waitlist.length;
  const classroomCount = waitlist.filter((w) => w.product === 'classroom').length;
  const medbayCount = waitlist.filter((w) => w.product === 'medbay').length;
  const pendingCount = waitlist.filter((w) => w.status === 'pending').length;
  const contactedCount = waitlist.filter((w) => w.status === 'contacted' || w.status === 'approved').length;

  return (
    <div className="space-y-6 text-neutral-900">
      {/* Breadcrumb */}
      <div className="flex items-center gap-3 text-xs text-neutral-500">
        <BackButton onClick={onNavigateBreadcrumb} />
        <span className="text-neutral-900 font-bold text-sm">Waitlist Registry</span>
      </div>

      {/* Header Banner */}
      <div className="bg-white border border-neutral-200 rounded-2xl p-5 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-3.5">
          <div className="w-11 h-11 rounded-xl bg-neutral-100 border border-neutral-200 text-neutral-900 flex items-center justify-center font-bold">
            <Layers className="w-5 h-5" />
          </div>
          <div>
            <h1 className="text-2xl font-black tracking-tight text-black">
              Waitlist Registry & Intake
            </h1>
            <p className="text-xs text-neutral-500">
              Receive and manage priority early-access applications for IGHO Classroom (Schools) and IGHO MedBay (Hospitals).
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={handleExportCsv}
            disabled={waitlist.length === 0}
            className="flex items-center gap-1.5 px-3.5 py-2 rounded-full border border-neutral-300 hover:bg-neutral-50 text-neutral-800 font-bold text-xs transition-colors cursor-pointer disabled:opacity-50"
          >
            <Download className="w-3.5 h-3.5" />
            <span>Export CSV</span>
          </button>
          <button
            type="button"
            onClick={loadWaitlists}
            className="flex items-center gap-1.5 px-3.5 py-2 rounded-full bg-black hover:bg-neutral-800 text-white font-bold text-xs transition-colors cursor-pointer shadow-sm active:scale-95"
          >
            <span>Refresh</span>
          </button>
        </div>
      </div>

      {waitlistBanner && (
        <div className="p-3 bg-neutral-900 text-white rounded-xl text-xs font-semibold">
          {waitlistBanner}
        </div>
      )}

      {/* Metric Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-5 gap-3.5">
        <div className="bg-white border border-neutral-200 rounded-2xl p-4 shadow-2xs">
          <span className="text-[10px] text-neutral-500 font-bold uppercase tracking-wider block">Total Signups</span>
          <div className="text-2xl font-black text-black mt-1">{totalCount}</div>
          <span className="text-[10px] text-neutral-400">All pre-release products</span>
        </div>

        <div className="bg-white border border-neutral-200 rounded-2xl p-4 shadow-2xs">
          <span className="text-[10px] text-blue-600 font-bold uppercase tracking-wider block flex items-center gap-1">
            <GraduationCap className="w-3 h-3" />
            <span>Classroom</span>
          </span>
          <div className="text-2xl font-black text-blue-700 mt-1">{classroomCount}</div>
          <span className="text-[10px] text-neutral-400">Schools & colleges</span>
        </div>

        <div className="bg-white border border-neutral-200 rounded-2xl p-4 shadow-2xs">
          <span className="text-[10px] text-rose-600 font-bold uppercase tracking-wider block flex items-center gap-1">
            <Cross className="w-3 h-3" />
            <span>MedBay</span>
          </span>
          <div className="text-2xl font-black text-rose-700 mt-1">{medbayCount}</div>
          <span className="text-[10px] text-neutral-400">Hospitals & clinics</span>
        </div>

        <div className="bg-white border border-neutral-200 rounded-2xl p-4 shadow-2xs">
          <span className="text-[10px] text-amber-600 font-bold uppercase tracking-wider block">Pending Review</span>
          <div className="text-2xl font-black text-amber-700 mt-1">{pendingCount}</div>
          <span className="text-[10px] text-neutral-400">Awaiting contact</span>
        </div>

        <div className="bg-white border border-neutral-200 rounded-2xl p-4 shadow-2xs col-span-2 sm:col-span-1">
          <span className="text-[10px] text-emerald-600 font-bold uppercase tracking-wider block">Contacted</span>
          <div className="text-2xl font-black text-emerald-700 mt-1">{contactedCount}</div>
          <span className="text-[10px] text-neutral-400">Pre-onboarded</span>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="bg-white border border-neutral-200 rounded-2xl p-4 shadow-xs flex flex-wrap items-center justify-between gap-3">
        <div className="relative flex-1 min-w-[240px] max-w-md">
          <Search className="w-4 h-4 text-neutral-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => {
              setSearchQuery(e.target.value);
              setCurrentPage(1);
            }}
            placeholder="Search by name, organization, email, city, state..."
            className="w-full bg-neutral-50 border border-neutral-200 rounded-xl pl-9 pr-3 py-2 text-xs text-neutral-900 placeholder:text-neutral-400 focus:outline-none focus:border-black focus:bg-white transition-colors"
          />
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {/* Product Filter Buttons */}
          <div className="flex items-center bg-neutral-100 p-1 rounded-xl text-xs font-semibold">
            <button
              type="button"
              onClick={() => {
                setProductFilter('all');
                setCurrentPage(1);
              }}
              className={`px-3 py-1 rounded-lg transition-colors cursor-pointer ${
                productFilter === 'all' ? 'bg-white text-black shadow-xs font-bold' : 'text-neutral-600 hover:text-black'
              }`}
            >
              All ({waitlist.length})
            </button>
            <button
              type="button"
              onClick={() => {
                setProductFilter('classroom');
                setCurrentPage(1);
              }}
              className={`px-3 py-1 rounded-lg transition-colors cursor-pointer flex items-center gap-1 ${
                productFilter === 'classroom' ? 'bg-white text-blue-700 shadow-xs font-bold' : 'text-neutral-600 hover:text-black'
              }`}
            >
              <GraduationCap className="w-3.5 h-3.5 text-blue-600" />
              <span>Classroom ({classroomCount})</span>
            </button>
            <button
              type="button"
              onClick={() => {
                setProductFilter('medbay');
                setCurrentPage(1);
              }}
              className={`px-3 py-1 rounded-lg transition-colors cursor-pointer flex items-center gap-1 ${
                productFilter === 'medbay' ? 'bg-white text-rose-700 shadow-xs font-bold' : 'text-neutral-600 hover:text-black'
              }`}
            >
              <Cross className="w-3.5 h-3.5 text-rose-600" />
              <span>MedBay ({medbayCount})</span>
            </button>
          </div>

          {/* Status Filter */}
          <select
            value={statusFilter}
            onChange={(e) => {
              setStatusFilter(e.target.value as any);
              setCurrentPage(1);
            }}
            className="bg-neutral-50 border border-neutral-200 rounded-xl px-3 py-2 text-xs text-neutral-800 font-medium focus:outline-none focus:border-black"
          >
            <option value="all">All Statuses</option>
            <option value="pending">Pending Review ({pendingCount})</option>
            <option value="contacted">Contacted</option>
            <option value="approved">Approved</option>
            <option value="rejected">Rejected</option>
          </select>
        </div>
      </div>

      {/* Main Table */}
      {filteredWaitlist.length === 0 ? (
        <div className="bg-white border border-neutral-200 rounded-2xl p-12 text-center space-y-4 shadow-xs">
          <div className="w-12 h-12 rounded-2xl bg-neutral-100 border border-neutral-200 flex items-center justify-center mx-auto text-neutral-500">
            <Layers className="w-6 h-6" />
          </div>
          <div className="space-y-1 max-w-md mx-auto">
            <h3 className="text-base font-bold text-black">No waitlist applications found</h3>
            <p className="text-xs text-neutral-500 leading-relaxed">
              {searchQuery || productFilter !== 'all' || statusFilter !== 'all'
                ? 'No waitlist submissions match your current search and filter criteria.'
                : 'Waitlist submissions from the website will appear here in real time.'}
            </p>
          </div>
        </div>
      ) : (
        <div className="bg-white border border-neutral-200 rounded-2xl shadow-xs overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-neutral-50 border-b border-neutral-200 text-[10px] font-bold uppercase tracking-wider text-neutral-500">
                  <th className="p-4">Applicant & Reference</th>
                  <th className="p-4">Product</th>
                  <th className="p-4">Institution / Organization</th>
                  <th className="p-4">Contact Info</th>
                  <th className="p-4">Location</th>
                  <th className="p-4">Status</th>
                  <th className="p-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-neutral-100 text-xs text-neutral-800">
                {paginatedWaitlist.map((item) => (
                  <tr key={item.id} className="hover:bg-neutral-50/80 transition-colors">
                    <td className="p-4">
                      <div className="font-bold text-neutral-900">{item.fullName}</div>
                      <div className="text-[10px] text-neutral-400 font-mono mt-0.5">
                        ID: {item.id} · {item.createdAt ? item.createdAt.split('T')[0] : 'Today'}
                      </div>
                    </td>

                    <td className="p-4">
                      {item.product === 'classroom' ? (
                        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-bold bg-blue-50 text-blue-700 border border-blue-200">
                          <GraduationCap className="w-3.5 h-3.5 text-blue-600" />
                          <span>Classroom</span>
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-bold bg-rose-50 text-rose-700 border border-rose-200">
                          <Cross className="w-3.5 h-3.5 text-rose-600" />
                          <span>MedBay</span>
                        </span>
                      )}
                    </td>

                    <td className="p-4">
                      <div className="font-semibold text-neutral-900">{item.orgName}</div>
                      <div className="text-[10px] text-neutral-500 mt-0.5">{item.institutionType}</div>
                    </td>

                    <td className="p-4">
                      <div className="flex items-center gap-1.5 text-neutral-900 font-medium">
                        <Mail className="w-3.5 h-3.5 text-neutral-400 shrink-0" />
                        <a href={`mailto:${item.email}`} className="hover:underline">{item.email}</a>
                      </div>
                      <div className="flex items-center gap-1.5 text-neutral-600 text-[11px] font-mono mt-0.5">
                        <Phone className="w-3.5 h-3.5 text-neutral-400 shrink-0" />
                        <a href={`tel:${item.phone}`} className="hover:underline">{item.phone}</a>
                      </div>
                    </td>

                    <td className="p-4">
                      <div className="flex items-center gap-1 text-neutral-700">
                        <MapPin className="w-3.5 h-3.5 text-neutral-400 shrink-0" />
                        <span>{item.city}, {item.stateName}</span>
                      </div>
                    </td>

                    <td className="p-4">
                      {item.status === 'pending' ? (
                        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-amber-50 text-amber-700 border border-amber-200">
                          <Clock className="w-3 h-3" />
                          Pending Review
                        </span>
                      ) : item.status === 'contacted' ? (
                        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-blue-50 text-blue-700 border border-blue-200">
                          <Mail className="w-3 h-3" />
                          Contacted
                        </span>
                      ) : item.status === 'approved' ? (
                        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
                          <CheckCircle2 className="w-3 h-3" />
                          Approved
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-neutral-100 text-neutral-600 border border-neutral-200">
                          Rejected
                        </span>
                      )}
                    </td>

                    <td className="p-4 text-right">
                      <div className="flex items-center justify-end gap-1.5">
                        <button
                          type="button"
                          onClick={() => setInspectingEntry(item)}
                          className="px-2.5 py-1 rounded-lg border border-neutral-200 text-neutral-700 hover:bg-neutral-100 text-xs font-semibold flex items-center gap-1 cursor-pointer"
                        >
                          <Eye className="w-3 h-3" />
                          <span>View</span>
                        </button>

                        <button
                          type="button"
                          onClick={() =>
                            handleUpdateStatus(
                              item.id,
                              item.status === 'pending' ? 'contacted' : item.status === 'contacted' ? 'approved' : 'pending'
                            )
                          }
                          className="px-2.5 py-1 rounded-lg border border-neutral-200 hover:bg-neutral-100 text-xs font-bold text-neutral-800 transition-colors cursor-pointer"
                          title="Cycle status: Pending -> Contacted -> Approved"
                        >
                          {item.status === 'pending' ? 'Mark Contacted' : item.status === 'contacted' ? 'Approve' : 'Reset'}
                        </button>

                        {confirmDeleteId === item.id ? (
                          <div className="flex items-center gap-1">
                            <button
                              type="button"
                              onClick={() => handleDeleteEntry(item.id)}
                              className="px-2 py-1 rounded-lg bg-rose-600 text-white font-bold text-[10px] hover:bg-rose-700 cursor-pointer"
                            >
                              Confirm
                            </button>
                            <button
                              type="button"
                              onClick={() => setConfirmDeleteId(null)}
                              className="px-2 py-1 rounded-lg border border-neutral-200 text-neutral-600 font-semibold text-[10px] hover:bg-neutral-100 cursor-pointer"
                            >
                              Cancel
                            </button>
                          </div>
                        ) : (
                          <button
                            type="button"
                            onClick={() => setConfirmDeleteId(item.id)}
                            className="p-1 rounded-lg border border-neutral-200 text-neutral-400 hover:text-rose-600 hover:border-rose-300 hover:bg-rose-50 transition-colors cursor-pointer"
                            title="Delete entry"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {totalPages > 1 && (
            <div className="flex items-center justify-between p-4 border-t border-neutral-100 text-xs text-neutral-600">
              <span>
                Page {currentPage} of {totalPages} ({filteredWaitlist.length} total entries)
              </span>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  disabled={currentPage === 1}
                  onClick={() => setCurrentPage((p) => Math.max(p - 1, 1))}
                  className="px-3 py-1 rounded-lg border border-neutral-200 disabled:opacity-50 cursor-pointer"
                >
                  Previous
                </button>
                <button
                  type="button"
                  disabled={currentPage === totalPages}
                  onClick={() => setCurrentPage((p) => Math.min(p + 1, totalPages))}
                  className="px-3 py-1 rounded-lg border border-neutral-200 disabled:opacity-50 cursor-pointer"
                >
                  Next
                </button>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Inspect Waitlist Entry Modal */}
      {inspectingEntry && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white border border-neutral-200 rounded-3xl p-6 sm:p-8 max-w-lg w-full shadow-2xl space-y-5 animate-in fade-in duration-200">
            <div className="flex items-center justify-between border-b border-neutral-100 pb-3">
              <div className="flex items-center gap-2.5">
                <div className={`w-10 h-10 rounded-2xl flex items-center justify-center ${
                  inspectingEntry.product === 'classroom' ? 'bg-blue-50 text-blue-700 border border-blue-200' : 'bg-rose-50 text-rose-700 border border-rose-200'
                }`}>
                  {inspectingEntry.product === 'classroom' ? <GraduationCap className="w-5 h-5" /> : <Cross className="w-5 h-5" />}
                </div>
                <div>
                  <h3 className="text-base font-black text-black">
                    {inspectingEntry.product === 'classroom' ? 'Classroom Early Access Request' : 'MedBay Priority Intake'}
                  </h3>
                  <span className="text-[10px] font-mono text-neutral-400">UID: {inspectingEntry.id}</span>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setInspectingEntry(null)}
                className="p-1.5 rounded-lg text-neutral-400 hover:text-black hover:bg-neutral-100"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="space-y-3 text-xs">
              <div className="p-4 bg-neutral-50 rounded-2xl border border-neutral-200 space-y-2.5">
                <div className="flex justify-between items-center border-b border-neutral-200 pb-2">
                  <span className="text-neutral-500 font-semibold">Contact Person:</span>
                  <span className="font-bold text-black text-sm">{inspectingEntry.fullName}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-neutral-500 font-semibold">Organization:</span>
                  <span className="font-bold text-black">{inspectingEntry.orgName}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-neutral-500 font-semibold">Institution Type:</span>
                  <span className="font-medium text-neutral-800">{inspectingEntry.institutionType}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-neutral-500 font-semibold">Email:</span>
                  <a href={`mailto:${inspectingEntry.email}`} className="font-mono text-blue-600 hover:underline">
                    {inspectingEntry.email}
                  </a>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-neutral-500 font-semibold">Phone:</span>
                  <a href={`tel:${inspectingEntry.phone}`} className="font-mono text-neutral-800 hover:underline">
                    {inspectingEntry.phone}
                  </a>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-neutral-500 font-semibold">Location:</span>
                  <span className="font-medium text-neutral-800">{inspectingEntry.city}, {inspectingEntry.stateName}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-neutral-500 font-semibold">Submitted:</span>
                  <span className="font-mono text-neutral-600">{inspectingEntry.createdAt}</span>
                </div>
              </div>

              {inspectingEntry.additionalComments && (
                <div className="p-3 bg-neutral-50 rounded-2xl border border-neutral-200 space-y-1">
                  <span className="text-[10px] font-bold uppercase text-neutral-500 block">Applicant Comments:</span>
                  <p className="text-neutral-800 text-xs leading-relaxed italic">
                    "{inspectingEntry.additionalComments}"
                  </p>
                </div>
              )}

              {/* Status Update Strip */}
              <div className="p-3 bg-neutral-100 rounded-2xl flex items-center justify-between">
                <span className="text-[11px] font-bold text-neutral-600">Update Intake Status:</span>
                <div className="flex items-center gap-1.5">
                  <button
                    type="button"
                    onClick={() => handleUpdateStatus(inspectingEntry.id, 'pending')}
                    className={`px-2.5 py-1 rounded-lg text-xs font-bold ${
                      inspectingEntry.status === 'pending' ? 'bg-amber-100 text-amber-800 border border-amber-300' : 'bg-white text-neutral-600'
                    }`}
                  >
                    Pending
                  </button>
                  <button
                    type="button"
                    onClick={() => handleUpdateStatus(inspectingEntry.id, 'contacted')}
                    className={`px-2.5 py-1 rounded-lg text-xs font-bold ${
                      inspectingEntry.status === 'contacted' ? 'bg-blue-100 text-blue-800 border border-blue-300' : 'bg-white text-neutral-600'
                    }`}
                  >
                    Contacted
                  </button>
                  <button
                    type="button"
                    onClick={() => handleUpdateStatus(inspectingEntry.id, 'approved')}
                    className={`px-2.5 py-1 rounded-lg text-xs font-bold ${
                      inspectingEntry.status === 'approved' ? 'bg-emerald-100 text-emerald-800 border border-emerald-300' : 'bg-white text-neutral-600'
                    }`}
                  >
                    Approved
                  </button>
                </div>
              </div>
            </div>

            <div className="flex items-center gap-2 pt-2">
              <button
                type="button"
                onClick={() => setInspectingEntry(null)}
                className="w-full py-2.5 rounded-xl bg-black text-white text-xs font-bold hover:bg-neutral-800 transition-colors shadow-sm cursor-pointer"
              >
                Close Application Details
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
