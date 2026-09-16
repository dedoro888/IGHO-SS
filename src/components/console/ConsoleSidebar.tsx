import React, { useState } from 'react';
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
  Shield,
  ChevronDown,
  ExternalLink,
  GraduationCap,
  Cross,
  Network,
  LogOut,
} from 'lucide-react';
import { ActiveScreen } from '../../types';

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
  currentUserEmail: string;
  onNavigate: (screen: ActiveScreen) => void;
  onSwitchPersona?: (email: string) => void;
  mobileOpen: boolean;
  onCloseMobile: () => void;
}

export const ConsoleSidebar: React.FC<ConsoleSidebarProps> = ({
  currentTab,
  onSelectTab,
  pendingRegistrationsCount,
  openComplaintsCount,
  currentUserEmail,
  onNavigate,
  onSwitchPersona,
  mobileOpen,
  onCloseMobile,
}) => {
  const [orgsExpanded, setOrgsExpanded] = useState<boolean>(true);

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
      {/* Mobile Backdrop */}
      {mobileOpen && (
        <div
          onClick={onCloseMobile}
          className="fixed inset-0 bg-black/40 backdrop-blur-xs z-40 lg:hidden"
        />
      )}

      <aside
        className={`fixed top-0 bottom-0 left-0 z-50 w-64 bg-white border-r border-neutral-200 flex flex-col justify-between transition-transform duration-200 lg:translate-x-0 ${
          mobileOpen ? 'translate-x-0' : '-translate-x-full'
        }`}
      >
        {/* Header Branding (IGHO Software Systems) */}
        <div className="p-4 border-b border-neutral-200">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-black text-white font-black flex items-center justify-center text-sm shadow-xs shrink-0">
              I
            </div>
            <div className="min-w-0">
              <div className="flex items-center gap-1.5">
                <span className="font-black text-sm tracking-tight text-black">IGHO</span>
                <span className="text-neutral-300 text-xs">/</span>
                <span className="text-xs font-bold text-neutral-700">Console</span>
              </div>
              <p className="text-[10px] text-neutral-500 font-medium truncate">
                IGHO Software Systems
              </p>
            </div>
          </div>
        </div>

        {/* Scrollable Navigation */}
        <div className="flex-1 overflow-y-auto px-3 py-4 space-y-1 text-xs">
          {/* 1. Dashboard */}
          <button
            onClick={() => {
              onSelectTab('dashboard');
              onCloseMobile();
            }}
            className={`w-full flex items-center justify-between px-3 py-2.5 rounded-xl text-xs font-bold transition-colors ${
              currentTab === 'dashboard'
                ? 'bg-black text-white shadow-xs'
                : 'text-neutral-600 hover:text-black hover:bg-neutral-100'
            }`}
          >
            <div className="flex items-center gap-3">
              <LayoutDashboard className="w-4 h-4" />
              <span>Overview</span>
            </div>
          </button>

          {/* 2. Organizations Section Header & Accordion Tree */}
          <div className="pt-2">
            <button
              onClick={() => setOrgsExpanded(!orgsExpanded)}
              className={`w-full flex items-center justify-between px-3 py-2 rounded-xl text-xs font-bold transition-colors ${
                isOrgTab
                  ? 'text-black bg-neutral-100'
                  : 'text-neutral-600 hover:text-black hover:bg-neutral-50'
              }`}
            >
              <div className="flex items-center gap-3">
                <Network className="w-4 h-4 text-neutral-500" />
                <span>Organizations</span>
              </div>
              <ChevronDown
                className={`w-3.5 h-3.5 text-neutral-400 transition-transform ${
                  orgsExpanded ? 'rotate-0' : '-rotate-90'
                }`}
              />
            </button>

            {/* Tree Branch Sub-items */}
            {orgsExpanded && (
              <div className="ml-3 pl-3 border-l border-neutral-200 space-y-1 mt-1">
                {/* Branch 1: Hotels */}
                <button
                  onClick={() => {
                    onSelectTab('hotels');
                    onCloseMobile();
                  }}
                  className={`w-full flex items-center justify-between px-3 py-2 rounded-xl text-xs font-semibold transition-colors ${
                    currentTab === 'hotels'
                      ? 'bg-black text-white font-bold shadow-xs'
                      : 'text-neutral-600 hover:text-black hover:bg-neutral-100'
                  }`}
                >
                  <div className="flex items-center gap-2.5">
                    <Building2 className="w-3.5 h-3.5" />
                    <span>Hotels & Stay</span>
                  </div>
                </button>

                {/* Branch 2: Schools */}
                <button
                  onClick={() => {
                    onSelectTab('schools');
                    onCloseMobile();
                  }}
                  className={`w-full flex items-center justify-between px-3 py-2 rounded-xl text-xs font-semibold transition-colors ${
                    currentTab === 'schools'
                      ? 'bg-black text-white font-bold shadow-xs'
                      : 'text-neutral-600 hover:text-black hover:bg-neutral-100'
                  }`}
                >
                  <div className="flex items-center gap-2.5">
                    <GraduationCap className="w-3.5 h-3.5" />
                    <span>Schools (Beta)</span>
                  </div>
                </button>

                {/* Branch 3: Hospitals */}
                <button
                  onClick={() => {
                    onSelectTab('hospitals');
                    onCloseMobile();
                  }}
                  className={`w-full flex items-center justify-between px-3 py-2 rounded-xl text-xs font-semibold transition-colors ${
                    currentTab === 'hospitals'
                      ? 'bg-black text-white font-bold shadow-xs'
                      : 'text-neutral-600 hover:text-black hover:bg-neutral-100'
                  }`}
                >
                  <div className="flex items-center gap-2.5">
                    <Cross className="w-3.5 h-3.5" />
                    <span>Hospitals (Roadmap)</span>
                  </div>
                </button>
              </div>
            )}
          </div>

          {/* Secondary Nav Items */}
          <div className="pt-2 space-y-1">
            <div className="px-3 py-1.5 text-[10px] font-bold text-neutral-400 uppercase tracking-wider">
              Management & Controls
            </div>
            {secondaryNavItems.map((item) => {
              const Icon = item.icon;
              const isActive = currentTab === item.id;
              return (
                <button
                  key={item.id}
                  onClick={() => {
                    onSelectTab(item.id);
                    onCloseMobile();
                  }}
                  className={`w-full flex items-center justify-between px-3 py-2 rounded-xl text-xs font-semibold transition-colors ${
                    isActive
                      ? 'bg-black text-white font-bold shadow-xs'
                      : 'text-neutral-600 hover:text-black hover:bg-neutral-100'
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <Icon className="w-4 h-4" />
                    <span>{item.label}</span>
                  </div>
                  {item.badge !== undefined && (
                    <span
                      className={`px-1.5 py-0.5 rounded-full text-[10px] font-bold ${
                        isActive
                          ? 'bg-neutral-700 text-white'
                          : 'bg-amber-100 text-amber-800'
                      }`}
                    >
                      {item.badge}
                    </span>
                  )}
                </button>
              );
            })}
          </div>
        </div>

        {/* Footer User Info */}
        <div className="p-4 border-t border-neutral-200 bg-neutral-50/70">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2.5 min-w-0">
              <div className="w-8 h-8 rounded-full bg-neutral-200 text-neutral-800 font-bold text-xs flex items-center justify-center shrink-0">
                RO
              </div>
              <div className="min-w-0">
                <div className="text-xs font-bold text-neutral-900 truncate">Rume Obire</div>
                <div className="text-[10px] text-neutral-500 truncate font-mono">
                  {currentUserEmail}
                </div>
              </div>
            </div>

            <button
              onClick={() => onNavigate('guest_login')}
              title="Sign Out to Login"
              className="p-1.5 rounded-lg text-neutral-400 hover:text-rose-600 hover:bg-rose-50 transition-colors"
            >
              <LogOut className="w-4 h-4" />
            </button>
          </div>
        </div>
      </aside>
    </>
  );
};
