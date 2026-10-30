import React from 'react';
import {
  LayoutDashboard,
  CalendarCheck,
  Bed,
  Users,
  CreditCard,
  ShieldCheck,
  Sparkles,
  BarChart3,
  Settings,
  AlertTriangle,
  Clock,
  DoorOpen,
  DoorClosed,
  CheckCircle2,
  ExternalLink,
  Wifi,
  Battery,
  Building2,
  ChevronDown,
} from 'lucide-react';
import { ActiveScreen } from '../types';

interface MacBookProDashboardProps {
  onNavigate?: (screen: ActiveScreen) => void;
}

export const MacBookProDashboard: React.FC<MacBookProDashboardProps> = () => {
  return (
    <div className="w-full flex flex-col items-center select-none pointer-events-none py-2 sm:py-4">
      {/* MACBOOK PRO HARDWARE WRAPPER */}
      <div className="w-full max-w-[780px] xl:max-w-[860px] 2xl:max-w-[940px] relative flex flex-col items-center">
        
        {/* ============================================================== */}
        {/* 1. MACBOOK PRO DISPLAY LID (Space Gray Anodized Aluminum)       */}
        {/* ============================================================== */}
        <div className="w-full relative rounded-[20px] sm:rounded-[24px] bg-gradient-to-b from-[#3a3e47] via-[#24272f] to-[#16181d] p-[2.5px] shadow-[0_30px_70px_-15px_rgba(0,0,0,0.85),0_15px_30px_-10px_rgba(0,0,0,0.6)] border border-neutral-700/60">
          
          {/* Black Glass Display Bezel */}
          <div className="relative rounded-[18px] sm:rounded-[22px] bg-[#07080a] p-[6px] sm:p-[9px] pb-[15px] sm:pb-[18px] overflow-hidden">
            
            {/* Authentic MacBook Pro Camera Notch (Apple Silicon design) */}
            <div className="absolute top-0 left-1/2 -translate-x-1/2 w-24 sm:w-32 h-3 sm:h-4 bg-[#07080a] rounded-b-xl z-30 flex items-center justify-center gap-2 border-b border-x border-[#1a1c22]">
              {/* FaceTime HD Camera Lens */}
              <div className="w-1.5 h-1.5 rounded-full bg-[#121419] border border-[#262832] flex items-center justify-center">
                <div className="w-0.5 h-0.5 rounded-full bg-[#0ea5e9]/90 shadow-[0_0_2px_#38bdf8]" />
              </div>
              {/* TrueTone / Green Indicator Sensor */}
              <div className="w-1 h-1 rounded-full bg-[#10b981]/80" />
            </div>

            {/* SCREEN CONTAINER (16:10 Liquid Retina XDR Ratio) */}
            <div className="relative w-full aspect-[16/10] bg-[#f8fafc] rounded-[7px] sm:rounded-[9px] overflow-hidden shadow-inner flex flex-col text-neutral-800 text-[8.5px] sm:text-[10px] font-sans">
              
              {/* Subtle Screen Sheen / Ambient Glare Overlay */}
              <div className="absolute inset-0 bg-gradient-to-tr from-transparent via-white/[0.02] to-white/[0.08] pointer-events-none z-20" />

              {/* ---------------- macOS Window Top Chrome Bar ---------------- */}
              <div className="h-6 sm:h-7 bg-[#f1f3f5] border-b border-neutral-200/90 px-3 flex items-center justify-between shrink-0 z-10">
                {/* Traffic Light Buttons */}
                <div className="flex items-center gap-1.5">
                  <div className="w-2.5 h-2.5 rounded-full bg-[#ff5f56] border border-[#e0443e]" />
                  <div className="w-2.5 h-2.5 rounded-full bg-[#ffbd2e] border border-[#dea123]" />
                  <div className="w-2.5 h-2.5 rounded-full bg-[#27c93f] border border-[#1aab29]" />
                </div>

                {/* macOS URL / Address Pill */}
                <div className="flex items-center gap-1.5 bg-white border border-neutral-200 px-3 py-0.5 rounded-md text-[7.5px] sm:text-[9px] text-neutral-600 font-medium shadow-3xs max-w-[280px] truncate">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 shrink-0" />
                  <span className="font-mono text-neutral-800 truncate">pms.ighostay.ng/admin/dashboard</span>
                </div>

                {/* System tray indicators */}
                <div className="flex items-center gap-2 text-[7.5px] text-neutral-500 font-medium">
                  <Wifi className="w-2.5 h-2.5 text-neutral-600" />
                  <Battery className="w-3 h-3 text-neutral-600" />
                  <span className="hidden sm:inline font-mono">14:30</span>
                </div>
              </div>

              {/* ---------------- EXACT HOTEL DASHBOARD UI (StaffPortal Layout) ---------------- */}
              <div className="flex-1 flex flex-row min-h-0 bg-[#f8fafc]">
                
                {/* LEFT SIDEBAR (Dark Charcoal Theme matching StaffPortal) */}
                <div className="w-[23%] sm:w-[21%] bg-[#0d1017] text-neutral-300 flex flex-col justify-between p-2 sm:p-2.5 border-r border-[#1a1f2c] shrink-0">
                  <div className="space-y-2">
                    {/* Hotel Brand Header */}
                    <div className="flex items-center gap-1.5 pb-2 border-b border-[#1f2636]">
                      <div className="w-5 h-5 rounded-md bg-white text-black font-black flex items-center justify-center text-[10px] shrink-0 shadow-xs">
                        LH
                      </div>
                      <div className="leading-tight truncate">
                        <span className="font-extrabold text-[8.5px] sm:text-[10px] text-white tracking-tight uppercase block truncate">
                          Lava Hotel & Suites
                        </span>
                        <span className="text-[6.5px] sm:text-[7.5px] text-emerald-400 font-bold flex items-center gap-1">
                          <span className="w-1 h-1 rounded-full bg-emerald-400" />
                          Live Hotel · Active
                        </span>
                      </div>
                    </div>

                    {/* Navigation Items (Exact copy of StaffPortal tabs) */}
                    <nav className="space-y-0.5 text-[7.5px] sm:text-[9px] font-medium">
                      {/* Dashboard (Active) */}
                      <div className="flex items-center gap-1.5 px-2 py-1 rounded-md bg-white text-black font-bold shadow-xs">
                        <LayoutDashboard className="w-3 h-3 text-black shrink-0" />
                        <span className="truncate">Dashboard</span>
                      </div>
                      <div className="flex items-center gap-1.5 px-2 py-1 rounded-md text-neutral-400 hover:text-white">
                        <CalendarCheck className="w-3 h-3 text-neutral-400 shrink-0" />
                        <span className="truncate">Reservations</span>
                      </div>
                      <div className="flex items-center gap-1.5 px-2 py-1 rounded-md text-neutral-400 hover:text-white">
                        <Bed className="w-3 h-3 text-neutral-400 shrink-0" />
                        <span className="truncate">Rooms & Suites</span>
                      </div>
                      <div className="flex items-center gap-1.5 px-2 py-1 rounded-md text-neutral-400 hover:text-white">
                        <Users className="w-3 h-3 text-neutral-400 shrink-0" />
                        <span className="truncate">Guest Folios</span>
                      </div>
                      <div className="flex items-center gap-1.5 px-2 py-1 rounded-md text-neutral-400 hover:text-white hidden sm:flex">
                        <CreditCard className="w-3 h-3 text-neutral-400 shrink-0" />
                        <span className="truncate">Billing & POS</span>
                      </div>
                      <div className="flex items-center gap-1.5 px-2 py-1 rounded-md text-neutral-400 hover:text-white hidden sm:flex">
                        <ShieldCheck className="w-3 h-3 text-neutral-400 shrink-0" />
                        <span className="truncate">Subscription</span>
                      </div>
                      <div className="flex items-center gap-1.5 px-2 py-1 rounded-md text-neutral-400 hover:text-white hidden sm:flex">
                        <Sparkles className="w-3 h-3 text-neutral-400 shrink-0" />
                        <span className="truncate">Housekeeping</span>
                      </div>
                      <div className="flex items-center gap-1.5 px-2 py-1 rounded-md text-neutral-400 hover:text-white hidden sm:flex">
                        <BarChart3 className="w-3 h-3 text-neutral-400 shrink-0" />
                        <span className="truncate">Reports</span>
                      </div>
                      <div className="flex items-center gap-1.5 px-2 py-1 rounded-md text-neutral-400 hover:text-white hidden sm:flex">
                        <Settings className="w-3 h-3 text-neutral-400 shrink-0" />
                        <span className="truncate">Settings</span>
                      </div>
                    </nav>
                  </div>

                  {/* Staff Profile Bar (Bottom of Sidebar) */}
                  <div className="pt-2 border-t border-[#1f2636] flex items-center gap-1.5">
                    <div className="w-5 h-5 rounded-full bg-neutral-800 text-white flex items-center justify-center font-bold text-[7.5px] shrink-0 border border-neutral-700">
                      OC
                    </div>
                    <div className="truncate leading-tight">
                      <div className="font-bold text-white text-[7.5px] sm:text-[8.5px] truncate">
                        Obi Chidi
                      </div>
                      <div className="text-[6px] sm:text-[7px] text-[#10b981] font-semibold uppercase tracking-wider">
                        Hotel Owner
                      </div>
                    </div>
                  </div>
                </div>

                {/* MAIN DASHBOARD CONTENT AREA (StaffPortal Body) */}
                <div className="flex-1 bg-[#f8fafc] flex flex-col p-2 sm:p-2.5 space-y-2 overflow-hidden">
                  
                  {/* Top Floating Navbar Capsule of Hotel Dashboard */}
                  <div className="flex items-center justify-between bg-white border border-neutral-200/90 rounded-full px-3 py-1.5 shadow-3xs">
                    <div className="flex items-center gap-2 truncate">
                      <div className="flex items-center gap-1.5">
                        <span className="font-black text-[9.5px] sm:text-[11px] text-neutral-900 tracking-tight">
                          Lava Hotel & Suites
                        </span>
                        <span className="text-[6.5px] sm:text-[7.5px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200 px-1.5 py-0.2 rounded-full">
                          ● Live
                        </span>
                        <span className="hidden sm:inline-block text-neutral-300">/</span>
                        <span className="hidden sm:inline-block text-[8px] font-bold text-neutral-700 bg-neutral-100 px-2 py-0.5 rounded-full">
                          Overview
                        </span>
                      </div>
                    </div>

                    <div className="flex items-center gap-1.5 shrink-0">
                      <span className="hidden sm:inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-800 text-[7px] font-bold border border-emerald-200">
                        <ShieldCheck className="w-2.5 h-2.5 text-emerald-600" />
                        Role: Hotel Owner
                      </span>
                      <span className="flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-white border border-neutral-200 text-neutral-700 text-[7px] font-bold shadow-3xs">
                        <ExternalLink className="w-2.5 h-2.5 text-neutral-500" />
                        <span>Guest Site</span>
                      </span>
                    </div>
                  </div>

                  {/* Dashboard Title & Quick Action Bar */}
                  <div className="flex items-center justify-between">
                    <div>
                      <h1 className="font-black text-[11px] sm:text-[13px] text-neutral-900 tracking-tight leading-tight">
                        Dashboard
                      </h1>
                      <p className="text-[7px] sm:text-[8px] text-neutral-500">
                        Live overview of hotel operations
                      </p>
                    </div>

                    <div className="flex items-center gap-1">
                      <div className="px-2 py-0.5 rounded-md bg-white border border-neutral-200 text-[7px] font-semibold text-neutral-700 shadow-3xs flex items-center gap-1">
                        <Clock className="w-2.5 h-2.5 text-neutral-400" />
                        <span>Today</span>
                      </div>
                      <div className="px-2 py-0.5 rounded-md bg-black text-white text-[7px] font-bold shadow-3xs">
                        + Walk-in Guest
                      </div>
                    </div>
                  </div>

                  {/* 8 KPI METRIC CARDS GRID (Exact match to StaffPortal's 8 metrics) */}
                  <div className="grid grid-cols-4 gap-1 sm:gap-1.5">
                    {/* Card 1: PENDING VERIFICATION */}
                    <div className="bg-white border border-neutral-200 rounded-lg p-1.5 shadow-3xs space-y-0.5">
                      <div className="flex items-center justify-between">
                        <span className="text-[6.5px] sm:text-[7.5px] font-bold text-neutral-500 uppercase tracking-wider truncate">
                          PENDING VERIFY
                        </span>
                        <div className="p-0.5 rounded bg-amber-50">
                          <AlertTriangle className="w-2.5 h-2.5 text-amber-500" />
                        </div>
                      </div>
                      <div className="text-[11px] sm:text-[13px] font-black text-neutral-900 leading-none">
                        2
                      </div>
                      <div className="text-[6px] sm:text-[7px] text-amber-600 font-semibold truncate">
                        Action needed
                      </div>
                    </div>

                    {/* Card 2: PENDING PAYMENT */}
                    <div className="bg-white border border-neutral-200 rounded-lg p-1.5 shadow-3xs space-y-0.5">
                      <div className="flex items-center justify-between">
                        <span className="text-[6.5px] sm:text-[7.5px] font-bold text-neutral-500 uppercase tracking-wider truncate">
                          PENDING PAY
                        </span>
                        <div className="p-0.5 rounded bg-orange-50">
                          <Clock className="w-2.5 h-2.5 text-orange-500" />
                        </div>
                      </div>
                      <div className="text-[11px] sm:text-[13px] font-black text-neutral-900 leading-none">
                        1
                      </div>
                      <div className="text-[6px] sm:text-[7px] text-orange-600 font-semibold truncate">
                        Awaiting transfer
                      </div>
                    </div>

                    {/* Card 3: CONFIRMED BOOKINGS */}
                    <div className="bg-white border border-neutral-200 rounded-lg p-1.5 shadow-3xs space-y-0.5">
                      <div className="flex items-center justify-between">
                        <span className="text-[6.5px] sm:text-[7.5px] font-bold text-neutral-500 uppercase tracking-wider truncate">
                          CONFIRMED
                        </span>
                        <div className="p-0.5 rounded bg-emerald-50">
                          <CheckCircle2 className="w-2.5 h-2.5 text-emerald-500" />
                        </div>
                      </div>
                      <div className="text-[11px] sm:text-[13px] font-black text-neutral-900 leading-none">
                        14
                      </div>
                      <div className="text-[6px] sm:text-[7px] text-emerald-600 font-semibold truncate">
                        Verified stays
                      </div>
                    </div>

                    {/* Card 4: TODAY'S CHECK-INS */}
                    <div className="bg-white border border-neutral-200 rounded-lg p-1.5 shadow-3xs space-y-0.5">
                      <div className="flex items-center justify-between">
                        <span className="text-[6.5px] sm:text-[7.5px] font-bold text-neutral-500 uppercase tracking-wider truncate">
                          CHECK-INS
                        </span>
                        <div className="p-0.5 rounded bg-blue-50">
                          <DoorOpen className="w-2.5 h-2.5 text-blue-500" />
                        </div>
                      </div>
                      <div className="text-[11px] sm:text-[13px] font-black text-neutral-900 leading-none">
                        6
                      </div>
                      <div className="text-[6px] sm:text-[7px] text-blue-600 font-semibold truncate">
                        In-house guests
                      </div>
                    </div>

                    {/* Card 5: TODAY'S CHECK-OUTS */}
                    <div className="bg-white border border-neutral-200 rounded-lg p-1.5 shadow-3xs space-y-0.5">
                      <div className="flex items-center justify-between">
                        <span className="text-[6.5px] sm:text-[7.5px] font-bold text-neutral-500 uppercase tracking-wider truncate">
                          CHECK-OUTS
                        </span>
                        <div className="p-0.5 rounded bg-neutral-100">
                          <DoorClosed className="w-2.5 h-2.5 text-neutral-500" />
                        </div>
                      </div>
                      <div className="text-[11px] sm:text-[13px] font-black text-neutral-900 leading-none">
                        4
                      </div>
                      <div className="text-[6px] sm:text-[7px] text-neutral-500 font-semibold truncate">
                        Completed stays
                      </div>
                    </div>

                    {/* Card 6: AVAILABLE ROOMS */}
                    <div className="bg-white border border-neutral-200 rounded-lg p-1.5 shadow-3xs space-y-0.5">
                      <div className="flex items-center justify-between">
                        <span className="text-[6.5px] sm:text-[7.5px] font-bold text-neutral-500 uppercase tracking-wider truncate">
                          AVAILABLE
                        </span>
                        <div className="p-0.5 rounded bg-neutral-100">
                          <Bed className="w-2.5 h-2.5 text-neutral-600" />
                        </div>
                      </div>
                      <div className="text-[11px] sm:text-[13px] font-black text-neutral-900 leading-none">
                        2 <span className="text-[7px] font-normal text-neutral-400">/ 6</span>
                      </div>
                      <div className="text-[6px] sm:text-[7px] text-neutral-500 font-semibold truncate">
                        Ready for guests
                      </div>
                    </div>

                    {/* Card 7: OCCUPIED ROOMS */}
                    <div className="bg-white border border-neutral-200 rounded-lg p-1.5 shadow-3xs space-y-0.5">
                      <div className="flex items-center justify-between">
                        <span className="text-[6.5px] sm:text-[7.5px] font-bold text-neutral-500 uppercase tracking-wider truncate">
                          OCCUPIED
                        </span>
                        <div className="p-0.5 rounded bg-blue-50">
                          <CalendarCheck className="w-2.5 h-2.5 text-blue-600" />
                        </div>
                      </div>
                      <div className="text-[11px] sm:text-[13px] font-black text-neutral-900 leading-none">
                        2
                      </div>
                      <div className="text-[6px] sm:text-[7px] text-blue-600 font-semibold truncate">
                        33% Occupancy
                      </div>
                    </div>

                    {/* Card 8: RECORDED REVENUE */}
                    <div className="bg-white border border-neutral-200 rounded-lg p-1.5 shadow-3xs space-y-0.5">
                      <div className="flex items-center justify-between">
                        <span className="text-[6.5px] sm:text-[7.5px] font-bold text-neutral-500 uppercase tracking-wider truncate">
                          REVENUE
                        </span>
                        <div className="p-0.5 rounded bg-emerald-50">
                          <CreditCard className="w-2.5 h-2.5 text-emerald-600" />
                        </div>
                      </div>
                      <div className="text-[10px] sm:text-[12px] font-mono font-black text-neutral-900 leading-none truncate">
                        ₦1,500,000
                      </div>
                      <div className="text-[6px] sm:text-[7px] text-emerald-600 font-semibold truncate">
                        Financials verified
                      </div>
                    </div>
                  </div>

                  {/* ROOM STATUS GRID (Exact match to StaffPortal Room Grid) */}
                  <div className="bg-white border border-neutral-200 rounded-xl p-1.5 sm:p-2 shadow-3xs space-y-1.5">
                    <div className="flex items-center justify-between border-b border-neutral-100 pb-1">
                      <div className="flex items-center gap-1.5">
                        <span className="font-extrabold text-[8px] sm:text-[9.5px] text-neutral-900">
                          Room Status Grid
                        </span>
                        <span className="text-[6.5px] sm:text-[7.5px] text-neutral-400">
                          6 boutique rooms
                        </span>
                      </div>
                      <div className="flex items-center gap-1 text-[6px] sm:text-[7px] font-bold">
                        <span className="px-1.5 py-0.2 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200">
                          Available (2)
                        </span>
                        <span className="px-1.5 py-0.2 rounded-full bg-blue-50 text-blue-700 border border-blue-200">
                          Occupied (2)
                        </span>
                        <span className="px-1.5 py-0.2 rounded-full bg-purple-50 text-purple-700 border border-purple-200">
                          Reserved (1)
                        </span>
                        <span className="px-1.5 py-0.2 rounded-full bg-amber-50 text-amber-700 border border-amber-200">
                          Cleaning (1)
                        </span>
                      </div>
                    </div>

                    {/* Room Grid Tiles: Exactly 6 rooms */}
                    <div className="grid grid-cols-3 sm:grid-cols-6 gap-1">
                      <div className="p-1 rounded-md bg-blue-50 border border-blue-200 text-center">
                        <span className="font-mono font-bold text-[8px] sm:text-[9px] text-blue-900 block leading-tight">101</span>
                        <span className="text-[5.5px] sm:text-[6.5px] text-blue-700 font-semibold block truncate">Occupied</span>
                      </div>
                      <div className="p-1 rounded-md bg-emerald-50 border border-emerald-200 text-center">
                        <span className="font-mono font-bold text-[8px] sm:text-[9px] text-emerald-900 block leading-tight">102</span>
                        <span className="text-[5.5px] sm:text-[6.5px] text-emerald-700 font-semibold block truncate">Available</span>
                      </div>
                      <div className="p-1 rounded-md bg-purple-50 border border-purple-200 text-center">
                        <span className="font-mono font-bold text-[8px] sm:text-[9px] text-purple-900 block leading-tight">103</span>
                        <span className="text-[5.5px] sm:text-[6.5px] text-purple-700 font-semibold block truncate">Reserved</span>
                      </div>
                      <div className="p-1 rounded-md bg-emerald-50 border border-emerald-200 text-center">
                        <span className="font-mono font-bold text-[8px] sm:text-[9px] text-emerald-900 block leading-tight">104</span>
                        <span className="text-[5.5px] sm:text-[6.5px] text-emerald-700 font-semibold block truncate">Available</span>
                      </div>
                      <div className="p-1 rounded-md bg-blue-50 border border-blue-200 text-center">
                        <span className="font-mono font-bold text-[8px] sm:text-[9px] text-blue-900 block leading-tight">201</span>
                        <span className="text-[5.5px] sm:text-[6.5px] text-blue-700 font-semibold block truncate">Occupied</span>
                      </div>
                      <div className="p-1 rounded-md bg-amber-50 border border-amber-200 text-center">
                        <span className="font-mono font-bold text-[8px] sm:text-[9px] text-amber-900 block leading-tight">202</span>
                        <span className="text-[5.5px] sm:text-[6.5px] text-amber-700 font-semibold block truncate">Cleaning</span>
                      </div>
                    </div>
                  </div>

                  {/* RECENT RESERVATIONS TABLE (StaffPortal Reservations View) */}
                  <div className="bg-white border border-neutral-200 rounded-xl p-1.5 sm:p-2 shadow-3xs flex-1 flex flex-col justify-between overflow-hidden">
                    <div className="flex items-center justify-between border-b border-neutral-100 pb-1">
                      <span className="font-extrabold text-[8px] sm:text-[9.5px] text-neutral-900">
                        Recent Reservations & Folios
                      </span>
                      <span className="text-[6.5px] sm:text-[7.5px] text-neutral-400">
                        Auto-synchronized
                      </span>
                    </div>

                    <div className="w-full overflow-hidden">
                      <table className="w-full text-left text-[6.5px] sm:text-[8px]">
                        <thead>
                          <tr className="text-neutral-400 border-b border-neutral-100 font-medium">
                            <th className="pb-1 font-semibold">REF</th>
                            <th className="pb-1 font-semibold">GUEST</th>
                            <th className="pb-1 font-semibold">ROOM</th>
                            <th className="pb-1 font-semibold">DATES</th>
                            <th className="pb-1 font-semibold text-right">TOTAL</th>
                            <th className="pb-1 font-semibold text-right">STATUS</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-neutral-50 text-neutral-700">
                          <tr>
                            <td className="py-0.5 font-mono font-bold text-neutral-900">BK-819204</td>
                            <td className="py-0.5 font-semibold text-neutral-900">Chidi Nwosu</td>
                            <td className="py-0.5">Rm 101 (Executive)</td>
                            <td className="py-0.5 text-neutral-500">Oct 18 - 22</td>
                            <td className="py-0.5 font-mono font-bold text-neutral-900 text-right">₦85,000</td>
                            <td className="py-0.5 text-right">
                              <span className="px-1.5 py-0.2 rounded-full bg-blue-50 text-blue-700 font-bold border border-blue-200 text-[5.5px] sm:text-[6.5px]">
                                Checked In
                              </span>
                            </td>
                          </tr>
                          <tr>
                            <td className="py-0.5 font-mono font-bold text-neutral-900">BK-948102</td>
                            <td className="py-0.5 font-semibold text-neutral-900">Folake Adeyemi</td>
                            <td className="py-0.5">Rm 202 (Deluxe)</td>
                            <td className="py-0.5 text-neutral-500">Oct 19 - 21</td>
                            <td className="py-0.5 font-mono font-bold text-neutral-900 text-right">₦55,000</td>
                            <td className="py-0.5 text-right">
                              <span className="px-1.5 py-0.2 rounded-full bg-emerald-50 text-emerald-700 font-bold border border-emerald-200 text-[5.5px] sm:text-[6.5px]">
                                Confirmed
                              </span>
                            </td>
                          </tr>
                          <tr>
                            <td className="py-0.5 font-mono font-bold text-neutral-900">BK-610293</td>
                            <td className="py-0.5 font-semibold text-neutral-900">Emeka Okonkwo</td>
                            <td className="py-0.5">Rm 201 (Presidential)</td>
                            <td className="py-0.5 text-neutral-500">Oct 18 - 25</td>
                            <td className="py-0.5 font-mono font-bold text-neutral-900 text-right">₦150,000</td>
                            <td className="py-0.5 text-right">
                              <span className="px-1.5 py-0.2 rounded-full bg-blue-50 text-blue-700 font-bold border border-blue-200 text-[5.5px] sm:text-[6.5px]">
                                Checked In
                              </span>
                            </td>
                          </tr>
                          <tr>
                            <td className="py-0.5 font-mono font-bold text-neutral-900">BK-774910</td>
                            <td className="py-0.5 font-semibold text-neutral-900">Aisha Bello</td>
                            <td className="py-0.5">Rm 103 (Executive)</td>
                            <td className="py-0.5 text-neutral-500">Oct 20 - 23</td>
                            <td className="py-0.5 font-mono font-bold text-neutral-900 text-right">₦65,000</td>
                            <td className="py-0.5 text-right">
                              <span className="px-1.5 py-0.2 rounded-full bg-amber-50 text-amber-700 font-bold border border-amber-200 text-[5.5px] sm:text-[6.5px]">
                                Pending Verify
                              </span>
                            </td>
                          </tr>
                        </tbody>
                      </table>
                    </div>
                  </div>

                </div>
              </div>

            </div>

            {/* Authentic MacBook Pro Lower Bezel Engraving */}
            <div className="absolute bottom-[3px] sm:bottom-[4px] left-1/2 -translate-x-1/2">
              <span className="text-[7px] sm:text-[8px] font-sans font-semibold text-[#8b8f9a] tracking-[0.18em] uppercase select-none opacity-85">
                MacBook Pro
              </span>
            </div>

          </div>
        </div>

        {/* ============================================================== */}
        {/* 2. MACBOOK PRO 3D ALUMINUM LOWER CHASSIS & HINGE               */}
        {/* ============================================================== */}
        <div className="relative w-[103%] -mt-[2px] z-10">
          {/* Dark Hinge Pivot Recess */}
          <div className="h-[2.5px] sm:h-[3.5px] bg-[#0c0d11] border-b border-[#1e2027] mx-auto w-[92%] rounded-t-sm" />

          {/* Aluminum Lower Chassis Front Lip */}
          <div className="relative h-[8px] sm:h-[11px] rounded-b-[14px] sm:rounded-b-[18px] bg-gradient-to-b from-[#3d414a] via-[#272a32] to-[#16181d] shadow-[0_10px_20px_rgba(0,0,0,0.6)] border-t border-[#4e535f] flex items-start justify-center overflow-hidden">
            {/* Fine Metallic Chamfer Top Edge Highlight */}
            <div className="absolute inset-x-0 top-0 h-[1px] bg-gradient-to-r from-transparent via-white/40 to-transparent" />

            {/* Iconic MacBook Center Thumb Notch (Lid Opening Scoop) */}
            <div className="w-14 sm:w-20 h-1 sm:h-1.5 bg-[#0d0e12] rounded-b-md shadow-inner border-x border-b border-neutral-700/60" />
          </div>

          {/* Authentic Dual-Layer Ground Contact Shadow */}
          <div className="w-[96%] h-2 bg-black/80 blur-xs mx-auto -mt-1 rounded-full" />
          <div className="w-[86%] h-6 bg-black/60 blur-md mx-auto -mt-2 rounded-full" />
        </div>

        {/* Bottom Product Label */}
        <div className="text-center mt-2.5 sm:mt-3">
          <p className="text-xs sm:text-sm font-semibold text-neutral-500 tracking-tight">
            IGHO Stay — Cloud Hotel Management Software
          </p>
        </div>

      </div>
    </div>
  );
};
