import React, { useState } from 'react';
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
} from 'lucide-react';

interface ConsoleSchoolsViewProps {
  onNavigateBreadcrumb?: () => void;
}

export const ConsoleSchoolsView: React.FC<ConsoleSchoolsViewProps> = ({
  onNavigateBreadcrumb,
}) => {
  const [schools, setSchools] = useState<any[]>([]);
  const [searchQuery, setSearchQuery] = useState('');

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
              Directory of educational institutions, colleges, and school organizations enrolled on the platform.
            </p>
          </div>
        </div>

        <button
          onClick={() => alert('School onboarding is available in IGHO Classroom Beta.')}
          className="px-4 py-2.5 rounded-xl bg-black hover:bg-neutral-800 text-white font-bold text-xs transition-all flex items-center gap-1.5 shadow-sm self-start sm:self-auto"
        >
          <Plus className="w-3.5 h-3.5" />
          <span>Register School</span>
        </button>
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
          <span className="text-[10px] text-neutral-500 font-bold uppercase tracking-wider block">Enrolled Students</span>
          <div className="text-2xl font-black text-black mt-1">0</div>
          <span className="text-[10px] text-neutral-400">Student records</span>
        </div>
        <div className="bg-white border border-neutral-200 rounded-2xl p-4 shadow-xs">
          <span className="text-[10px] text-neutral-500 font-bold uppercase tracking-wider block">Pending Review</span>
          <div className="text-2xl font-black text-amber-700 mt-1">0</div>
          <span className="text-[10px] text-neutral-400">Verification</span>
        </div>
      </div>

      {/* Empty State */}
      <div className="bg-white border border-neutral-200 rounded-2xl p-12 text-center space-y-4 shadow-xs">
        <div className="w-12 h-12 rounded-2xl bg-neutral-100 border border-neutral-200 flex items-center justify-center mx-auto text-neutral-500">
          <GraduationCap className="w-6 h-6" />
        </div>
        <div className="space-y-1 max-w-md mx-auto">
          <h3 className="text-base font-bold text-black">No educational institutions enrolled yet</h3>
          <p className="text-xs text-neutral-500 leading-relaxed">
            All placeholder school records have been removed. As academic institutions register via IGHO Classroom, their administration telemetry will appear here.
          </p>
        </div>
      </div>
    </div>
  );
};
