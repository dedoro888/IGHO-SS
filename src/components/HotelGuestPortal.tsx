import React, { useState } from 'react';
import {
  Building2,
  Filter,
  User,
  Phone,
  Mail,
  ShieldCheck,
  Headphones,
} from 'lucide-react';
import { Hotel, Room, ActiveScreen, CustomerProfile } from '../types';
import { BackButton } from './BackButton';
import { GuestAccountNavMenu } from './GuestAccountNavMenu';
import { resolveUserAccount } from '../utils/auth';

interface HotelGuestPortalProps {
  hotel: Hotel;
  rooms: Room[];
  onSelectRoom: (room: Room) => void;
  onNavigate: (screen: ActiveScreen) => void;
  currentUserEmail?: string;
  currentGuestProfile?: CustomerProfile | null;
  onSignOut?: () => void;
  onEditProfile?: () => void;
}

export const HotelGuestPortal: React.FC<HotelGuestPortalProps> = ({
  hotel,
  rooms,
  onSelectRoom,
  onNavigate,
  currentUserEmail,
  currentGuestProfile,
  onSignOut,
  onEditProfile,
}) => {
  const [selectedType, setSelectedType] = useState<string>('all');

  const roomTypes = ['all', 'Standard', 'Deluxe', 'Suite', 'Presidential'];

  const filteredRooms = rooms.filter((r) => {
    if (selectedType === 'all') return true;
    return r.type.toLowerCase().includes(selectedType.toLowerCase());
  });

  // Resolve user role to allow quick return to Console / Staff Portal
  const effectiveEmail = currentUserEmail || (typeof window !== 'undefined' ? localStorage.getItem('igho_currentStaffEmail') : '') || '';
  const account = effectiveEmail ? resolveUserAccount(effectiveEmail) : null;
  const showReturnButton = account && account.role !== 'customer';

  return (
    <div className="min-h-screen bg-white text-neutral-900 flex flex-col justify-between">
      {/* Hotel Public Header */}
      <header className="sticky top-0 z-40 bg-white/95 backdrop-blur-md border-b border-neutral-100 px-4 sm:px-6 py-3 flex items-center justify-between">
        <div className="flex items-center gap-4">
          <BackButton onClick={() => onNavigate('hotel_directory')} />
          <button
            onClick={() => onNavigate('hotel_directory')}
            className="flex items-center gap-2 text-left"
          >
            <div className="w-6 h-6 bg-black text-white font-black rounded flex items-center justify-center text-xs">
              I
            </div>
            <div className="leading-tight">
              <span className="font-extrabold text-sm text-black tracking-tight">IGHO Stay</span>
            </div>
          </button>

          {showReturnButton && (
            <button
              onClick={() => {
                if (account.role === 'super_admin') {
                  onNavigate('super_admin_console');
                } else {
                  onNavigate('staff_portal');
                }
              }}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-[#10b981]/10 hover:bg-[#10b981]/20 border border-[#10b981]/25 text-[#10b981] rounded-lg text-xs font-bold transition-all shadow-3xs cursor-pointer"
            >
              <span>← Return to {account.role === 'super_admin' ? 'Console' : 'Dashboard'}</span>
            </button>
          )}

          <nav className="hidden sm:flex items-center gap-4 text-xs font-medium text-neutral-600">
            <button onClick={() => onNavigate('landing')} className="hover:text-black">
              Home
            </button>
            <button className="text-black font-semibold">Rooms</button>
            <button onClick={() => onNavigate('demo_request')} className="hover:text-black">
              About
            </button>
            <button onClick={() => onNavigate('demo_request')} className="hover:text-black">
              Contact
            </button>
          </nav>
        </div>

        <div>
          <GuestAccountNavMenu
            currentUserEmail={currentUserEmail}
            currentGuestProfile={currentGuestProfile}
            onNavigate={onNavigate}
            onSignOut={onSignOut}
            onEditProfile={onEditProfile}
            signInLabel="Login / Register"
          />
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-1 max-w-5xl mx-auto px-4 sm:px-6 py-8 sm:py-10 space-y-8 w-full">
        {/* Luxury Hotel Branding Header */}
        <div className="space-y-6">
          {/* Cover Banner */}
          <div className="relative h-64 sm:h-80 w-full rounded-2xl sm:rounded-3xl overflow-hidden bg-neutral-900 shadow-xs">
            {hotel.coverImage ? (
              <img src={hotel.coverImage} alt={hotel.name} className="w-full h-full object-cover opacity-90" referrerPolicy="no-referrer" />
            ) : (
              <div className="w-full h-full bg-gradient-to-tr from-neutral-950 via-neutral-800 to-neutral-900 flex items-center justify-center p-6">
                <div className="text-center space-y-2">
                  <Building2 className="w-12 h-12 text-neutral-600 mx-auto stroke-[1.2]" />
                  <p className="text-[10px] uppercase tracking-widest text-neutral-500 font-bold">Welcome to {hotel.name}</p>
                </div>
              </div>
            )}
            {/* Soft Overlay */}
            <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-black/20 to-transparent" />
          </div>

          {/* Logo, Name and Stats Overlay Row */}
          <div className="px-2 sm:px-4 -mt-16 sm:-mt-20 relative z-10 flex flex-col sm:flex-row sm:items-end gap-4 sm:gap-6">
            {/* Brand Logo Circle */}
            <div className="w-24 h-24 sm:w-32 sm:h-32 rounded-2xl border-4 border-white bg-white shadow-md overflow-hidden flex items-center justify-center shrink-0">
              {hotel.logoImage ? (
                <img src={hotel.logoImage} alt={`${hotel.name} Logo`} className="w-full h-full object-cover" referrerPolicy="no-referrer" />
              ) : (
                <div className="w-full h-full bg-black text-white font-black text-3xl sm:text-4xl flex items-center justify-center uppercase">
                  {hotel.name.charAt(0)}
                </div>
              )}
            </div>

            {/* Title Block */}
            <div className="flex-1 pb-1 space-y-2">
              <h1 className="text-3xl sm:text-5xl font-black tracking-tight text-black leading-tight">
                {hotel.name}
              </h1>
              <div className="flex flex-wrap items-center gap-x-3 gap-y-1.5 text-xs font-semibold text-neutral-500">
                <span className="text-emerald-700 bg-emerald-50 px-2.5 py-0.5 rounded-full border border-emerald-100 flex items-center gap-1">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-600 animate-pulse" /> Official Portal
                </span>
                <span className="hidden sm:inline text-neutral-300">•</span>
                <span>{hotel.city}, {hotel.state}</span>
                <span className="hidden sm:inline text-neutral-300">•</span>
                <span>{hotel.phone}</span>
              </div>
            </div>
          </div>

          {/* Description & Contact Sidebar */}
          <div className="grid grid-cols-1 md:grid-cols-12 gap-6 items-start border-b border-neutral-100 pb-8 pt-2">
            <div className="md:col-span-8 space-y-4">
              {hotel.description ? (
                <p className="text-sm sm:text-base text-neutral-600 leading-relaxed whitespace-pre-line">
                  {hotel.description}
                </p>
              ) : (
                <p className="text-sm sm:text-base text-neutral-600 leading-relaxed">
                  Welcome to {hotel.name}, a distinguished luxury destination in {hotel.city}, {hotel.state}. We offer premium accommodations, modern guest amenities, and first-class hospitality services designed to make your stay exceptional. Review our selection of finely appointed rooms and suites below and secure your booking today.
                </p>
              )}
            </div>
            <div className="md:col-span-4 bg-neutral-50 border border-neutral-200/60 rounded-2xl p-4 space-y-3.5">
              <span className="text-[10px] font-black text-neutral-400 uppercase tracking-widest block">CONTACT & LOCATION</span>
              <div className="space-y-2.5 text-xs">
                <div className="flex items-start gap-2.5 text-neutral-700">
                  <Mail className="w-4 h-4 text-neutral-400 shrink-0 mt-0.5" />
                  <span className="font-medium break-all">{hotel.email}</span>
                </div>
                <div className="flex items-start gap-2.5 text-neutral-700">
                  <Phone className="w-4 h-4 text-neutral-400 shrink-0 mt-0.5" />
                  <span className="font-medium">{hotel.phone}</span>
                </div>
                <div className="flex items-start gap-2.5 text-neutral-700">
                  <Building2 className="w-4 h-4 text-neutral-400 shrink-0 mt-0.5" />
                  <span className="font-medium">{hotel.address}, {hotel.city}, {hotel.state}</span>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Section: Rooms & Booking Filters */}
        <div className="space-y-4 pt-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <h2 className="text-xl sm:text-2xl font-extrabold text-black tracking-tight">Rooms & Suites</h2>
              <p className="text-xs text-neutral-500">Filter availability by category or explore all layouts</p>
            </div>

            {/* Type filters */}
            <div className="flex items-center gap-1.5 overflow-x-auto scrollbar-none pb-2 sm:pb-0">
              {roomTypes.map((t) => (
                <button
                  key={t}
                  onClick={() => setSelectedType(t)}
                  className={`px-3 py-1 rounded-full text-xs font-semibold capitalize transition-all whitespace-nowrap cursor-pointer ${
                    selectedType === t
                      ? 'bg-black text-white'
                      : 'bg-neutral-100 text-neutral-600 hover:bg-neutral-200/80'
                  }`}
                >
                  {t === 'all' ? 'All' : t}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Room Cards Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
          {filteredRooms.map((room) => (
            <div
              key={room.id}
              className="bg-white border border-neutral-200 rounded-2xl overflow-hidden shadow-2xs hover:shadow-md transition-all flex flex-col justify-between group"
            >
              <div>
                {/* Room Image */}
                <div className="relative h-48 sm:h-52 w-full bg-neutral-100 overflow-hidden flex items-center justify-center">
                  {room.images && room.images.length > 0 && room.images[0] ? (
                    <img
                      src={room.images[0]}
                      alt={`Room ${room.number}`}
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                    />
                  ) : (
                    <div className="text-center p-4">
                      <p className="text-[10px] font-semibold text-neutral-400">No Image Available</p>
                    </div>
                  )}
                  <div className="absolute top-3 right-3 bg-white/95 text-neutral-900 text-xs font-bold px-2 py-0.5 rounded-md shadow-2xs">
                    Room {room.number}
                  </div>
                  <div className="absolute top-3 left-3 bg-black/80 text-white text-[10px] font-semibold px-2 py-0.5 rounded-full uppercase tracking-wider backdrop-blur-xs">
                    {room.type}
                  </div>
                </div>

                {/* Details */}
                <div className="p-4 space-y-2">
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <h3 className="font-bold text-base text-black">{room.type}</h3>
                      <p className="text-xs text-neutral-500 line-clamp-1">{room.typeName}</p>
                    </div>
                  </div>

                  <div className="pt-2">
                    <span className="text-lg font-extrabold text-black">
                      ₦{room.pricePerNight.toLocaleString()}
                    </span>
                    <span className="text-xs text-neutral-500"> per night</span>
                  </div>
                </div>
              </div>

              {/* Action Button */}
              <div className="p-4 pt-0">
                <button
                  onClick={() => {
                    onSelectRoom(room);
                    onNavigate('room_detail');
                  }}
                  className="w-full bg-black text-white py-2.5 px-4 rounded-xl text-xs font-bold hover:bg-neutral-800 transition-all flex items-center justify-center active:scale-95 shadow-2xs"
                >
                  <span>View details</span>
                </button>
              </div>
            </div>
          ))}
        </div>
      </main>

      {/* Footer */}
      <footer className="bg-neutral-50 border-t border-neutral-200 mt-12 py-8 px-4 sm:px-6 text-xs text-neutral-500">
        <div className="max-w-5xl mx-auto grid grid-cols-1 sm:grid-cols-3 gap-6 pb-6 border-b border-neutral-200">
          <div className="space-y-1.5">
            <div className="flex items-center gap-1.5">
              <Building2 className="w-4 h-4 text-black" />
              <span className="font-bold text-black text-xs">IGHO Stay</span>
            </div>
            <p className="text-[11px] text-neutral-500">Modern comfort and warm hospitality.</p>
          </div>

          <div className="space-y-1">
            <div className="font-semibold text-black text-xs">Contact</div>
            <p className="text-[11px] text-neutral-500">{hotel.email || 'info@hotel.com'}</p>
            <p className="text-[11px] text-neutral-500">{hotel.phone || '+234 800 000 0000'}</p>
          </div>

          <div className="space-y-1">
            <div className="font-semibold text-black text-xs">Hotel</div>
            <ul className="space-y-1 text-[11px]">
              <li>Rooms & Suites</li>
              <li>About us</li>
              <li>
                <button onClick={() => onNavigate('staff_login')} className="hover:text-black underline">
                  Staff portal
                </button>
              </li>
            </ul>
          </div>
        </div>

        <div className="max-w-5xl mx-auto pt-4 text-center text-[11px] text-neutral-400">
          © {new Date().getFullYear()} {hotel.name} — Powered by IGHO Stay
        </div>
      </footer>
    </div>
  );
};
