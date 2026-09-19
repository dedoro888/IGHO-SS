import React, { useState } from 'react';
import { ArrowLeft, Building2, Eye, EyeOff, Lock, Mail, ShieldAlert } from 'lucide-react';
import { ActiveScreen } from '../types';
import { IghoOfficialEmblem } from './IghoLogo';

interface StaffLoginProps {
  onLoginSuccess: (staffEmail: string) => void;
  onNavigate: (screen: ActiveScreen) => void;
}

export const StaffLogin: React.FC<StaffLoginProps> = ({ onLoginSuccess, onNavigate }) => {
  const [email, setEmail] = useState('avendoorcompany@gmail.com');
  const [password, setPassword] = useState('Admin@2026!');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setTimeout(() => {
      setLoading(false);
      onLoginSuccess(email);
    }, 500);
  };

  const sampleStaffAccounts = [
    { label: 'Super Admin', email: 'rumeobire@gmail.com' },
    { label: 'Hotel Owner', email: 'owner@palmviewgrand.com' },
    { label: 'Manager', email: 'manager@palmviewgrand.com' },
    { label: 'Receptionist', email: 'reception@palmviewgrand.com' },
    { label: 'Finance', email: 'finance@palmviewgrand.com' },
    { label: 'Housekeeping', email: 'housekeeping@palmviewgrand.com' },
  ];

  return (
    <div className="min-h-screen bg-black text-white flex flex-col justify-between p-4 sm:p-6">
      {/* Top Bar */}
      <div className="flex items-center justify-between max-w-sm mx-auto w-full pt-2">
        <button
          onClick={() => onNavigate('landing')}
          className="flex items-center gap-1.5 text-xs text-neutral-400 hover:text-white font-semibold"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>Back to site</span>
        </button>

        <div className="flex items-center gap-1.5">
          <div className="w-5 h-5 bg-white text-black font-black rounded flex items-center justify-center text-xs">
            I
          </div>
          <span className="font-extrabold text-xs text-white">IGHO</span>
        </div>
      </div>

      {/* Center Staff Login Card */}
      <div className="w-full max-w-sm mx-auto bg-neutral-900/90 border border-neutral-800 rounded-2xl p-6 sm:p-8 space-y-5 my-auto shadow-2xl">
        {/* Icon & Title */}
        <div className="text-center space-y-2">
          <div className="w-14 h-14 bg-white text-black rounded-2xl flex items-center justify-center mx-auto shadow-lg p-2.5">
            <IghoOfficialEmblem className="w-full h-full" />
          </div>
          <div className="space-y-0.5 pt-1">
            <h1 className="text-2xl font-black tracking-tight text-white">Staff Portal</h1>
            <p className="text-xs text-neutral-400">Hotel admin & operations</p>
          </div>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="space-y-4 text-xs">
          <div className="space-y-1.5">
            <label className="block font-semibold text-neutral-300">Staff email</label>
            <div className="relative">
              <Mail className="w-4 h-4 text-neutral-500 absolute left-3 top-3" />
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="staff@yourhotel.com"
                className="w-full pl-9 pr-3 py-2.5 bg-black border border-neutral-700 rounded-xl text-white placeholder:text-neutral-600 focus:outline-none focus:border-white text-xs"
              />
            </div>
          </div>

          <div className="space-y-1.5">
            <label className="block font-semibold text-neutral-300">Password</label>
            <div className="relative">
              <Lock className="w-4 h-4 text-neutral-500 absolute left-3 top-3" />
              <input
                type={showPassword ? 'text' : 'password'}
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Your staff password"
                className="w-full pl-9 pr-10 py-2.5 bg-black border border-neutral-700 rounded-xl text-white placeholder:text-neutral-600 focus:outline-none focus:border-white text-xs"
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3 top-3 text-neutral-400 hover:text-white"
              >
                {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full bg-white text-black py-3 rounded-full font-bold text-xs hover:bg-neutral-200 transition-all active:scale-95 shadow-md mt-2 flex items-center justify-center gap-2"
          >
            {loading ? 'Signing in...' : 'Sign in'}
          </button>
        </form>

        {/* Quick Role Fill for Testing / Review */}
        <div className="pt-1 space-y-1.5 border-t border-neutral-800/80">
          <span className="text-[10px] font-mono text-neutral-400 uppercase tracking-wider block text-center">
            Quick Persona Switch
          </span>
          <div className="grid grid-cols-2 gap-1.5">
            {sampleStaffAccounts.map((item) => (
              <button
                key={item.label}
                type="button"
                onClick={() => {
                  setEmail(item.email);
                  setPassword('Admin@2026!');
                }}
                className={`px-2 py-1.5 rounded-lg text-[11px] font-semibold text-left truncate transition-colors border ${
                  email === item.email
                    ? 'bg-white text-black border-white'
                    : 'bg-neutral-900 border-neutral-800 text-neutral-400 hover:text-white hover:border-neutral-700'
                }`}
              >
                {item.label}
              </button>
            ))}
          </div>
        </div>

        {/* Bottom Links */}
        <div className="pt-2 text-center text-xs text-neutral-500 border-t border-neutral-800 flex flex-wrap items-center justify-center gap-2">
          <span>Not hotel staff?</span>
          <button
            onClick={() => onNavigate('guest_login')}
            className="text-neutral-300 hover:text-white underline font-semibold"
          >
            IGHO Login
          </button>
          <span>·</span>
          <button
            onClick={() => onNavigate('landing')}
            className="text-neutral-300 hover:text-white underline font-semibold"
          >
            Back to site
          </button>
        </div>
      </div>

      <div className="text-center text-[10px] text-neutral-600 py-2 font-mono">
        IGHO Hotel Management System v2.4
      </div>
    </div>
  );
};
