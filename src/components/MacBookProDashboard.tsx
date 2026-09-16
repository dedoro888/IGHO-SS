import React, { useState, useRef } from 'react';
import {
  Calendar,
  ChevronDown,
  Plus,
  Bed,
  Key,
  Users,
  DollarSign,
  MoreVertical,
  ArrowUpRight,
  TrendingUp,
  Building2,
  CheckCircle2,
  Clock,
  Layers,
  Settings,
  FileText,
  Sparkles,
  PieChart,
} from 'lucide-react';
import { ActiveScreen } from '../types';

interface MacBookProDashboardProps {
  onNavigate: (screen: ActiveScreen) => void;
}

export const MacBookProDashboard: React.FC<MacBookProDashboardProps> = ({ onNavigate }) => {
  const [mousePos, setMousePos] = useState({ x: 0, y: 0 });
  const [isHovered, setIsHovered] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  // Subtle interactive 3D perspective tilt on mouse move
  const handleMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!containerRef.current) return;
    const rect = containerRef.current.getBoundingClientRect();
    const x = (e.clientX - rect.left) / rect.width - 0.5;
    const y = (e.clientY - rect.top) / rect.height - 0.5;
    setMousePos({ x, y });
  };

  const handleMouseEnter = () => setIsHovered(true);
  const handleMouseLeave = () => {
    setIsHovered(false);
    setMousePos({ x: 0, y: 0 });
  };

  // 3D rotation angles
  const rotateX = isHovered ? -mousePos.y * 12 : 0;
  const rotateY = isHovered ? mousePos.x * 14 : 0;

  return (
    <div className="w-full flex flex-col items-center select-none py-2">
      {/* OUTER DARK CARD CONTAINER */}
      <div
        ref={containerRef}
        onMouseMove={handleMouseMove}
        onMouseEnter={handleMouseEnter}
        onMouseLeave={handleMouseLeave}
        className="w-full max-w-[720px] xl:max-w-[820px] 2xl:max-w-[920px] bg-[#0c0d10] border border-[#1d1f27] rounded-[28px] sm:rounded-[36px] p-4 sm:p-7 shadow-2xl relative transition-all duration-300 overflow-hidden"
        style={{ perspective: '1400px' }}
      >
        {/* Ambient Top Glow */}
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-3/4 h-24 bg-white/[0.03] blur-3xl pointer-events-none rounded-full"></div>

        {/* 3D MACBOOK PRO CHASSIS */}
        <div
          className="w-full px-2 sm:px-6 2xl:px-8 py-2 relative flex flex-col items-center transition-transform duration-200 ease-out"
          style={{
            transform: `rotateX(${rotateX}deg) rotateY(${rotateY}deg)`,
            transformStyle: 'preserve-3d',
          }}
        >
          {/* ==================== MACBOOK PRO DISPLAY LID ==================== */}
          <div className="w-full relative rounded-[18px] sm:rounded-[22px] bg-gradient-to-b from-[#b8bac2] via-[#8c909b] to-[#6d717b] p-[2px] shadow-[0_25px_50px_-12px_rgba(0,0,0,0.8)]">
            {/* Display Glass Bezel */}
            <div className="relative rounded-[16px] sm:rounded-[20px] bg-[#070709] p-[7px] sm:p-[9px] pb-[16px] sm:pb-[20px]">
              
              {/* FaceTime HD Camera (Top Bezel Center) */}
              <div className="absolute top-[4px] sm:top-[5px] left-1/2 -translate-x-1/2 flex items-center gap-1.5">
                <div className="w-1.5 h-1.5 rounded-full bg-[#111317] border border-[#262830] flex items-center justify-center">
                  <div className="w-0.5 h-0.5 rounded-full bg-[#10b981] opacity-80"></div>
                </div>
              </div>

              {/* SCREEN DISPLAY CONTAINER */}
              <div className="relative w-full aspect-[16/10] bg-[#f8f9fa] rounded-[6px] sm:rounded-[8px] overflow-hidden shadow-inner flex text-neutral-800 text-[9px] sm:text-[11px] font-sans">
                
                {/* -------------------- IGHO STAY (Hotel Management Platform) -------------------- */}
                <div className="w-full h-full flex flex-row">
                    
                    {/* LEFT SIDEBAR (Dark Charcoal) */}
                    <div className="w-[26%] sm:w-[24%] bg-[#181b22] text-[#c7ccd8] flex flex-col justify-between p-2 sm:p-3 border-r border-[#262a35] shrink-0">
                      <div className="space-y-2 sm:space-y-3">
                        {/* Hotel Brand Header */}
                        <div className="flex items-center gap-1.5 pb-2 border-b border-[#262a35]">
                          <div className="w-4 h-4 sm:w-5 sm:h-5 rounded bg-white text-black font-black flex items-center justify-center text-[8px] sm:text-[10px] shrink-0">
                            ♔
                          </div>
                          <div className="leading-tight">
                            <span className="font-extrabold text-[8px] sm:text-[10.5px] text-white tracking-tight uppercase block truncate">
                              Royal Inn Hotel
                            </span>
                            <span className="text-[6.5px] sm:text-[8px] text-neutral-400 block -mt-0.5">
                              IGHO Stay PMS
                            </span>
                          </div>
                        </div>

                        {/* Navigation Links */}
                        <nav className="space-y-0.5 sm:space-y-1 text-[7.5px] sm:text-[9.5px]">
                          <div className="flex items-center gap-1.5 px-1.5 py-1 rounded bg-neutral-800 text-white font-semibold shadow-xs">
                            <Layers className="w-2.5 h-2.5 sm:w-3 sm:h-3 text-neutral-300" />
                            <span>Dashboard</span>
                          </div>
                          <div className="flex items-center gap-1.5 px-1.5 py-1 rounded hover:text-white text-neutral-400 transition-colors">
                            <Calendar className="w-2.5 h-2.5 sm:w-3 sm:h-3" />
                            <span>Reservations</span>
                          </div>
                          <div className="flex items-center gap-1.5 px-1.5 py-1 rounded hover:text-white text-neutral-400 transition-colors">
                            <Clock className="w-2.5 h-2.5 sm:w-3 sm:h-3" />
                            <span>Calendar</span>
                          </div>
                          <div className="flex items-center gap-1.5 px-1.5 py-1 rounded hover:text-white text-neutral-400 transition-colors">
                            <Users className="w-2.5 h-2.5 sm:w-3 sm:h-3" />
                            <span>Guests</span>
                          </div>
                          <div className="flex items-center gap-1.5 px-1.5 py-1 rounded hover:text-white text-neutral-400 transition-colors">
                            <Bed className="w-2.5 h-2.5 sm:w-3 sm:h-3" />
                            <span>Rooms</span>
                          </div>
                          <div className="flex items-center gap-1.5 px-1.5 py-1 rounded hover:text-white text-neutral-400 transition-colors hidden sm:flex">
                            <DollarSign className="w-2.5 h-2.5 sm:w-3 sm:h-3" />
                            <span>Rates & Plans</span>
                          </div>
                          <div className="flex items-center gap-1.5 px-1.5 py-1 rounded hover:text-white text-neutral-400 transition-colors">
                            <Sparkles className="w-2.5 h-2.5 sm:w-3 sm:h-3" />
                            <span>Housekeeping</span>
                          </div>
                          <div className="flex items-center gap-1.5 px-1.5 py-1 rounded hover:text-white text-neutral-400 transition-colors hidden sm:flex">
                            <FileText className="w-2.5 h-2.5 sm:w-3 sm:h-3" />
                            <span>Reports</span>
                          </div>
                          <div className="flex items-center gap-1.5 px-1.5 py-1 rounded hover:text-white text-neutral-400 transition-colors hidden sm:flex">
                            <Settings className="w-2.5 h-2.5 sm:w-3 sm:h-3" />
                            <span>Settings</span>
                          </div>
                        </nav>
                      </div>

                      {/* User Profile Widget (Bottom of sidebar) */}
                      <div className="pt-2 border-t border-[#262a35] flex items-center gap-1.5">
                        <div className="w-4 h-4 sm:w-6 sm:h-6 rounded-full bg-neutral-700 text-white flex items-center justify-center font-bold text-[7px] sm:text-[9px] shrink-0 border border-neutral-600">
                          JS
                        </div>
                        <div className="truncate leading-tight">
                          <div className="font-bold text-white text-[7px] sm:text-[9px] truncate">
                            John Smith
                          </div>
                          <div className="text-[6px] sm:text-[7.5px] text-neutral-400 truncate">
                            Hotel Manager
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* MAIN CONTENT DASHBOARD BODY */}
                    <div className="flex-1 bg-[#f8f9fa] flex flex-col p-2 sm:p-3 space-y-2 overflow-y-auto scrollbar-none">
                      
                      {/* Top Bar: Title, Date Filter, New Booking Button */}
                      <div className="flex items-center justify-between">
                        <h2 className="font-bold text-[10px] sm:text-[13px] text-neutral-900 tracking-tight">
                          Dashboard
                        </h2>

                        <div className="flex items-center gap-1 sm:gap-1.5">
                          {/* Date Range Selector */}
                          <div className="flex items-center gap-1 bg-white border border-neutral-200 px-1.5 py-0.5 sm:py-1 rounded text-[7px] sm:text-[8.5px] text-neutral-700 shadow-2xs font-medium">
                            <Calendar className="w-2.5 h-2.5 text-neutral-400" />
                            <span>May 12 - May 18, 2024</span>
                            <ChevronDown className="w-2.5 h-2.5 text-neutral-400" />
                          </div>

                          {/* New Booking Button */}
                          <button
                            onClick={() => onNavigate('hotel_directory')}
                            className="flex items-center gap-0.5 sm:gap-1 bg-black text-white px-2 py-0.5 sm:py-1 rounded text-[7px] sm:text-[8.5px] font-semibold hover:bg-neutral-800 transition-colors shadow-2xs cursor-pointer"
                          >
                            <Plus className="w-2.5 h-2.5" />
                            <span>New Booking</span>
                          </button>
                        </div>
                      </div>

                      {/* 4 KPI METRIC CARDS ROW */}
                      <div className="grid grid-cols-4 gap-1.5 sm:gap-2">
                        {/* Metric 1: Occupancy Rate */}
                        <div className="bg-white border border-neutral-200/80 rounded-lg p-1.5 sm:p-2 shadow-2xs flex items-center justify-between">
                          <div className="space-y-0.5">
                            <span className="text-[6.5px] sm:text-[8px] text-neutral-500 font-medium block">
                              Occupancy Rate
                            </span>
                            <div className="flex items-baseline gap-1">
                              <span className="text-[10px] sm:text-[13px] font-black text-neutral-900 leading-none">
                                78%
                              </span>
                              <span className="text-[6px] sm:text-[7.5px] font-bold text-emerald-600 flex items-center">
                                ↑ 12%
                              </span>
                            </div>
                            <span className="text-[5.5px] sm:text-[6.5px] text-neutral-400 block leading-tight truncate">
                              vs May 5 - May 11
                            </span>
                          </div>
                          {/* Circular Ring Gauge */}
                          <div className="w-5 h-5 sm:w-7 sm:h-7 shrink-0 relative flex items-center justify-center">
                            <svg className="w-full h-full -rotate-90" viewBox="0 0 36 36">
                              <path
                                className="text-neutral-200"
                                strokeWidth="3.5"
                                stroke="currentColor"
                                fill="none"
                                d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
                              />
                              <path
                                className="text-black"
                                strokeDasharray="78, 100"
                                strokeWidth="3.5"
                                strokeLinecap="round"
                                stroke="currentColor"
                                fill="none"
                                d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
                              />
                            </svg>
                          </div>
                        </div>

                        {/* Metric 2: Rooms Occupied */}
                        <div className="bg-white border border-neutral-200/80 rounded-lg p-1.5 sm:p-2 shadow-2xs flex items-center justify-between">
                          <div className="space-y-0.5">
                            <span className="text-[6.5px] sm:text-[8px] text-neutral-500 font-medium block">
                              Rooms Occupied
                            </span>
                            <div className="flex items-baseline gap-1">
                              <span className="text-[10px] sm:text-[13px] font-black text-neutral-900 leading-none">
                                156
                              </span>
                              <span className="text-[6px] sm:text-[7.5px] font-bold text-emerald-600">
                                ↑ 18
                              </span>
                            </div>
                            <span className="text-[5.5px] sm:text-[6.5px] text-neutral-400 block leading-tight truncate">
                              vs May 5 - May 11
                            </span>
                          </div>
                          <div className="w-5 h-5 sm:w-6 sm:h-6 rounded-full bg-neutral-100 flex items-center justify-center text-neutral-700 shrink-0">
                            <Bed className="w-2.5 h-2.5 sm:w-3 sm:h-3" />
                          </div>
                        </div>

                        {/* Metric 3: Rooms Available */}
                        <div className="bg-white border border-neutral-200/80 rounded-lg p-1.5 sm:p-2 shadow-2xs flex items-center justify-between">
                          <div className="space-y-0.5">
                            <span className="text-[6.5px] sm:text-[8px] text-neutral-500 font-medium block">
                              Rooms Available
                            </span>
                            <div className="flex items-baseline gap-1">
                              <span className="text-[10px] sm:text-[13px] font-black text-neutral-900 leading-none">
                                44
                              </span>
                              <span className="text-[6px] sm:text-[7.5px] font-bold text-rose-600">
                                ↓ 6
                              </span>
                            </div>
                            <span className="text-[5.5px] sm:text-[6.5px] text-neutral-400 block leading-tight truncate">
                              vs May 5 - May 11
                            </span>
                          </div>
                          <div className="w-5 h-5 sm:w-6 sm:h-6 rounded-full bg-neutral-100 flex items-center justify-center text-neutral-700 shrink-0">
                            <Key className="w-2.5 h-2.5 sm:w-3 sm:h-3" />
                          </div>
                        </div>

                        {/* Metric 4: RevPAR */}
                        <div className="bg-white border border-neutral-200/80 rounded-lg p-1.5 sm:p-2 shadow-2xs flex items-center justify-between">
                          <div className="space-y-0.5">
                            <span className="text-[6.5px] sm:text-[8px] text-neutral-500 font-medium block">
                              RevPAR
                            </span>
                            <div className="flex items-baseline gap-1">
                              <span className="text-[10px] sm:text-[13px] font-black text-neutral-900 leading-none">
                                $98.50
                              </span>
                              <span className="text-[6px] sm:text-[7.5px] font-bold text-emerald-600">
                                ↑ 8%
                              </span>
                            </div>
                            <span className="text-[5.5px] sm:text-[6.5px] text-neutral-400 block leading-tight truncate">
                              vs May 5 - May 11
                            </span>
                          </div>
                          <div className="w-5 h-5 sm:w-6 sm:h-6 rounded-full bg-neutral-100 flex items-center justify-center text-neutral-700 shrink-0">
                            <DollarSign className="w-2.5 h-2.5 sm:w-3 sm:h-3" />
                          </div>
                        </div>
                      </div>

                      {/* CHARTS ROW: Occupancy Overview (Line) & Bookings (Bar) */}
                      <div className="grid grid-cols-2 gap-1.5 sm:gap-2">
                        {/* Occupancy Overview Line Chart */}
                        <div className="bg-white border border-neutral-200/80 rounded-lg p-2 shadow-2xs space-y-1">
                          <div className="flex items-center justify-between">
                            <span className="font-bold text-[8px] sm:text-[9.5px] text-neutral-900">
                              Occupancy Overview
                            </span>
                            <div className="flex items-center gap-1.5 text-[6px] sm:text-[7px] text-neutral-500">
                              <span className="flex items-center gap-0.5">
                                <span className="w-2 h-0.5 bg-black inline-block"></span> This Week
                              </span>
                              <span className="flex items-center gap-0.5">
                                <span className="w-2 h-0.5 border-b border-dashed border-neutral-400 inline-block"></span> Last Week
                              </span>
                            </div>
                          </div>

                          {/* SVG Line Chart */}
                          <div className="h-14 sm:h-20 w-full relative pt-1">
                            <svg className="w-full h-full" viewBox="0 0 280 80" preserveAspectRatio="none">
                              {/* Grid lines */}
                              <line x1="25" y1="10" x2="275" y2="10" stroke="#f1f3f5" strokeWidth="1" />
                              <line x1="25" y1="30" x2="275" y2="30" stroke="#f1f3f5" strokeWidth="1" />
                              <line x1="25" y1="50" x2="275" y2="50" stroke="#f1f3f5" strokeWidth="1" />
                              <line x1="25" y1="70" x2="275" y2="70" stroke="#f1f3f5" strokeWidth="1" />

                              {/* Y-axis labels */}
                              <text x="5" y="13" fontSize="6" fill="#9ca3af">100%</text>
                              <text x="5" y="33" fontSize="6" fill="#9ca3af">75%</text>
                              <text x="5" y="53" fontSize="6" fill="#9ca3af">50%</text>
                              <text x="5" y="73" fontSize="6" fill="#9ca3af">25%</text>

                              {/* Last Week Line (Dashed) */}
                              <polyline
                                fill="none"
                                stroke="#9ca3af"
                                strokeWidth="1.2"
                                strokeDasharray="3 3"
                                points="30,45 70,38 110,48 150,32 190,40 230,28 270,35"
                              />

                              {/* This Week Line (Solid Black) */}
                              <polyline
                                fill="none"
                                stroke="#111827"
                                strokeWidth="1.8"
                                points="30,35 70,30 110,25 150,32 190,18 230,22 270,16"
                              />

                              {/* Data Points on This Week Line */}
                              {[[30, 35], [70, 30], [110, 25], [150, 32], [190, 18], [230, 22], [270, 16]].map(([cx, cy], i) => (
                                <circle key={i} cx={cx} cy={cy} r="2" fill="#111827" stroke="#ffffff" strokeWidth="1" />
                              ))}
                            </svg>
                          </div>
                          {/* X-axis labels */}
                          <div className="flex justify-between pl-6 pr-2 text-[5.5px] sm:text-[6.5px] text-neutral-400">
                            <span>May 12</span>
                            <span>May 13</span>
                            <span>May 14</span>
                            <span>May 15</span>
                            <span>May 16</span>
                            <span>May 17</span>
                            <span>May 18</span>
                          </div>
                        </div>

                        {/* Bookings Bar Chart */}
                        <div className="bg-white border border-neutral-200/80 rounded-lg p-2 shadow-2xs space-y-1">
                          <div className="flex items-center justify-between">
                            <span className="font-bold text-[8px] sm:text-[9.5px] text-neutral-900">
                              Bookings
                            </span>
                            <div className="flex items-center gap-1.5 text-[6px] sm:text-[7px] text-neutral-500">
                              <span className="flex items-center gap-0.5">
                                <span className="w-1.5 h-1.5 bg-black rounded-xs inline-block"></span> New Bookings
                              </span>
                              <span className="flex items-center gap-0.5">
                                <span className="w-1.5 h-1.5 bg-neutral-300 rounded-xs inline-block"></span> Canceled
                              </span>
                            </div>
                          </div>

                          {/* SVG Bar Chart */}
                          <div className="h-14 sm:h-20 w-full relative pt-1">
                            <svg className="w-full h-full" viewBox="0 0 280 80" preserveAspectRatio="none">
                              {/* Grid lines */}
                              <line x1="20" y1="15" x2="275" y2="15" stroke="#f1f3f5" strokeWidth="1" />
                              <line x1="20" y1="35" x2="275" y2="35" stroke="#f1f3f5" strokeWidth="1" />
                              <line x1="20" y1="55" x2="275" y2="55" stroke="#f1f3f5" strokeWidth="1" />
                              <line x1="20" y1="75" x2="275" y2="75" stroke="#f1f3f5" strokeWidth="1" />

                              {/* Y-axis labels */}
                              <text x="5" y="18" fontSize="6" fill="#9ca3af">80</text>
                              <text x="5" y="38" fontSize="6" fill="#9ca3af">60</text>
                              <text x="5" y="58" fontSize="6" fill="#9ca3af">40</text>
                              <text x="5" y="78" fontSize="6" fill="#9ca3af">20</text>

                              {/* Paired Bars for 7 days */}
                              {[
                                { x: 30, h1: 45, h2: 12 },
                                { x: 65, h1: 52, h2: 15 },
                                { x: 100, h1: 38, h2: 10 },
                                { x: 135, h1: 65, h2: 18 },
                                { x: 170, h1: 48, h2: 14 },
                                { x: 205, h1: 58, h2: 12 },
                                { x: 240, h1: 72, h2: 8 },
                              ].map((b, i) => (
                                <g key={i}>
                                  <rect x={b.x} y={75 - b.h1} width="6" height={b.h1} fill="#111827" rx="1" />
                                  <rect x={b.x + 7} y={75 - b.h2} width="6" height={b.h2} fill="#d1d5db" rx="1" />
                                </g>
                              ))}
                            </svg>
                          </div>
                          {/* X-axis labels */}
                          <div className="flex justify-between pl-6 pr-2 text-[5.5px] sm:text-[6.5px] text-neutral-400">
                            <span>May 12</span>
                            <span>May 13</span>
                            <span>May 14</span>
                            <span>May 15</span>
                            <span>May 16</span>
                            <span>May 17</span>
                            <span>May 18</span>
                          </div>
                        </div>
                      </div>

                      {/* BOTTOM ROOM STATUS TABLE (Exact match to screenshot) */}
                      <div className="bg-white border border-neutral-200/80 rounded-lg p-2 shadow-2xs space-y-1">
                        <div className="flex items-center justify-between">
                          <span className="font-bold text-[8px] sm:text-[9.5px] text-neutral-900">
                            Room Status
                          </span>
                          <button
                            onClick={() => onNavigate('hotel_directory')}
                            className="text-[6.5px] sm:text-[7.5px] text-neutral-600 font-semibold hover:underline cursor-pointer"
                          >
                            View All Rooms
                          </button>
                        </div>

                        <div className="overflow-x-auto">
                          <table className="w-full text-left text-[6.5px] sm:text-[8px]">
                            <thead>
                              <tr className="text-neutral-400 border-b border-neutral-100 font-medium">
                                <th className="pb-1 font-medium">Room No.</th>
                                <th className="pb-1 font-medium">Room Type</th>
                                <th className="pb-1 font-medium hidden sm:table-cell">Floor</th>
                                <th className="pb-1 font-medium">Status</th>
                                <th className="pb-1 font-medium">Guest</th>
                                <th className="pb-1 font-medium hidden sm:table-cell">Check-in</th>
                                <th className="pb-1 font-medium hidden sm:table-cell">Check-out</th>
                                <th className="pb-1 font-medium">Rate</th>
                                <th className="pb-1 text-right"></th>
                              </tr>
                            </thead>
                            <tbody className="divide-y divide-neutral-50 text-neutral-700">
                              <tr>
                                <td className="py-1 font-bold text-neutral-900">101</td>
                                <td className="py-1">Deluxe King</td>
                                <td className="py-1 hidden sm:table-cell">1</td>
                                <td className="py-1">
                                  <span className="px-1.5 py-0.2 rounded-full bg-emerald-50 text-emerald-700 font-bold border border-emerald-200 text-[6px] sm:text-[7px]">
                                    Occupied
                                  </span>
                                </td>
                                <td className="py-1 font-medium">David Brown</td>
                                <td className="py-1 hidden sm:table-cell">May 12, 2024</td>
                                <td className="py-1 hidden sm:table-cell">May 16, 2024</td>
                                <td className="py-1 font-semibold text-neutral-900">$150.00</td>
                                <td className="py-1 text-right text-neutral-400">⋮</td>
                              </tr>
                              <tr>
                                <td className="py-1 font-bold text-neutral-900">102</td>
                                <td className="py-1">Deluxe Twin</td>
                                <td className="py-1 hidden sm:table-cell">1</td>
                                <td className="py-1">
                                  <span className="px-1.5 py-0.2 rounded-full bg-emerald-50 text-emerald-700 font-bold border border-emerald-200 text-[6px] sm:text-[7px]">
                                    Occupied
                                  </span>
                                </td>
                                <td className="py-1 font-medium">Sarah Johnson</td>
                                <td className="py-1 hidden sm:table-cell">May 11, 2024</td>
                                <td className="py-1 hidden sm:table-cell">May 15, 2024</td>
                                <td className="py-1 font-semibold text-neutral-900">$140.00</td>
                                <td className="py-1 text-right text-neutral-400">⋮</td>
                              </tr>
                              <tr>
                                <td className="py-1 font-bold text-neutral-900">103</td>
                                <td className="py-1">Superior King</td>
                                <td className="py-1 hidden sm:table-cell">1</td>
                                <td className="py-1">
                                  <span className="px-1.5 py-0.2 rounded-full bg-blue-50 text-blue-700 font-bold border border-blue-200 text-[6px] sm:text-[7px]">
                                    Available
                                  </span>
                                </td>
                                <td className="py-1 text-neutral-400">—</td>
                                <td className="py-1 hidden sm:table-cell text-neutral-400">—</td>
                                <td className="py-1 hidden sm:table-cell text-neutral-400">—</td>
                                <td className="py-1 font-semibold text-neutral-900">$130.00</td>
                                <td className="py-1 text-right text-neutral-400">⋮</td>
                              </tr>
                              <tr>
                                <td className="py-1 font-bold text-neutral-900">104</td>
                                <td className="py-1">Superior Twin</td>
                                <td className="py-1 hidden sm:table-cell">1</td>
                                <td className="py-1">
                                  <span className="px-1.5 py-0.2 rounded-full bg-emerald-50 text-emerald-700 font-bold border border-emerald-200 text-[6px] sm:text-[7px]">
                                    Occupied
                                  </span>
                                </td>
                                <td className="py-1 font-medium">Michael Lee</td>
                                <td className="py-1 hidden sm:table-cell">May 13, 2024</td>
                                <td className="py-1 hidden sm:table-cell">May 17, 2024</td>
                                <td className="py-1 font-semibold text-neutral-900">$135.00</td>
                                <td className="py-1 text-right text-neutral-400">⋮</td>
                              </tr>
                              <tr>
                                <td className="py-1 font-bold text-neutral-900">105</td>
                                <td className="py-1">Suite</td>
                                <td className="py-1 hidden sm:table-cell">1</td>
                                <td className="py-1">
                                  <span className="px-1.5 py-0.2 rounded-full bg-amber-50 text-amber-700 font-bold border border-amber-200 text-[6px] sm:text-[7px]">
                                    Reserved
                                  </span>
                                </td>
                                <td className="py-1 font-medium">Emily Davis</td>
                                <td className="py-1 hidden sm:table-cell">May 14, 2024</td>
                                <td className="py-1 hidden sm:table-cell">May 19, 2024</td>
                                <td className="py-1 font-semibold text-neutral-900">$200.00</td>
                                <td className="py-1 text-right text-neutral-400">⋮</td>
                              </tr>
                            </tbody>
                          </table>
                        </div>
                      </div>

                    </div>
                  </div>

              </div>

              {/* AUTHENTIC MACBOOK PRO BRANDING ON LOWER BEZEL (Exact match to screenshot) */}
              <div className="absolute bottom-[2px] sm:bottom-[3px] left-1/2 -translate-x-1/2">
                <span className="text-[7.5px] sm:text-[9.5px] font-sans font-medium text-[#7e828d] tracking-[0.14em] uppercase select-none opacity-85">
                  MacBook Pro
                </span>
              </div>

            </div>
          </div>

          {/* ==================== MACBOOK PRO 3D ALUMINUM BASE ==================== */}
          <div className="relative w-[104%] -mt-[2px] z-10">
            {/* Dark Hinge Connector Stripe */}
            <div className="h-[2px] sm:h-[3px] bg-[#0c0d10] border-b border-[#21232a] mx-auto w-[96%] rounded-t-sm"></div>

            {/* Aluminum Front Chassis & Keyboard Deck Lip */}
            <div className="relative h-[8px] sm:h-[11px] rounded-b-[14px] sm:rounded-b-[18px] bg-gradient-to-b from-[#e5e8ee] via-[#b8bcc7] to-[#828692] shadow-[0_8px_16px_rgba(0,0,0,0.5)] border-t border-[#f0f2f7] flex items-start justify-center overflow-hidden">
              {/* Metallic Chamfer Highlights */}
              <div className="absolute inset-x-0 top-0 h-[1px] bg-gradient-to-r from-transparent via-white/70 to-transparent"></div>

              {/* Exact Center Thumb Scoop / Opening Notch (Iconic MacBook Pro detail) */}
              <div className="w-14 sm:w-20 h-1 sm:h-1.5 bg-[#1a1c22] rounded-b-md shadow-inner border-x border-b border-[#30333d]"></div>
            </div>

            {/* Ground Contact Shadow (2-tier realistic occlusion shadow) */}
            <div className="w-[96%] h-2 bg-black/60 blur-xs mx-auto -mt-1 rounded-full"></div>
            <div className="w-[88%] h-5 bg-black/50 blur-md mx-auto -mt-2 rounded-full"></div>
          </div>
        </div>

        {/* BOTTOM PRODUCT TITLE LABEL */}
        <div className="text-center mt-3 sm:mt-4">
          <p className="text-xs sm:text-sm font-medium text-neutral-300 tracking-tight">
            IGHO Stay — Hotel & Hospitality Management System
          </p>
        </div>
      </div>
    </div>
  );
};
