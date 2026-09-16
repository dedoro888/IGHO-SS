import React from 'react';
import {
  Layers,
  Building2,
  GraduationCap,
  Cross,
  CheckCircle2,
  Clock,
  ArrowLeft,
  ExternalLink,
} from 'lucide-react';
import { PlatformProduct, ActiveScreen } from '../../types';

interface ConsoleProductsViewProps {
  products: PlatformProduct[];
  onNavigate: (screen: ActiveScreen) => void;
  onNavigateBreadcrumb?: () => void;
}

export const ConsoleProductsView: React.FC<ConsoleProductsViewProps> = ({
  products,
  onNavigate,
  onNavigateBreadcrumb,
}) => {
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
        <span className="text-neutral-900 font-bold">Product Catalog</span>
      </div>

      {/* Page Header */}
      <div className="bg-white border border-neutral-200 rounded-2xl p-5 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-3.5">
          <div className="w-11 h-11 rounded-xl bg-neutral-100 border border-neutral-200 text-neutral-900 flex items-center justify-center font-bold">
            <Layers className="w-5 h-5" />
          </div>
          <div>
            <h1 className="text-2xl font-black tracking-tight text-black">
              IGHO Multi-Product Ecosystem
            </h1>
            <p className="text-xs text-neutral-500">
              Unified software suite powering specialized verticals: Hospitality, Education, and Healthcare.
            </p>
          </div>
        </div>

        <span className="text-xs font-semibold text-neutral-700 self-start sm:self-auto px-3 py-1.5 bg-neutral-100 border border-neutral-200 rounded-xl">
          3 Enterprise Verticals
        </span>
      </div>

      {/* Product Cards */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
        {/* 1. IGHO STAY */}
        <div className="bg-white border border-neutral-200 rounded-2xl p-6 shadow-xs flex flex-col justify-between space-y-6 hover:shadow-md transition-shadow">
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div className="w-12 h-12 rounded-xl bg-neutral-100 border border-neutral-200 text-black flex items-center justify-center">
                <Building2 className="w-6 h-6" />
              </div>
              <span className="text-[10px] font-bold font-mono px-2.5 py-1 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200">
                PRODUCTION LIVE
              </span>
            </div>

            <div>
              <h2 className="text-lg font-bold text-black">IGHO Stay</h2>
              <p className="text-xs text-neutral-500 font-medium mt-0.5">
                Hospitality, Hotel & Serviced Apartments Cloud
              </p>
            </div>

            <p className="text-xs text-neutral-600 leading-relaxed">
              Complete hotel operating system: Cloud PMS, front desk room matrix, direct guest booking engine, multi-branch governance, and role-based staff operations.
            </p>

            <div className="p-3.5 bg-neutral-50 rounded-xl border border-neutral-200 space-y-2 text-xs">
              <div className="flex justify-between text-neutral-700">
                <span>Core Vertical:</span>
                <strong className="text-black font-semibold">Hospitality PMS</strong>
              </div>
              <div className="flex justify-between text-neutral-700">
                <span>Ecosystem Version:</span>
                <strong className="text-emerald-700 font-mono">v2.4.0 (Stable)</strong>
              </div>
            </div>

            <div className="space-y-1.5 pt-1">
              <span className="text-[10px] font-bold text-neutral-500 uppercase tracking-wider block">
                Production Capabilities:
              </span>
              <ul className="space-y-1.5 text-[11px] text-neutral-600">
                <li className="flex items-center gap-1.5">
                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                  <span>Real-time Room Inventory & Calendar</span>
                </li>
                <li className="flex items-center gap-1.5">
                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                  <span>Integrated Guest Booking Engine</span>
                </li>
                <li className="flex items-center gap-1.5">
                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                  <span>Strict Role-Based Access Control (RBAC)</span>
                </li>
                <li className="flex items-center gap-1.5">
                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                  <span>Audit Logging & Bank Reconciliation</span>
                </li>
              </ul>
            </div>
          </div>

          <button
            onClick={() => onNavigate('staff_portal')}
            className="w-full flex items-center justify-center gap-2 py-2.5 rounded-xl bg-black hover:bg-neutral-800 text-white font-bold text-xs transition-colors shadow-xs"
          >
            <span>Launch Hotel Operations</span>
            <ExternalLink className="w-3.5 h-3.5" />
          </button>
        </div>

        {/* 2. IGHO CLASSROOM */}
        <div className="bg-white border border-neutral-200 rounded-2xl p-6 shadow-xs flex flex-col justify-between space-y-6 hover:shadow-md transition-shadow">
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div className="w-12 h-12 rounded-xl bg-neutral-100 border border-neutral-200 text-neutral-700 flex items-center justify-center">
                <GraduationCap className="w-6 h-6" />
              </div>
              <span className="text-[10px] font-bold font-mono px-2.5 py-1 rounded-full bg-neutral-100 text-neutral-700 border border-neutral-200">
                ENROLLED / BETA
              </span>
            </div>

            <div>
              <h2 className="text-lg font-bold text-black">IGHO Classroom</h2>
              <p className="text-xs text-neutral-500 font-medium mt-0.5">
                Modern School Operations & Academic ERP
              </p>
            </div>

            <p className="text-xs text-neutral-600 leading-relaxed">
              School management software engineered for primary, secondary, and tertiary institutions: automated continuous assessment, term report generation, tuition billing, and parent portal.
            </p>

            <div className="p-3.5 bg-neutral-50 rounded-xl border border-neutral-200 space-y-2 text-xs">
              <div className="flex justify-between text-neutral-700">
                <span>Core Vertical:</span>
                <strong className="text-black font-semibold">Education & Academics</strong>
              </div>
              <div className="flex justify-between text-neutral-700">
                <span>Architecture:</span>
                <strong className="text-neutral-900 font-mono">Multi-Tenant Core</strong>
              </div>
            </div>

            <div className="space-y-1.5 pt-1">
              <span className="text-[10px] font-bold text-neutral-500 uppercase tracking-wider block">
                Planned Core Modules:
              </span>
              <ul className="space-y-1.5 text-[11px] text-neutral-600">
                <li className="flex items-center gap-1.5">
                  <Clock className="w-3.5 h-3.5 text-neutral-400 shrink-0" />
                  <span>Student Information System & Enrollments</span>
                </li>
                <li className="flex items-center gap-1.5">
                  <Clock className="w-3.5 h-3.5 text-neutral-400 shrink-0" />
                  <span>Grading Matrix & Printable Report Cards</span>
                </li>
                <li className="flex items-center gap-1.5">
                  <Clock className="w-3.5 h-3.5 text-neutral-400 shrink-0" />
                  <span>Tuition & Fee Collection Invoicing</span>
                </li>
              </ul>
            </div>
          </div>

          <button
            disabled
            className="w-full flex items-center justify-center gap-2 py-2.5 rounded-full bg-neutral-100 text-neutral-400 font-semibold text-xs cursor-not-allowed"
          >
            <span>Beta Preview En Route</span>
          </button>
        </div>

        {/* 3. IGHO MEDBAY */}
        <div className="bg-white border border-neutral-200 rounded-2xl p-6 shadow-xs flex flex-col justify-between space-y-6 hover:shadow-md transition-shadow">
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div className="w-12 h-12 rounded-xl bg-neutral-100 border border-neutral-200 text-neutral-700 flex items-center justify-center">
                <Cross className="w-6 h-6" />
              </div>
              <span className="text-[10px] font-bold font-mono px-2.5 py-1 rounded-full bg-neutral-100 text-neutral-700 border border-neutral-200">
                ROADMAP
              </span>
            </div>

            <div>
              <h2 className="text-lg font-bold text-black">IGHO MedBay</h2>
              <p className="text-xs text-neutral-500 font-medium mt-0.5">
                Clinical Health Records & Hospital Cloud
              </p>
            </div>

            <p className="text-xs text-neutral-600 leading-relaxed">
              Integrated hospital information system (HIS) covering patient electronic medical records, outpatient clinic triage, pharmacy stock dispensation, and HMO insurance claims.
            </p>

            <div className="p-3.5 bg-neutral-50 rounded-xl border border-neutral-200 space-y-2 text-xs">
              <div className="flex justify-between text-neutral-700">
                <span>Core Vertical:</span>
                <strong className="text-black font-semibold">Healthcare & EHR</strong>
              </div>
              <div className="flex justify-between text-neutral-700">
                <span>Compliance:</span>
                <strong className="text-neutral-900 font-mono">HIPAA / NDPR Tier-1</strong>
              </div>
            </div>

            <div className="space-y-1.5 pt-1">
              <span className="text-[10px] font-bold text-neutral-500 uppercase tracking-wider block">
                Planned Core Modules:
              </span>
              <ul className="space-y-1.5 text-[11px] text-neutral-600">
                <li className="flex items-center gap-1.5">
                  <Clock className="w-3.5 h-3.5 text-neutral-400 shrink-0" />
                  <span>Electronic Medical Records (EMR)</span>
                </li>
                <li className="flex items-center gap-1.5">
                  <Clock className="w-3.5 h-3.5 text-neutral-400 shrink-0" />
                  <span>Pharmacy Inventory & Prescriptions</span>
                </li>
                <li className="flex items-center gap-1.5">
                  <Clock className="w-3.5 h-3.5 text-neutral-400 shrink-0" />
                  <span>Laboratory Diagnostics & Radiography</span>
                </li>
              </ul>
            </div>
          </div>

          <button
            disabled
            className="w-full flex items-center justify-center gap-2 py-2.5 rounded-full bg-neutral-100 text-neutral-400 font-semibold text-xs cursor-not-allowed"
          >
            <span>Roadmap</span>
          </button>
        </div>
      </div>
    </div>
  );
};
