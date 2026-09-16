import React, { useState } from 'react';
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
} from 'lucide-react';

interface ConsoleHospitalsViewProps {
  onNavigateBreadcrumb?: () => void;
}

export const ConsoleHospitalsView: React.FC<ConsoleHospitalsViewProps> = ({
  onNavigateBreadcrumb,
}) => {
  const [hospitals, setHospitals] = useState<any[]>([]);
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
        <span className="text-neutral-900 font-bold">Healthcare Centers (Hospitals)</span>
      </div>

      {/* Header */}
      <div className="bg-white border border-neutral-200 rounded-2xl p-5 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-3.5">
          <div className="w-11 h-11 rounded-xl bg-neutral-100 border border-neutral-200 text-neutral-900 flex items-center justify-center font-bold">
            <Cross className="w-5 h-5" />
          </div>
          <div>
            <h1 className="text-2xl font-black tracking-tight text-black">
              IGHO MedBay Healthcare Facilities
            </h1>
            <p className="text-xs text-neutral-500">
              Directory of hospitals, diagnostic centers, and clinics deployed on IGHO MedBay.
            </p>
          </div>
        </div>

        <button
          onClick={() => alert('Hospital facility onboarding is in development for IGHO MedBay.')}
          className="px-4 py-2.5 rounded-xl bg-black hover:bg-neutral-800 text-white font-bold text-xs transition-all flex items-center gap-1.5 shadow-sm self-start sm:self-auto"
        >
          <Plus className="w-3.5 h-3.5" />
          <span>Register Hospital</span>
        </button>
      </div>

      {/* Metric Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3.5">
        <div className="bg-white border border-neutral-200 rounded-2xl p-4 shadow-xs">
          <span className="text-[10px] text-neutral-500 font-bold uppercase tracking-wider block">Total Facilities</span>
          <div className="text-2xl font-black text-black mt-1">{hospitals.length}</div>
          <span className="text-[10px] text-neutral-400">Enrolled facilities</span>
        </div>
        <div className="bg-white border border-neutral-200 rounded-2xl p-4 shadow-xs">
          <span className="text-[10px] text-neutral-500 font-bold uppercase tracking-wider block">Active Clinics</span>
          <div className="text-2xl font-black text-emerald-700 mt-1">0</div>
          <span className="text-[10px] text-neutral-400">Operational</span>
        </div>
        <div className="bg-white border border-neutral-200 rounded-2xl p-4 shadow-xs">
          <span className="text-[10px] text-neutral-500 font-bold uppercase tracking-wider block">Total Beds</span>
          <div className="text-2xl font-black text-black mt-1">0</div>
          <span className="text-[10px] text-neutral-400">Capacity</span>
        </div>
        <div className="bg-white border border-neutral-200 rounded-2xl p-4 shadow-xs">
          <span className="text-[10px] text-neutral-500 font-bold uppercase tracking-wider block">Licensed Practitioners</span>
          <div className="text-2xl font-black text-blue-700 mt-1">0</div>
          <span className="text-[10px] text-neutral-400">Doctors & nurses</span>
        </div>
      </div>

      {/* Empty State */}
      <div className="bg-white border border-neutral-200 rounded-2xl p-12 text-center space-y-4 shadow-xs">
        <div className="w-12 h-12 rounded-2xl bg-neutral-100 border border-neutral-200 flex items-center justify-center mx-auto text-neutral-500">
          <Cross className="w-6 h-6" />
        </div>
        <div className="space-y-1 max-w-md mx-auto">
          <h3 className="text-base font-bold text-black">No healthcare facilities registered yet</h3>
          <p className="text-xs text-neutral-500 leading-relaxed">
            All placeholder hospital records have been removed. When clinical organizations register on IGHO MedBay, they will be listed here.
          </p>
        </div>
      </div>
    </div>
  );
};
