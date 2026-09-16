import React, { useState } from 'react';
import {
  MessageSquare,
  AlertCircle,
  CheckCircle2,
  Clock,
  Send,
  User,
  Building2,
  Filter,
  Search,
} from 'lucide-react';
import { GuestReport } from '../../types';

interface HotelGuestReportsViewProps {
  reports: GuestReport[];
  onUpdateReportStatus?: (reportId: string, status: GuestReport['status'], feedback?: string) => void;
}

export const HotelGuestReportsView: React.FC<HotelGuestReportsViewProps> = ({
  reports,
  onUpdateReportStatus,
}) => {
  const [selectedReport, setSelectedReport] = useState<GuestReport | null>(null);
  const [feedbackText, setFeedbackText] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState('');

  const filteredReports = reports.filter((r) => {
    if (statusFilter !== 'all' && r.status !== statusFilter) return false;
    const q = searchQuery.toLowerCase();
    return (
      !q ||
      r.guestName.toLowerCase().includes(q) ||
      r.subject.toLowerCase().includes(q) ||
      (r.roomNumber && r.roomNumber.toLowerCase().includes(q))
    );
  });

  const handleSendFeedback = (newStatus: GuestReport['status']) => {
    if (!selectedReport) return;
    if (onUpdateReportStatus) {
      onUpdateReportStatus(selectedReport.id, newStatus, feedbackText || selectedReport.hotelFeedback);
    }
    setSelectedReport(null);
    setFeedbackText('');
  };

  return (
    <div className="space-y-6 max-w-6xl">
      {/* Header */}
      <div className="bg-white border border-neutral-200 rounded-2xl p-5 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-black text-black tracking-tight">Guest Inquiries & Complaints</h1>
          <p className="text-xs text-neutral-500">
            Real-time guest support tickets, room maintenance issues, and management responses.
          </p>
        </div>

        <div className="inline-flex items-center gap-1 bg-neutral-100 p-1 rounded-full border border-neutral-200/60 text-xs font-semibold overflow-x-auto">
          {['all', 'submitted', 'under_review', 'in_progress', 'resolved'].map((st) => (
            <button
              key={st}
              onClick={() => setStatusFilter(st)}
              className={`px-4 py-1.5 rounded-full capitalize transition-colors whitespace-nowrap ${
                statusFilter === st ? 'bg-black text-white shadow-xs font-bold' : 'text-neutral-600 hover:text-black'
              }`}
            >
              {st.replace('_', ' ')}
            </button>
          ))}
        </div>
      </div>

      {/* Table of Reports */}
      <div className="bg-white border border-neutral-200 rounded-2xl overflow-hidden shadow-xs">
        {filteredReports.length === 0 ? (
          <div className="p-12 text-center text-xs text-neutral-400 space-y-1">
            <p className="font-semibold text-neutral-600">No guest reports or complaints found</p>
            <p>Tickets submitted by registered guests from their portals will appear here.</p>
          </div>
        ) : (
          <table className="w-full text-left text-xs">
            <thead className="bg-neutral-50 border-b border-neutral-200 text-[11px] font-semibold text-neutral-500">
              <tr>
                <th className="py-3 px-4">Guest</th>
                <th className="py-3 px-4">Room</th>
                <th className="py-3 px-4">Category</th>
                <th className="py-3 px-4">Subject</th>
                <th className="py-3 px-4">Date</th>
                <th className="py-3 px-4">Status</th>
                <th className="py-3 px-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-neutral-100">
              {filteredReports.map((r) => (
                <tr key={r.id} className="hover:bg-neutral-50/70 transition-colors">
                  <td className="py-3 px-4">
                    <div className="font-bold text-black">{r.guestName}</div>
                    <div className="text-[11px] text-neutral-400">{r.guestEmail}</div>
                  </td>
                  <td className="py-3 px-4 font-semibold text-neutral-700">
                    {r.roomNumber ? `Room ${r.roomNumber}` : 'General'}
                  </td>
                  <td className="py-3 px-4">
                    <span className="px-2 py-0.5 rounded-md text-[10px] font-bold bg-neutral-100 text-neutral-700 uppercase">
                      {r.category}
                    </span>
                  </td>
                  <td className="py-3 px-4 font-medium text-neutral-900 max-w-xs truncate">
                    {r.subject}
                  </td>
                  <td className="py-3 px-4 text-neutral-500">
                    {new Date(r.createdAt).toLocaleDateString()}
                  </td>
                  <td className="py-3 px-4">
                    <span
                      className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase ${
                        r.status === 'resolved'
                          ? 'bg-emerald-50 text-emerald-800 border border-emerald-200'
                          : r.status === 'in_progress'
                          ? 'bg-blue-50 text-blue-800 border border-blue-200'
                          : 'bg-amber-50 text-amber-900 border border-amber-200'
                      }`}
                    >
                      {r.status.replace('_', ' ')}
                    </span>
                  </td>
                  <td className="py-3 px-4 text-right">
                    <button
                      onClick={() => {
                        setSelectedReport(r);
                        setFeedbackText(r.hotelFeedback || '');
                      }}
                      className="px-4 py-1.5 bg-black text-white text-[11px] font-bold rounded-full hover:bg-neutral-800 transition-all whitespace-nowrap"
                    >
                      Respond
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {/* RESPONSE DRAWER / MODAL */}
      {selectedReport && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-lg w-full p-6 space-y-5 shadow-2xl animate-in zoom-in-95 duration-150">
            <div className="flex items-center justify-between border-b border-neutral-100 pb-3">
              <div>
                <h3 className="font-bold text-base text-black">Guest Report Details</h3>
                <p className="text-xs text-neutral-500">
                  From {selectedReport.guestName} · {selectedReport.roomNumber ? `Room ${selectedReport.roomNumber}` : 'General Inquiry'}
                </p>
              </div>
              <button
                onClick={() => setSelectedReport(null)}
                className="text-neutral-400 hover:text-black font-bold text-sm"
              >
                ✕
              </button>
            </div>

            <div className="bg-neutral-50 border border-neutral-200 rounded-2xl p-4 space-y-2">
              <span className="text-xs font-bold text-black block">{selectedReport.subject}</span>
              <p className="text-xs text-neutral-600 leading-relaxed whitespace-pre-wrap">
                {selectedReport.description}
              </p>
            </div>

            <div className="space-y-2">
              <label className="block text-xs font-semibold text-neutral-700">
                Official Hotel Staff Resolution Response
              </label>
              <textarea
                rows={3}
                value={feedbackText}
                onChange={(e) => setFeedbackText(e.target.value)}
                placeholder="Type resolution feedback or action taken (e.g. Maintenance technician dispatched to inspect AC unit)..."
                className="w-full bg-white border border-neutral-300 rounded-xl p-3 text-xs text-neutral-900 focus:outline-none focus:border-black"
              />
            </div>

            <div className="flex flex-wrap items-center gap-2 pt-2 border-t border-neutral-100">
              <button
                onClick={() => handleSendFeedback('resolved')}
                className="flex-1 bg-emerald-600 hover:bg-emerald-700 text-white py-2.5 rounded-full font-bold text-xs transition-colors"
              >
                Resolve Ticket
              </button>
              <button
                onClick={() => handleSendFeedback('in_progress')}
                className="px-5 bg-black text-white hover:bg-neutral-800 py-2.5 rounded-full font-semibold text-xs transition-colors"
              >
                Mark In Progress
              </button>
              <button
                onClick={() => setSelectedReport(null)}
                className="px-4 border border-neutral-200 text-neutral-700 hover:bg-neutral-50 py-2.5 rounded-full text-xs font-medium transition-colors"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
