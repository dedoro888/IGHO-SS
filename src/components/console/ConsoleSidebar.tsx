import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  LayoutDashboard,
  Building2,
  FileCheck2,
  Users,
  CreditCard,
  Wallet,
  BarChart3,
  MessageSquareWarning,
  Layers,
  Sliders,
  History,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  GraduationCap,
  Cross,
  Network,
} from 'lucide-react';

export type ConsoleTab =
  | 'dashboard'
  | 'hotels'
  | 'schools'
  | 'hospitals'
  | 'registrations'
  | 'users'
  | 'subscriptions'
  | 'finance'
  | 'analytics'
  | 'reviews'
  | 'products'
  | 'settings'
  | 'audit';

interface ConsoleSidebarProps {
  currentTab: ConsoleTab;
  onSelectTab: (tab: ConsoleTab) => void;
  pendingRegistrationsCount: number;
  openComplaintsCount: number;
  isCollapsed: boolean;
  onToggleCollapse: () => void;
  isMobile?: boolean;
}

export const ConsoleSidebar: React.FC<ConsoleSidebarProps> = ({
  currentTab,
  onSelectTab,
  pendingRegistrationsCount,
  openComplaintsCount,
  isCollapsed,
  onToggleCollapse,
  isMobile = false,
}) => {
  const [orgsExpanded, setOrgsExpanded] = useState<boolean>(false);

  const isOrgTab = currentTab === 'hotels' || currentTab === 'schools' || currentTab === 'hospitals';

  const secondaryNavItems = [
    {
      id: 'registrations' as ConsoleTab,
      label: 'Registration Queue',
      icon: FileCheck2,
      badge: pendingRegistrationsCount > 0 ? pendingRegistrationsCount : undefined,
    },
    { id: 'users' as ConsoleTab, label: 'Users & Accounts', icon: Users },
    { id: 'subscriptions' as ConsoleTab, label: 'Subscriptions', icon: CreditCard },
    { id: 'finance' as ConsoleTab, label: 'Finance & Payouts', icon: Wallet },
    { id: 'analytics' as ConsoleTab, label: 'Analytics', icon: BarChart3 },
    {
      id: 'reviews' as ConsoleTab,
      label: 'Reviews & Feedback',
      icon: MessageSquareWarning,
      badge: openComplaintsCount > 0 ? openComplaintsCount : undefined,
    },
    { id: 'products' as ConsoleTab, label: 'Products', icon: Layers },
    { id: 'settings' as ConsoleTab, label: 'Platform Settings', icon: Sliders },
    { id: 'audit' as ConsoleTab, label: 'Audit Logs', icon: History },
  ];

  return (
    <>
      {/* Sticky Sidebar Column - Glass card that resizes seamlessly */}
      <motion.aside
        layout="size"
        animate={{ width: isCollapsed ? 80 : 272 }}
        transition={{ type: 'spring', damping: 28, stiffness: 280 }}
        className={`${
          isMobile
            ? 'fixed top-0 bottom-0 left-0 h-full w-[272px] z-50 rounded-r-[2rem] border-r shadow-2xl bg-white/95 flex'
            : 'hidden md:flex sticky top-4 h-[calc(100vh-2rem)] ml-4 my-4 rounded-[2rem] shadow-lg border border-neutral-200/50 bg-white/95'
        } flex-col justify-between shrink-0 pb-6 backdrop-blur-xl px-5`}
      >
        {/* Header Branding & Symmetrical Stack/Row Capsule */}
        <div className="flex flex-row items-center justify-between h-10 w-full mt-4 shrink-0 relative">
          {/* Profile / Avatar / Identity area */}
          {!isCollapsed ? (
            <div className="flex items-center gap-2.5 min-w-0">
              <div className="rounded-full bg-[#10b981] text-white font-black flex items-center justify-center shadow-sm text-xs shrink-0 select-none cursor-pointer w-7 h-7">
                I
              </div>
              <div className="flex flex-col text-left leading-tight min-w-0">
                <div className="flex items-center gap-1">
                  <span className="font-extrabold text-[11px] tracking-tight text-white font-sans">IGHO</span>
                  <span className="text-neutral-700 text-[10px]">/</span>
                  <span className="text-[10px] font-bold text-[#10b981]">Console</span>
                </div>
                <p className="text-[9px] text-neutral-400 font-medium truncate">
                  Building Dreams
                </p>
              </div>
            </div>
          ) : null}

          {/* Symmetrical Minimize Button with vertical Dynamic Island feel when expanded */}
          <button
            onClick={onToggleCollapse}
            className={`rounded-full border border-neutral-850 bg-black hover:bg-neutral-900 text-neutral-400 hover:text-white shrink-0 flex items-center justify-center cursor-pointer transition-all duration-300 ${
              isCollapsed ? 'w-10 h-10 mx-auto' : 'w-8 h-8'
            }`}
            title={isCollapsed ? "Expand Sidebar" : "Collapse Sidebar"}
          >
            {isCollapsed ? (
              <ChevronRight className="w-4 h-4 text-neutral-400" />
            ) : (
              <div className="flex flex-col items-center justify-center gap-0.5">
                <ChevronLeft className="w-3.5 h-3.5 text-[#10b981]" />
                <span className="text-[6px] font-black uppercase tracking-wider text-neutral-500 scale-90">MIN</span>
              </div>
            )}
          </button>
        </div>

        {/* Scrollable Navigation List */}
        <div className="flex-1 overflow-y-auto py-4 space-y-2.5 scrollbar-thin scrollbar-thumb-neutral-200 text-xs">
          {/* Overview Tab Link */}
          <div className="flex justify-start w-full">
            <button
              onClick={() => onSelectTab('dashboard')}
              title="Overview"
              className={`flex items-center justify-start h-10 rounded-full border relative cursor-pointer overflow-hidden transition-all duration-300 ${
                isCollapsed ? 'w-10 pr-0' : 'w-fit pr-5'
              } ${
                currentTab === 'dashboard'
                  ? 'bg-black border-white text-white font-bold shadow-md'
                  : 'bg-black border-neutral-850 text-neutral-400 hover:text-white hover:border-neutral-700'
              }`}
            >
              {/* Locked Anchor Icon container */}
              <div className="w-10 h-10 flex items-center justify-center shrink-0">
                <LayoutDashboard className="w-4 h-4 shrink-0" />
              </div>
              <AnimatePresence initial={false}>
                {!isCollapsed && (
                  <motion.span
                    initial={{ opacity: 0, x: -10 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: -10 }}
                    transition={{ duration: 0.15 }}
                    className="text-xs font-bold whitespace-nowrap overflow-hidden ml-1"
                  >
                    Overview
                  </motion.span>
                )}
              </AnimatePresence>
            </button>
          </div>

          {/* Organizations Group */}
          <div className="relative flex justify-start w-full group">
            <button
              onClick={() => {
                if (isCollapsed) {
                  onSelectTab('hotels');
                } else {
                  setOrgsExpanded(!orgsExpanded);
                }
              }}
              title="Organizations"
              className={`flex items-center justify-between h-10 rounded-full border relative cursor-pointer overflow-hidden transition-all duration-300 ${
                isCollapsed ? 'w-10 pr-0' : 'w-fit pr-5'
              } ${
                isOrgTab
                  ? 'bg-black border-white text-white font-bold shadow-md'
                  : 'bg-black border-neutral-850 text-neutral-400 hover:text-white hover:border-neutral-700'
              }`}
            >
              <div className="flex items-center justify-start">
                {/* Locked Anchor Icon container */}
                <div className="w-10 h-10 flex items-center justify-center shrink-0">
                  <Network className="w-4 h-4 shrink-0" />
                </div>
                <AnimatePresence initial={false}>
                  {!isCollapsed && (
                    <motion.span
                      initial={{ opacity: 0, x: -10 }}
                      animate={{ opacity: 1, x: 0 }}
                      exit={{ opacity: 0, x: -10 }}
                      transition={{ duration: 0.15 }}
                      className="text-xs font-bold whitespace-nowrap overflow-hidden ml-1"
                    >
                      Organizations
                    </motion.span>
                  )}
                </AnimatePresence>
              </div>

              <AnimatePresence initial={false}>
                {!isCollapsed && (
                  <motion.div
                    initial={{ opacity: 0, scale: 0.8 }}
                    animate={{ opacity: 1, scale: 1 }}
                    exit={{ opacity: 0, scale: 0.8 }}
                    transition={{ duration: 0.15 }}
                    className="ml-3 shrink-0"
                  >
                    <ChevronDown
                      className={`w-3.5 h-3.5 text-neutral-400 transition-transform duration-300 ${
                        orgsExpanded ? 'rotate-0' : '-rotate-90'
                      }`}
                    />
                  </motion.div>
                )}
              </AnimatePresence>
            </button>

            {/* Float Bubbles on Hover when Collapsed */}
            {isCollapsed && (
              <>
                <div className="absolute top-1/2 right-1/2 -translate-y-1/2 w-28 h-20 opacity-0 pointer-events-none group-hover:pointer-events-auto z-10" />

                {/* Bubble 1: Hotels & Stay */}
                <button
                  onClick={() => onSelectTab('hotels')}
                  className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-8 h-8 rounded-full bg-black border border-neutral-800 shadow-xl flex items-center justify-center text-white opacity-0 scale-0 pointer-events-none group-hover:opacity-100 group-hover:scale-100 group-hover:pointer-events-auto group-hover:-translate-x-[4.25rem] group-hover:-translate-y-[2rem] hover:scale-110 active:scale-95 hover:bg-neutral-900 cursor-pointer z-20"
                  style={{
                    transition: 'all 450ms cubic-bezier(0.34, 1.56, 0.64, 1)',
                  }}
                  title="Hotels & Stay"
                >
                  <Building2 className="w-3.5 h-3.5 text-white" />
                </button>

                {/* Bubble 2: Schools */}
                <button
                  onClick={() => onSelectTab('schools')}
                  className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-8 h-8 rounded-full bg-white border border-black shadow-lg flex items-center justify-center text-black opacity-0 scale-0 pointer-events-none group-hover:opacity-100 group-hover:scale-100 group-hover:pointer-events-auto group-hover:-translate-x-[5.25rem] group-hover:translate-y-0 hover:scale-110 active:scale-95 hover:bg-neutral-50 cursor-pointer z-20"
                  style={{
                    transition: 'all 450ms cubic-bezier(0.34, 1.56, 0.64, 1)',
                    transitionDelay: '35ms',
                  }}
                  title="Schools (Beta)"
                >
                  <GraduationCap className="w-3.5 h-3.5 text-black" />
                </button>

                {/* Bubble 3: Hospitals */}
                <button
                  onClick={() => onSelectTab('hospitals')}
                  className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-8 h-8 rounded-full bg-white border border-black shadow-lg flex items-center justify-center text-black opacity-0 scale-0 pointer-events-none group-hover:opacity-100 group-hover:scale-100 group-hover:pointer-events-auto group-hover:-translate-x-[4.25rem] group-hover:translate-y-[2rem] hover:scale-110 active:scale-95 hover:bg-neutral-50 cursor-pointer z-20"
                  style={{
                    transition: 'all 450ms cubic-bezier(0.34, 1.56, 0.64, 1)',
                    transitionDelay: '70ms',
                  }}
                  title="Hospitals (Roadmap)"
                >
                  <Cross className="w-3.5 h-3.5 text-black" />
                </button>
              </>
            )}
          </div>

          {/* Sub-menu rendered directly under when expanded */}
          <AnimatePresence initial={false}>
            {!isCollapsed && orgsExpanded && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
                exit={{ opacity: 0, height: 0 }}
                transition={{ type: 'spring', damping: 25, stiffness: 280 }}
                className="w-full pl-6 space-y-1.5 pt-1 overflow-hidden"
              >
                <button
                  onClick={() => onSelectTab('hotels')}
                  className={`flex items-center h-8 rounded-full border transition-all duration-300 pl-2 pr-4 cursor-pointer w-fit ${
                    currentTab === 'hotels'
                      ? 'bg-black border-white text-white font-bold shadow-md'
                      : 'bg-black border-neutral-850 text-neutral-400 hover:text-white'
                  }`}
                >
                  <div className="w-5 h-5 rounded-full bg-black border border-neutral-800 flex items-center justify-center shrink-0">
                    <Building2 className="w-3 h-3 text-white" />
                  </div>
                  <span className="text-[10px] font-bold whitespace-nowrap ml-2">Hotels & Stay</span>
                </button>

                <button
                  onClick={() => onSelectTab('schools')}
                  className={`flex items-center h-8 rounded-full border transition-all duration-300 pl-2 pr-4 cursor-pointer w-fit ${
                    currentTab === 'schools'
                      ? 'bg-neutral-900 border-white text-white font-bold shadow-md'
                      : 'bg-black border-neutral-850 text-neutral-400 hover:text-white'
                  }`}
                >
                  <div className="w-5 h-5 rounded-full bg-white border border-black flex items-center justify-center shrink-0">
                    <GraduationCap className="w-3 h-3 text-black" />
                  </div>
                  <span className="text-[10px] font-bold whitespace-nowrap ml-2">Schools (Beta)</span>
                </button>

                <button
                  onClick={() => onSelectTab('hospitals')}
                  className={`flex items-center h-8 rounded-full border transition-all duration-300 pl-2 pr-4 cursor-pointer w-fit ${
                    currentTab === 'hospitals'
                      ? 'bg-neutral-900 border-white text-white font-bold shadow-md'
                      : 'bg-black border-neutral-850 text-neutral-400 hover:text-white'
                  }`}
                >
                  <div className="w-5 h-5 rounded-full bg-white border border-black flex items-center justify-center shrink-0">
                    <Cross className="w-3 h-3 text-black" />
                  </div>
                  <span className="text-[10px] font-bold whitespace-nowrap ml-2">Hospitals (Roadmap)</span>
                </button>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Secondary Controls Links */}
          <div className="pt-2 space-y-1.5 w-full">
            {!isCollapsed && (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="px-4 py-1 text-[10px] font-bold text-neutral-500 uppercase tracking-widest font-mono"
              >
                Controls
              </motion.div>
            )}
            {secondaryNavItems.map((item) => {
              const Icon = item.icon;
              const isActive = currentTab === item.id;
              return (
                <div key={item.id} className="flex justify-start w-full">
                  <button
                    onClick={() => onSelectTab(item.id)}
                    title={item.label}
                    className={`flex items-center justify-start h-10 rounded-full border relative cursor-pointer overflow-hidden transition-all duration-300 ${
                      isCollapsed ? 'w-10 pr-0' : 'w-fit pr-5'
                    } ${
                      isActive
                        ? 'bg-black border-white text-white font-bold shadow-md'
                        : 'bg-black border-neutral-850 text-neutral-400 hover:text-white hover:border-neutral-700'
                    }`}
                  >
                    {/* Locked Anchor Icon container */}
                    <div className="w-10 h-10 flex items-center justify-center shrink-0">
                      <Icon className="w-4 h-4 shrink-0" />
                    </div>
                    <AnimatePresence initial={false}>
                      {!isCollapsed && (
                        <motion.span
                          initial={{ opacity: 0, x: -10 }}
                          animate={{ opacity: 1, x: 0 }}
                          exit={{ opacity: 0, x: -10 }}
                          transition={{ duration: 0.15 }}
                          className="text-[11px] font-semibold whitespace-nowrap overflow-hidden ml-1"
                        >
                          {item.label}
                        </motion.span>
                      )}
                    </AnimatePresence>

                    {item.badge !== undefined && (
                      <span
                        className={`absolute font-black rounded-full transition-all duration-300 ${
                          isCollapsed 
                            ? '-top-1 -right-1 w-4.5 h-4.5 text-[9px] bg-rose-500 text-white flex items-center justify-center border border-white' 
                            : 'right-3 px-2 py-0.5 text-[10px] bg-rose-500 text-white'
                        }`}
                      >
                        {item.badge}
                      </span>
                    )}
                  </button>
                </div>
              );
            })}
          </div>
        </div>
      </motion.aside>
    </>
  );
};
