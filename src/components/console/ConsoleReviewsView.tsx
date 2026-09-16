import React, { useState } from 'react';
import {
  MessageSquareWarning,
  Star,
  Search,
  CheckCircle2,
  Clock,
  AlertTriangle,
  Building2,
  FileText,
  ArrowLeft,
  ChevronLeft,
  ChevronRight,
  ShieldAlert,
} from 'lucide-react';
import { CustomerFeedback, Hotel } from '../../types';

interface ConsoleReviewsViewProps {
  feedbacks: CustomerFeedback[];
  hotels: Hotel[];
  onUpdateFeedbackStatus: (feedbackId: string, status: any, resolutionNotes?: string) => void;
  onNavigateBreadcrumb?: () => void;
}

export const ConsoleReviewsView: React.FC<ConsoleReviewsViewProps> = ({
  feedbacks = [],
  hotels = [],
  onUpdateFeedbackStatus,
  onNavigateBreadcrumb,
}) => {
  const [typeFilter, setTypeFilter] = useState<'all' | 'complaint' | 'review'>('all');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState('');

  // Resolution Modal State
  const [resolvingItem, setResolvingItem] = useState<CustomerFeedback | null>(null);
  const [targetStatus, setTargetStatus] = useState<any>('resolved');
  const [resolutionNotes, setResolutionNotes] = useState('');

  const filteredItems = feedbacks.filter((item) => {
    const matchesType = typeFilter === 'all' || item.type === typeFilter;
    const matchesStatus = statusFilter === 'all' || item.status === statusFilter;
    const query = searchQuery.toLowerCase();
    const matchesSearch =
      !query ||
      item.subject.toLowerCase().includes(query) ||
      item.content.toLowerCase().includes(query) ||
      item.guestName.toLowerCase().includes(query) ||
      item.hotelName.toLowerCase().includes(query);
    return matchesType && matchesStatus && matchesSearch;
  });

  const openResolutionModal = (item: CustomerFeedback) => {
    setResolvingItem(item);
    setTargetStatus(item.status === 'new' ? 'investigating' : 'resolved');
    setResolutionNotes(item.resolutionNotes || '');
  };

  const handleSaveResolution = () => {
    if (!resolvingItem) return;
    onUpdateFeedbackStatus(resolvingItem.id, targetStatus, resolutionNotes.trim());
    setResolvingItem(null);
  };

  const complaintsCount = feedbacks.filter((f) => f.type === 'complaint').length;
  const reviewsCount = feedbacks.filter((f) => f.type === 'review').length;
  const newCount = feedbacks.filter((f) => f.status === 'new').length;
  const resolvedCount = feedbacks.filter((f) => f.status === 'resolved').length;

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
        <span className="text-neutral-900 font-bold">Reviews & Customer Feedback</span>
      </div>

      {/* Page Header */}
      <div className="bg-white border border-neutral-200 rounded-2xl p-5 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-3.5">
          <div className="w-11 h-11 rounded-xl bg-neutral-100 border border-neutral-200 text-neutral-900 flex items-center justify-center font-bold">
            <MessageSquareWarning className="w-5 h-5" />
          </div>
          <div>
            <h1 className="text-2xl font-black tracking-tight text-black">Reviews & Feedback</h1>
            <p className="text-xs text-neutral-500">
              Platform-wide customer feedback, tenant disputes, service investigations, and quality assurance.
            </p>
          </div>
        </div>
      </div>

      {/* 4 Metric Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3.5">
        <div className="bg-white border border-neutral-200 rounded-2xl p-4 shadow-xs">
          <span className="text-[10px] text-neutral-500 font-bold uppercase tracking-wider block">Total Items</span>
          <div className="text-2xl font-black text-black mt-1">{feedbacks.length}</div>
          <span className="text-[10px] text-neutral-400">All properties</span>
        </div>
        <div className="bg-white border border-neutral-200 rounded-2xl p-4 shadow-xs">
          <span className="text-[10px] text-neutral-500 font-bold uppercase tracking-wider block">Complaints</span>
          <div className={`text-2xl font-black mt-1 ${complaintsCount > 0 ? 'text-amber-700' : 'text-neutral-400'}`}>
            {complaintsCount}
          </div>
          <span className="text-[10px] text-neutral-400">{newCount} open</span>
        </div>
        <div className="bg-white border border-neutral-200 rounded-2xl p-4 shadow-xs">
          <span className="text-[10px] text-neutral-500 font-bold uppercase tracking-wider block">Guest Reviews</span>
          <div className="text-2xl font-black text-black mt-1">{reviewsCount}</div>
          <span className="text-[10px] text-neutral-400">Public ratings</span>
        </div>
        <div className="bg-white border border-neutral-200 rounded-2xl p-4 shadow-xs">
          <span className="text-[10px] text-neutral-500 font-bold uppercase tracking-wider block">Resolved Cases</span>
          <div className="text-2xl font-black text-emerald-700 mt-1">{resolvedCount}</div>
          <span className="text-[10px] text-emerald-700 font-medium">Closed & verified</span>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="bg-white border border-neutral-200 rounded-2xl p-4 shadow-xs flex flex-wrap items-center justify-between gap-3">
        <div className="relative flex-1 min-w-[240px] max-w-md">
          <Search className="w-4 h-4 text-neutral-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search feedback content, guest or hotel name..."
            className="w-full bg-neutral-50 border border-neutral-200 rounded-xl pl-9 pr-3 py-2 text-xs text-neutral-900 placeholder:text-neutral-400 focus:outline-none focus:border-black focus:bg-white transition-colors"
          />
        </div>

        <div className="flex items-center gap-2">
          <select
            value={typeFilter}
            onChange={(e) => setTypeFilter(e.target.value as any)}
            className="bg-neutral-50 border border-neutral-200 rounded-xl px-3 py-2 text-xs text-neutral-800 font-medium focus:outline-none focus:border-black"
          >
            <option value="all">All Types</option>
            <option value="complaint">Complaints</option>
            <option value="review">Reviews</option>
          </select>
        </div>
      </div>

      {/* Feedbacks Table or Empty State */}
      {filteredItems.length === 0 ? (
        <div className="bg-white border border-neutral-200 rounded-2xl p-12 text-center space-y-4 shadow-xs">
          <div className="w-12 h-12 rounded-2xl bg-neutral-100 border border-neutral-200 flex items-center justify-center mx-auto text-neutral-500">
            <MessageSquareWarning className="w-6 h-6" />
          </div>
          <div className="space-y-1 max-w-md mx-auto">
            <h3 className="text-base font-bold text-black">No feedback records</h3>
            <p className="text-xs text-neutral-500 leading-relaxed">
              All placeholder guest reviews and complaints have been cleared. As real guests submit reviews or lodge disputes, they will appear here for super admin oversight.
            </p>
          </div>
        </div>
      ) : (
        <div className="bg-white border border-neutral-200 rounded-2xl shadow-xs overflow-hidden">
          <div className="divide-y divide-neutral-100">
            {filteredItems.map((item) => (
              <div key={item.id} className="p-4 flex items-start justify-between gap-4 hover:bg-neutral-50">
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <span className="font-bold text-black">{item.subject}</span>
                    <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-neutral-100 text-neutral-700 border border-neutral-200 uppercase">
                      {item.type}
                    </span>
                    <span className="text-xs text-neutral-500">by {item.guestName}</span>
                  </div>
                  <p className="text-xs text-neutral-600 leading-relaxed">{item.content}</p>
                  <div className="text-[10px] text-neutral-400 font-mono">Hotel: {item.hotelName}</div>
                </div>

                <button
                  onClick={() => openResolutionModal(item)}
                  className="px-3 py-1 rounded-lg border border-neutral-300 text-xs font-semibold hover:bg-neutral-100 text-neutral-800 shrink-0"
                >
                  Manage Status
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Resolution Modal */}
      {resolvingItem && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white border border-neutral-200 rounded-2xl p-6 sm:p-8 max-w-md w-full shadow-2xl space-y-4">
            <h3 className="text-lg font-bold text-neutral-900">Resolve Feedback</h3>
            <p className="text-xs text-neutral-600 font-semibold">{resolvingItem.subject}</p>
            <textarea
              rows={3}
              value={resolutionNotes}
              onChange={(e) => setResolutionNotes(e.target.value)}
              placeholder="Resolution summary or internal audit notes..."
              className="w-full bg-neutral-50 border border-neutral-300 rounded-xl p-3 text-xs text-neutral-900 focus:outline-none focus:border-black"
            />
            <div className="flex items-center justify-end gap-2">
              <button
                onClick={() => setResolvingItem(null)}
                className="px-4 py-2 rounded-xl text-xs font-semibold text-neutral-700 hover:bg-neutral-100"
              >
                Cancel
              </button>
              <button
                onClick={handleSaveResolution}
                className="px-4 py-2 rounded-full bg-black text-white text-xs font-bold hover:bg-neutral-800 shadow-sm"
              >
                Save Resolution
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
