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
  LogOut,
  Database,
} from 'lucide-react';
import { IghoOfficialEmblem } from '../IghoLogo';

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
  | 'audit'
  | 'storage';

interface ConsoleSidebarProps {
  currentTab: ConsoleTab;
  onSelectTab: (tab: ConsoleTab) => void;
  pendingRegistrationsCount: number;
  openComplaintsCount: number;
  isCollapsed: boolean;
  onToggleCollapse: () => void;
  isMobile?: boolean;
  currentUserEmail?: string;
  onNavigate?: (screen: string) => void;
  onSwitchPersona?: (email: string) => void;
  profileName?: string;
  profileEmail?: string;
  profilePicture?: string;
  onEditProfileClick?: () => void;
}

export const ConsoleSidebar: React.FC<ConsoleSidebarProps> = ({
  currentTab,
  onSelectTab,
  pendingRegistrationsCount,
  openComplaintsCount,
  isCollapsed,
  onToggleCollapse,
  isMobile = false,
  currentUserEmail,
  onNavigate,
  onSwitchPersona,
  profileName = 'Rume Obire',
  profileEmail = 'rumeobire@gmail.com',
  profilePicture = '',
  onEditProfileClick,
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
      {/* Sticky Sidebar Column - Divided into 3 standalone premium capsules with zero layout jitter */}
      <motion.aside
        animate={{ width: isCollapsed ? 80 : 272 }}
        transition={{ duration: 0.3, ease: 'easeInOut' }}
        className={`${
          isMobile
            ? 'fixed top-0 bottom-0 left-0 h-full w-[272px] z-50 rounded-r-[2rem] border-r shadow-2xl bg-white/95 flex flex-col justify-start pb-6 px-5 pt-4 gap-4'
            : 'hidden md:flex sticky top-4 h-[calc(100vh-2rem)] ml-4 my-4 flex-col justify-start gap-4 shrink-0 bg-transparent shadow-none border-none px-0'
        }`}
      >
        {/* SECTION 1: HEADER BRANDING PILL */}
        <div
          className="flex flex-row items-center justify-center w-full shrink-0 relative bg-white border border-neutral-200/50 shadow-xs transition-colors duration-200 rounded-[2rem] p-4 h-16"
        >
          {isCollapsed ? (
            <div className="flex items-center justify-center w-full">
              <IghoOfficialEmblem className="w-7 h-7 cursor-pointer" />
            </div>
          ) : (
            <div className="flex items-center gap-2.5 min-w-0 w-full justify-start">
              <IghoOfficialEmblem className="w-7 h-7 cursor-pointer shrink-0" />
              <div className="flex flex-col text-left leading-tight min-w-0">
                <div className="flex items-center gap-1">
                  <span className="font-extrabold text-[12px] tracking-tight text-neutral-900 font-sans">IGHO</span>
                  <span className="text-neutral-400 text-[10px]">/</span>
                  <span className="text-[11px] font-bold text-[#10b981]">Console</span>
                </div>
                <p className="text-[9px] text-neutral-400 font-medium truncate">
                  Building Dreams
                </p>
              </div>
            </div>
          )}
        </div>

        {/* SECTION 2: NAVIGATION & SCROLLABLE CONTROLS LIST */}
        <div
          className="flex flex-col shrink-0 w-full bg-white border border-neutral-200/50 shadow-xs transition-colors duration-200 rounded-[2rem] p-4 nav-second-segment"
        >
          <div className="max-h-[55vh] overflow-y-auto space-y-2.5 scrollbar-thin scrollbar-thumb-neutral-200 text-xs w-full">
            {/* Overview Tab Link */}
            <div className={`flex ${isCollapsed ? 'justify-center' : 'justify-start'} w-full`}>
              <button
                onClick={() => onSelectTab('dashboard')}
                title="Overview"
                className={`flex items-center justify-start h-10 rounded-full border relative cursor-pointer overflow-hidden transition-all duration-300 ${
                  isCollapsed ? 'w-10 justify-center' : 'w-full'
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
                      className="text-[11px] font-bold whitespace-nowrap overflow-hidden ml-1"
                    >
                      Overview
                    </motion.span>
                  )}
                </AnimatePresence>
              </button>
            </div>

            {/* Organizations Group */}
            <div className={`relative flex ${isCollapsed ? 'justify-center' : 'justify-start'} w-full group`}>
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
                  isCollapsed ? 'w-10 justify-center' : 'w-full pr-4'
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
                        className="text-[11px] font-bold whitespace-nowrap overflow-hidden ml-1"
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
                    className={`flex items-center h-8 rounded-full border transition-all duration-300 pl-2 pr-4 cursor-pointer w-full ${
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
                    className={`flex items-center h-8 rounded-full border transition-all duration-300 pl-2 pr-4 cursor-pointer w-full ${
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
                    className={`flex items-center h-8 rounded-full border transition-all duration-300 pl-2 pr-4 cursor-pointer w-full ${
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
              <div className="px-4 text-[10px] font-bold text-neutral-500 uppercase tracking-widest font-mono flex items-center shrink-0 h-6 mt-2">
                {isCollapsed ? (
                  <div className="w-4 h-[1px] bg-neutral-200/60 mx-auto" />
                ) : (
                  <span>Controls</span>
                )}
              </div>
              {secondaryNavItems.map((item) => {
                const Icon = item.icon;
                const isActive = currentTab === item.id;
                return (
                  <div key={item.id} className={`flex ${isCollapsed ? 'justify-center' : 'justify-start'} w-full`}>
                    <button
                      onClick={() => onSelectTab(item.id)}
                      title={item.label}
                      className={`flex items-center justify-start h-10 rounded-full border relative cursor-pointer overflow-hidden transition-all duration-300 ${
                        isCollapsed ? 'w-10 justify-center' : 'w-full'
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
                            className="text-[11px] font-bold whitespace-nowrap overflow-hidden ml-1"
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

            {/* Infrastructure Section */}
            <div className="pt-2 space-y-1.5 w-full border-t border-neutral-100 mt-2">
              <div className="px-4 text-[10px] font-bold text-neutral-500 uppercase tracking-widest font-mono flex items-center shrink-0 h-6 mt-2">
                {isCollapsed ? (
                  <div className="w-4 h-[1px] bg-neutral-200/60 mx-auto" />
                ) : (
                  <span>Infrastructure</span>
                )}
              </div>
              <div className={`flex ${isCollapsed ? 'justify-center' : 'justify-start'} w-full`}>
                <button
                  onClick={() => onSelectTab('storage')}
                  title="Storage Usage"
                  className={`flex items-center justify-start h-10 rounded-full border relative cursor-pointer overflow-hidden transition-all duration-300 ${
                    isCollapsed ? 'w-10 justify-center' : 'w-full'
                  } ${
                    currentTab === 'storage'
                      ? 'bg-black border-white text-white font-bold shadow-md'
                      : 'bg-black border-neutral-850 text-neutral-400 hover:text-white hover:border-neutral-700'
                  }`}
                >
                  <div className="w-10 h-10 flex items-center justify-center shrink-0">
                    <Database className="w-4 h-4 shrink-0" />
                  </div>
                  <AnimatePresence initial={false}>
                    {!isCollapsed && (
                      <motion.span
                        initial={{ opacity: 0, x: -10 }}
                        animate={{ opacity: 1, x: 0 }}
                        exit={{ opacity: 0, x: -10 }}
                        transition={{ duration: 0.15 }}
                        className="text-[11px] font-bold whitespace-nowrap overflow-hidden ml-1"
                      >
                        Storage Usage
                      </motion.span>
                    )}
                  </AnimatePresence>
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* SECTION 3: FOOTER PROFILE, COLLAPSE & LOGOUT PILL */}
        <div
          className="shrink-0 w-full bg-white border border-neutral-200/50 shadow-xs transition-colors duration-200 space-y-3 rounded-[2rem] p-4"
        >
          {/* Section 3: Profile Pill */}
          <div className={`flex ${isCollapsed ? 'justify-center' : 'justify-start'} w-full`}>
            <button
              onClick={onEditProfileClick}
              title="Edit Admin Profile"
              className={`flex items-center gap-2.5 hover:bg-neutral-50/80 border border-neutral-200/60 rounded-full cursor-pointer transition-all duration-300 ${
                isCollapsed ? 'w-10 h-10 justify-center p-0' : 'w-full px-3.5 py-1.5'
              }`}
            >
              {profilePicture ? (
                <img src={profilePicture} alt="Profile" className="w-7 h-7 rounded-full object-cover shadow-xs shrink-0" />
              ) : (
                <div className="w-7 h-7 rounded-full overflow-hidden shadow-xs shrink-0">
                  <IghoOfficialEmblem className="w-full h-full" inverted={false} />
                </div>
              )}
              <AnimatePresence initial={false}>
                {!isCollapsed && (
                  <motion.div
                    initial={{ opacity: 0, x: -10 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: -10 }}
                    transition={{ duration: 0.15 }}
                    className="min-w-0 text-left leading-tight flex-1"
                  >
                    <p className="text-[11px] font-extrabold text-neutral-900 truncate">{profileName}</p>
                    <p className="text-[9px] text-[#10b981] font-mono truncate">{profileEmail}</p>
                  </motion.div>
                )}
              </AnimatePresence>
            </button>
          </div>

          {/* Section 1: Collapse and Logout */}
          <div className="flex flex-col gap-2 w-full">
            {/* Collapse */}
            <div className={`flex ${isCollapsed ? 'justify-center' : 'justify-start'} w-full`}>
              <button
                onClick={onToggleCollapse}
                title={isCollapsed ? 'Expand Sidebar' : 'Collapse Sidebar'}
                className={`flex items-center justify-start h-10 rounded-full border relative cursor-pointer overflow-hidden transition-all duration-300 bg-black border-neutral-850 text-neutral-400 hover:text-white hover:border-neutral-700 ${
                  isCollapsed ? 'w-10 justify-center' : 'w-full'
                }`}
              >
                <div className="w-10 h-10 flex items-center justify-center shrink-0">
                  {isCollapsed ? (
                    <ChevronRight className="w-4 h-4 text-neutral-400 font-bold" />
                  ) : (
                    <ChevronLeft className="w-4 h-4 text-white font-bold" />
                  )}
                </div>
                {!isCollapsed && (
                  <span className="text-[11px] font-bold whitespace-nowrap ml-1">Collapse</span>
                )}
              </button>
            </div>

            {/* Log Out */}
            <div className={`flex ${isCollapsed ? 'justify-center' : 'justify-start'} w-full`}>
              <button
                onClick={() => {
                  if (onNavigate) onNavigate('guest_login');
                }}
                title="Log Out"
                className={`flex items-center justify-start h-10 rounded-full border relative cursor-pointer overflow-hidden transition-all duration-300 text-rose-600 hover:text-rose-700 bg-rose-50/50 hover:bg-rose-50 border-rose-100 hover:border-rose-200 ${
                  isCollapsed ? 'w-10 justify-center' : 'w-full'
                }`}
              >
                <div className="w-10 h-10 flex items-center justify-center shrink-0">
                  <LogOut className="w-4 h-4 shrink-0" />
                </div>
                {!isCollapsed && (
                  <span className="text-[11px] font-bold whitespace-nowrap ml-1">Log Out</span>
                )}
              </button>
            </div>
          </div>
        </div>
      </motion.aside>
    </>
  );
};
